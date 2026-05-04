import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {
  EARLY_SIGN_IN_WINDOW_MINUTES,
  resolveAttendanceSettingsForSignIn,
  type AttendanceRewardRuleLike,
  type AttendanceSettingsLike,
  type StudentLike,
} from "./attendanceResolveCore";
import { getSchoolDayClock } from "./schoolDayClock";

function requireAuth(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
}

function requireString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid " + name + " is required."
    );
  }
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function isDeveloper(uid: string): Promise<boolean> {
  const snap = await admin.firestore().collection("appConfig").doc("global").get();
  const list = snap.exists ? (snap.data()?.developerUids as string[] | undefined) : undefined;
  return Array.isArray(list) && list.includes(uid);
}

async function hasKioskMembershipOrStaff(schoolId: string, uid: string): Promise<boolean> {
  const db = admin.firestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const memberSnap = await schoolRef.collection("kioskMembers").doc(uid).get();
  if (memberSnap.exists) return true;

  const roleChecks = [
    schoolRef.collection("roles_admin").doc(uid).get(),
    schoolRef.collection("roles_teacher").doc(uid).get(),
    schoolRef.collection("roles_secretary").doc(uid).get(),
    schoolRef.collection("roles_prizeClerk").doc(uid).get(),
  ];
  const roles = ["admin", "teacher", "secretary", "prizeClerk"];
  const snaps = await Promise.all(roleChecks);
  if (snaps.some((snap, index) => snap.exists && snap.data()?.role === roles[index])) return true;
  return isDeveloper(uid);
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function getCurrentPeriodAndOnTime(
  schedule: AttendanceSettingsLike["schedule"],
  onTimeWindowMinutes: number,
  nowMinutes: number
): { periodLabel?: string; onTime: boolean } {
  if (!schedule?.length) return { onTime: false };
  for (const slot of schedule) {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (nowMinutes >= start - EARLY_SIGN_IN_WINDOW_MINUTES && nowMinutes <= end) {
      const onTime = nowMinutes <= start + onTimeWindowMinutes;
      return { periodLabel: slot.label, onTime };
    }
  }
  return { onTime: false };
}

function getAssignedPeriodAndOnTime(
  schedule: AttendanceSettingsLike["schedule"],
  assignedSlotId: string | undefined,
  onTimeWindowMinutes: number,
  nowMinutes: number
): { periodLabel?: string; onTime: boolean } {
  if (!assignedSlotId) return { onTime: false };
  const slot = (schedule || []).find((s) => s.id === assignedSlotId);
  if (!slot) return { onTime: false };
  const start = parseTimeToMinutes(slot.startTime);
  const end = parseTimeToMinutes(slot.endTime);
  if (nowMinutes < start - EARLY_SIGN_IN_WINDOW_MINUTES || nowMinutes > end) return { onTime: false };
  const onTime = nowMinutes <= start + onTimeWindowMinutes;
  return { periodLabel: slot.label, onTime };
}

export type SignInAttendanceReason =
  | "recorded"
  | "duplicate_same_session"
  | "class_not_in_enabled_list"
  | "student_not_found"
  | "no_attendance_configuration"
  | "no_periods_for_school_legacy";

function applyRecordClassSignIn(
  db: admin.firestore.Firestore,
  schoolId: string,
  studentId: string,
  student: StudentLike,
  config: AttendanceSettingsLike,
  now: number
): Promise<{
  pointsAwarded: number;
  onTime: boolean;
  periodLabel?: string;
  reason: SignInAttendanceReason;
}> {
  if (config.enabledClassIds && config.enabledClassIds.length > 0) {
    const sid = student.classId || "";
    if (!config.enabledClassIds.includes(sid)) {
      return Promise.resolve({ pointsAwarded: 0, onTime: false, reason: "class_not_in_enabled_list" });
    }
  }

  const studentClassId = (student.classId || "").trim();
  const clock = getSchoolDayClock(now, config.attendanceTimeZone, { whenUnset: "utc" });
  const dayOfWeekKey = clock.dayOfWeekKey;
  const nowMinutes = clock.minutesSinceMidnight;

  let assignedSlotId: string | undefined = undefined;
  if (studentClassId) {
    const byDay = config.classPeriodAssignmentsByDay;
    const dayMap = byDay?.[dayOfWeekKey];
    if (dayMap && Object.prototype.hasOwnProperty.call(dayMap, studentClassId)) {
      const v = dayMap[studentClassId];
      assignedSlotId = v === "__none__" ? undefined : v;
    } else {
      const allMap = byDay?.["all"];
      if (allMap && Object.prototype.hasOwnProperty.call(allMap, studentClassId)) {
        const v = allMap[studentClassId];
        assignedSlotId = v === "__none__" ? undefined : v;
      } else {
        assignedSlotId = config.classPeriodAssignments?.[studentClassId];
      }
    }
  }

  const assigned = getAssignedPeriodAndOnTime(config.schedule, assignedSlotId, config.onTimeWindowMinutes, nowMinutes);
  const fallback = getCurrentPeriodAndOnTime(config.schedule, config.onTimeWindowMinutes, nowMinutes);
  const periodLabel = assigned.periodLabel ?? fallback.periodLabel;
  const onTime = assigned.periodLabel ? assigned.onTime : fallback.onTime;
  const pointsForSignIn = toFiniteNumber(config.pointsForSignIn, 0);
  const pointsForOnTime = toFiniteNumber(config.pointsForOnTime, 0);
  const computedPoints = pointsForSignIn + (onTime ? pointsForOnTime : 0);

  const yyyy = clock.year;
  const mm = String(clock.month).padStart(2, "0");
  const dd = String(clock.day).padStart(2, "0");
  const dayKey = String(yyyy) + mm + dd;
  const classKey = (student.classId || "").trim() || "no_class";
  const periodKey = (periodLabel || "").trim() || "no_period";
  const sessionId = dayKey + ":" + classKey + ":" + periodKey;

  const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
  const logDocId = studentId + "_" + sessionId;
  const logRef = db.collection("schools").doc(schoolId).collection("attendanceLog").doc(logDocId);

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(logRef);
    if (existing.exists) {
      return { pointsAwarded: 0, onTime: false, periodLabel, reason: "duplicate_same_session" };
    }

    const studentSnap = await tx.get(studentRef);
    if (!studentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Student not found");
    }
    const data = studentSnap.data() as { points?: number; lifetimePoints?: number };

    tx.update(studentRef, {
      points: (data.points || 0) + computedPoints,
      lifetimePoints: (data.lifetimePoints ?? 0) + computedPoints,
    });

    const activityRef = studentRef.collection("activities").doc();
    let desc = "Attendance";
    if (onTime && periodLabel) {
      desc = "Attendance (on time): " + periodLabel;
    } else if (periodLabel) {
      desc = "Attendance: " + periodLabel;
    }
    tx.set(activityRef, { desc, amount: computedPoints, date: now });

    const studentName =
      [student.firstName, student.lastName].filter(Boolean).join(" ") || student.nickname || studentId;
    tx.set(logRef, {
      studentId,
      studentName,
      signedInAt: now,
      pointsAwarded: computedPoints,
      onTime,
      periodLabel: periodLabel ?? null,
      sessionId,
      teacherId: config.teacherId ?? null,
    });

    return { pointsAwarded: computedPoints, onTime, periodLabel, reason: "recorded" as const };
  });
}

