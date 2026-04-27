"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signInAttendance = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const attendanceResolveCore_1 = require("./attendanceResolveCore");
const schoolDayClock_1 = require("./schoolDayClock");
function requireAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
}
function requireString(value, name) {
    if (typeof value !== "string" || value.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "A valid " + name + " is required.");
    }
}
function toFiniteNumber(value, fallback) {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(n) ? n : fallback;
}
function parseTimeToMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return (h !== null && h !== void 0 ? h : 0) * 60 + (m !== null && m !== void 0 ? m : 0);
}
function getCurrentPeriodAndOnTime(schedule, onTimeWindowMinutes, nowMinutes) {
    if (!(schedule === null || schedule === void 0 ? void 0 : schedule.length))
        return { onTime: false };
    for (const slot of schedule) {
        const start = parseTimeToMinutes(slot.startTime);
        const end = parseTimeToMinutes(slot.endTime);
        if (nowMinutes >= start - attendanceResolveCore_1.EARLY_SIGN_IN_WINDOW_MINUTES && nowMinutes <= end) {
            const onTime = nowMinutes <= start + onTimeWindowMinutes;
            return { periodLabel: slot.label, onTime };
        }
    }
    return { onTime: false };
}
function getAssignedPeriodAndOnTime(schedule, assignedSlotId, onTimeWindowMinutes, nowMinutes) {
    if (!assignedSlotId)
        return { onTime: false };
    const slot = (schedule || []).find((s) => s.id === assignedSlotId);
    if (!slot)
        return { onTime: false };
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (nowMinutes < start - attendanceResolveCore_1.EARLY_SIGN_IN_WINDOW_MINUTES || nowMinutes > end)
        return { onTime: false };
    const onTime = nowMinutes <= start + onTimeWindowMinutes;
    return { periodLabel: slot.label, onTime };
}
function applyRecordClassSignIn(db, schoolId, studentId, student, config, now) {
    var _a, _b;
    if (config.enabledClassIds && config.enabledClassIds.length > 0) {
        const sid = student.classId || "";
        if (!config.enabledClassIds.includes(sid)) {
            return Promise.resolve({ pointsAwarded: 0, onTime: false, reason: "class_not_in_enabled_list" });
        }
    }
    const studentClassId = (student.classId || "").trim();
    const clock = (0, schoolDayClock_1.getSchoolDayClock)(now, config.attendanceTimeZone, { whenUnset: "utc" });
    const dayOfWeekKey = clock.dayOfWeekKey;
    const nowMinutes = clock.minutesSinceMidnight;
    let assignedSlotId = undefined;
    if (studentClassId) {
        const byDay = config.classPeriodAssignmentsByDay;
        const dayMap = byDay === null || byDay === void 0 ? void 0 : byDay[dayOfWeekKey];
        if (dayMap && Object.prototype.hasOwnProperty.call(dayMap, studentClassId)) {
            const v = dayMap[studentClassId];
            assignedSlotId = v === "__none__" ? undefined : v;
        }
        else {
            const allMap = byDay === null || byDay === void 0 ? void 0 : byDay["all"];
            if (allMap && Object.prototype.hasOwnProperty.call(allMap, studentClassId)) {
                const v = allMap[studentClassId];
                assignedSlotId = v === "__none__" ? undefined : v;
            }
            else {
                assignedSlotId = (_a = config.classPeriodAssignments) === null || _a === void 0 ? void 0 : _a[studentClassId];
            }
        }
    }
    const assigned = getAssignedPeriodAndOnTime(config.schedule, assignedSlotId, config.onTimeWindowMinutes, nowMinutes);
    const fallback = getCurrentPeriodAndOnTime(config.schedule, config.onTimeWindowMinutes, nowMinutes);
    const periodLabel = (_b = assigned.periodLabel) !== null && _b !== void 0 ? _b : fallback.periodLabel;
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
        var _a, _b;
        const existing = await tx.get(logRef);
        if (existing.exists) {
            return { pointsAwarded: 0, onTime: false, periodLabel, reason: "duplicate_same_session" };
        }
        const studentSnap = await tx.get(studentRef);
        if (!studentSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Student not found");
        }
        const data = studentSnap.data();
        tx.update(studentRef, {
            points: (data.points || 0) + computedPoints,
            lifetimePoints: ((_a = data.lifetimePoints) !== null && _a !== void 0 ? _a : 0) + computedPoints,
        });
        const activityRef = studentRef.collection("activities").doc();
        let desc = "Attendance";
        if (onTime && periodLabel) {
            desc = "Attendance (on time): " + periodLabel;
        }
        else if (periodLabel) {
            desc = "Attendance: " + periodLabel;
        }
        tx.set(activityRef, { desc, amount: computedPoints, date: now });
        const studentName = [student.firstName, student.lastName].filter(Boolean).join(" ") || student.nickname || studentId;
        tx.set(logRef, {
            studentId,
            studentName,
            signedInAt: now,
            pointsAwarded: computedPoints,
            onTime,
            periodLabel: periodLabel !== null && periodLabel !== void 0 ? periodLabel : null,
            sessionId,
            teacherId: (_b = config.teacherId) !== null && _b !== void 0 ? _b : null,
        });
        return { pointsAwarded: computedPoints, onTime, periodLabel, reason: "recorded" };
    });
}
exports.signInAttendance = functions.https.onCall(async (data, context) => {
    var _a, _b;
    requireAuth(context);
    const payload = data;
    requireString(payload.schoolId, "schoolId");
    requireString(payload.studentId, "studentId");
    // Firestore document IDs are case-sensitive; do NOT normalize casing here.
    // The client passes the canonical `schoolId` used for document paths.
    const schoolId = String(payload.schoolId).trim();
    const studentId = String(payload.studentId).trim();
    const db = admin.firestore();
    const now = Date.now();
    try {
        const studentSnap = await db.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
        if (!studentSnap.exists) {
            return {
                pointsAwarded: 0,
                onTime: false,
                periodLabel: null,
                reason: "student_not_found",
                serverTimeMs: now,
            };
        }
        const sdata = studentSnap.data() || {};
        const student = {
            id: studentId,
            classId: typeof sdata.classId === "string" ? sdata.classId : (_a = sdata.classId) !== null && _a !== void 0 ? _a : null,
            firstName: typeof sdata.firstName === "string" ? sdata.firstName : undefined,
            lastName: typeof sdata.lastName === "string" ? sdata.lastName : undefined,
            nickname: typeof sdata.nickname === "string" ? sdata.nickname : null,
        };
        const [classesSnap, periodsSnap, schoolCfgSnap] = await Promise.all([
            db.collection("schools").doc(schoolId).collection("classes").get(),
            db.collection("schools").doc(schoolId).collection("periods").get(),
            db.collection("schools").doc(schoolId).collection("attendance").doc("config").get(),
        ]);
        const classes = classesSnap.docs.map((d) => {
            var _a;
            return ({
                id: d.id,
                primaryTeacherId: typeof d.data().primaryTeacherId === "string" ? d.data().primaryTeacherId : (_a = d.data().primaryTeacherId) !== null && _a !== void 0 ? _a : null,
            });
        });
        const periods = periodsSnap.docs.map((d) => {
            var _a, _b, _c;
            const x = d.data();
            return {
                id: d.id,
                label: String((_a = x.label) !== null && _a !== void 0 ? _a : d.id),
                startTime: String((_b = x.startTime) !== null && _b !== void 0 ? _b : "08:00"),
                endTime: String((_c = x.endTime) !== null && _c !== void 0 ? _c : "08:45"),
            };
        });
        const studentClassId = (student.classId || "").trim();
        const classForStudent = studentClassId ? classes.find((c) => c.id === studentClassId) : undefined;
        const teacherId = ((classForStudent === null || classForStudent === void 0 ? void 0 : classForStudent.primaryTeacherId) || "").trim();
        let teacherRewards = [];
        let teacherConfigRaw = null;
        if (teacherId) {
            const [rewardsSnap, tCfgSnap] = await Promise.all([
                db.collection("schools").doc(schoolId).collection("teachers").doc(teacherId).collection("attendanceRewards").get(),
                db.collection("schools").doc(schoolId).collection("teachers").doc(teacherId).collection("attendanceConfig").doc("config").get(),
            ]);
            teacherRewards = rewardsSnap.docs.map((d) => {
                var _a;
                const r = d.data();
                return {
                    id: d.id,
                    enabled: !!r.enabled,
                    classId: String((_a = r.classId) !== null && _a !== void 0 ? _a : ""),
                    periodId: typeof r.periodId === "string" ? r.periodId : undefined,
                    customPeriod: r.customPeriod && typeof r.customPeriod === "object"
                        ? r.customPeriod
                        : undefined,
                    pointsForSignIn: toFiniteNumber(r.pointsForSignIn, 0),
                    pointsForOnTime: toFiniteNumber(r.pointsForOnTime, 0),
                    onTimeWindowMinutes: toFiniteNumber(r.onTimeWindowMinutes, 15),
                    categoryId: typeof r.categoryId === "string" ? r.categoryId : undefined,
                };
            });
            teacherConfigRaw = tCfgSnap.exists ? tCfgSnap.data() : null;
        }
        const schoolConfigRaw = schoolCfgSnap.exists ? schoolCfgSnap.data() : null;
        const resolved = (0, attendanceResolveCore_1.resolveAttendanceSettingsForSignIn)({
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
                periodLabel: null,
                reason: resolved.reason,
                serverTimeMs: now,
            };
        }
        const result = await applyRecordClassSignIn(db, schoolId, studentId, student, resolved.settings, now);
        return {
            pointsAwarded: result.pointsAwarded,
            onTime: result.onTime,
            periodLabel: (_b = result.periodLabel) !== null && _b !== void 0 ? _b : null,
            reason: result.reason,
            serverTimeMs: now,
            source: resolved.source,
        };
    }
    catch (err) {
        if (err instanceof functions.https.HttpsError)
            throw err;
        const msg = err instanceof Error ? err.message : "Unknown error";
        functions.logger.error("signInAttendance_failed", err);
        throw new functions.https.HttpsError("internal", msg);
    }
});
//# sourceMappingURL=signInAttendance.js.map