export const signInAttendance = functions.https.onCall(
  async (data: unknown, context: functions.https.CallableContext) => {
    requireAuth(context);
    const payload = data as { schoolId?: string; studentId?: string };
    requireString(payload.schoolId, "schoolId");
    requireString(payload.studentId, "studentId");
    // Firestore document IDs are case-sensitive; do NOT normalize casing here.
    // The client passes the canonical `schoolId` used for document paths.
    const schoolId = String(payload.schoolId).trim();
    const studentId = String(payload.studentId).trim();

    const db = admin.firestore();
    const now = Date.now();
    if (!(await hasKioskMembershipOrStaff(schoolId, context.auth!.uid))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }

    try {
      const studentSnap = await db.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
      if (!studentSnap.exists) {
        return {
          pointsAwarded: 0,
          onTime: false,
          periodLabel: null as string | null,
          reason: "student_not_found" as const,
          serverTimeMs: now,
        };
      }
      const sdata = studentSnap.data() || {};
      const student: StudentLike = {
        id: studentId,
        classId: typeof sdata.classId === "string" ? sdata.classId : sdata.classId ?? null,
        firstName: typeof sdata.firstName === "string" ? sdata.firstName : undefined,
        lastName: typeof sdata.lastName === "string" ? sdata.lastName : undefined,
        nickname: typeof sdata.nickname === "string" ? sdata.nickname : null,
      };

      const [classesSnap, periodsSnap, schoolCfgSnap] = await Promise.all([
        db.collection("schools").doc(schoolId).collection("classes").get(),
        db.collection("schools").doc(schoolId).collection("periods").get(),
        db.collection("schools").doc(schoolId).collection("attendance").doc("config").get(),
      ]);

      const classes = classesSnap.docs.map((d) => ({
        id: d.id,
        primaryTeacherId:
          typeof d.data().primaryTeacherId === "string" ? d.data().primaryTeacherId : d.data().primaryTeacherId ?? null,
      }));

      const periods = periodsSnap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          label: String(x.label ?? d.id),
          startTime: String(x.startTime ?? "08:00"),
          endTime: String(x.endTime ?? "08:45"),
        };
      });

      const studentClassId = (student.classId || "").trim();
      const classForStudent = studentClassId ? classes.find((c) => c.id === studentClassId) : undefined;
      const teacherId = (classForStudent?.primaryTeacherId || "").trim();

      let teacherRewards: AttendanceRewardRuleLike[] = [];
      let teacherConfigRaw: Record<string, unknown> | null = null;

      if (teacherId) {
        const [rewardsSnap, tCfgSnap] = await Promise.all([
          db.collection("schools").doc(schoolId).collection("teachers").doc(teacherId).collection("attendanceRewards").get(),
          db.collection("schools").doc(schoolId).collection("teachers").doc(teacherId).collection("attendanceConfig").doc("config").get(),
        ]);
        teacherRewards = rewardsSnap.docs.map((d) => {
          const r = d.data();
          return {
            id: d.id,
            enabled: !!r.enabled,
            classId: String(r.classId ?? ""),
            periodId: typeof r.periodId === "string" ? r.periodId : undefined,
            customPeriod:
              r.customPeriod && typeof r.customPeriod === "object"
                ? (r.customPeriod as { label: string; startTime: string; endTime: string })
                : undefined,
            pointsForSignIn: toFiniteNumber(r.pointsForSignIn, 0),
            pointsForOnTime: toFiniteNumber(r.pointsForOnTime, 0),
            onTimeWindowMinutes: toFiniteNumber(r.onTimeWindowMinutes, 15),
            categoryId: typeof r.categoryId === "string" ? r.categoryId : undefined,
          };
        });
        teacherConfigRaw = tCfgSnap.exists ? (tCfgSnap.data() as Record<string, unknown>) : null;
      }

      const schoolConfigRaw = schoolCfgSnap.exists ? (schoolCfgSnap.data() as Record<string, unknown>) : null;

      const resolved = resolveAttendanceSettingsForSignIn({
        nowMs: now,
        student,
        classes,
        periods,
        teacherRewards,
        teacherConfigRaw,
        schoolConfigRaw,
      });

      if (!resolved.ok) {
        return {
          pointsAwarded: 0,
          onTime: false,
          periodLabel: null as string | null,
          reason: resolved.reason,
          serverTimeMs: now,
        };
      }

      const result = await applyRecordClassSignIn(db, schoolId, studentId, student, resolved.settings, now);
      return {
        pointsAwarded: result.pointsAwarded,
        onTime: result.onTime,
        periodLabel: result.periodLabel ?? null,
        reason: result.reason,
        serverTimeMs: now,
        source: resolved.source,
      };
    } catch (err: unknown) {
      if (err instanceof functions.https.HttpsError) throw err;
      const msg = err instanceof Error ? err.message : "Unknown error";
      functions.logger.error("signInAttendance_failed", err);
      throw new functions.https.HttpsError("internal", msg);
    }
  }
);
