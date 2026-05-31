import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const APP_CONFIG_GLOBAL = "global";
const MS_DAY = 86_400_000;

const COUNT_COLLECTIONS = [
  "students",
  "classes",
  "teachers",
  "staffAccounts",
  "categories",
  "prizes",
  "coupons",
  "library",
  "attendanceLog",
  "badges",
  "achievements",
  "houses",
  "homework",
  "periods",
  "backups",
] as const;

const OFFICE_COLLECTIONS = [
  "officeStudents",
  "officeClasses",
  "officeTeachers",
  "officeBillingAccounts",
  "officeInvoices",
  "officeGradeEntries",
] as const;

async function isDeveloper(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth?.uid) return false;
  const db = admin.firestore();
  const snap = await db.collection("appConfig").doc(APP_CONFIG_GLOBAL).get();
  const list = snap.exists ? (snap.data()?.developerUids as string[] | undefined) : undefined;
  return Array.isArray(list) && list.includes(context.auth.uid);
}

function requireAuth(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in as a developer first.");
  }
}

async function requireDeveloper(context: functions.https.CallableContext): Promise<void> {
  requireAuth(context);
  if (!(await isDeveloper(context))) {
    throw new functions.https.HttpsError("permission-denied", "Developer access is required.");
  }
}

async function countCollection(ref: admin.firestore.CollectionReference): Promise<number> {
  const snap = await ref.count().get();
  return snap.data().count;
}

function toMillis(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (value && typeof value === "object") {
    const anyVal = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof anyVal.toMillis === "function") return Number(anyVal.toMillis());
    if (typeof anyVal.seconds === "number") {
      const nanos = typeof anyVal.nanoseconds === "number" ? anyVal.nanoseconds : 0;
      return Math.floor(anyVal.seconds * 1000 + nanos / 1_000_000);
    }
  }
  return null;
}

function classifyActivity(desc: string, amount: number): string {
  const d = desc.trim();
  if (amount < 0) return "redemption";
  if (d.startsWith("Achievement earned:")) return "achievement";
  if (d.startsWith("Badge earned:")) return "badge";
  if (/^Attendance/i.test(d)) return "attendance";
  if (/coupon/i.test(d)) return "coupon";
  if (/library item/i.test(d) || /^Checked out|^Returned/i.test(d)) return "library";
  return "points";
}

function sanitizeAppSettings(raw: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!raw) return {};
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (/passcode|password|secret/i.test(key)) continue;
    out[key] = val;
  }
  return out;
}

function pillarFlags(app: Record<string, unknown> | undefined) {
  return {
    payClassroom: app?.payClassroom !== false,
    payAttendance: app?.payAttendance !== false,
    payLibrary: app?.payLibrary !== false,
    payHomework: app?.payHomework !== false,
    payOffice: app?.payOffice === true,
  };
}

async function collectCounts(
  schoolRef: admin.firestore.DocumentReference,
  includeOffice: boolean
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const tasks: Array<Promise<void>> = [];

  for (const name of COUNT_COLLECTIONS) {
    tasks.push(
      countCollection(schoolRef.collection(name)).then((n) => {
        counts[name] = n;
      })
    );
  }
  if (includeOffice) {
    for (const name of OFFICE_COLLECTIONS) {
      tasks.push(
        countCollection(schoolRef.collection(name)).then((n) => {
          counts[name] = n;
        })
      );
    }
  }
  await Promise.all(tasks);
  return counts;
}

async function collectCouponStats(schoolRef: admin.firestore.DocumentReference, since30d: number) {
  const snap = await schoolRef.collection("coupons").get();
  let used = 0;
  let usedLast30d = 0;
  let pointsFromCoupons = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.used) continue;
    used += 1;
    const val = typeof data.value === "number" ? data.value : 0;
    pointsFromCoupons += val;
    const usedAt = toMillis(data.usedAt) ?? toMillis(data.createdAt);
    if (usedAt != null && usedAt >= since30d) usedLast30d += 1;
  }
  return { total: snap.size, used, usedLast30d, pointsFromCoupons };
}

async function collectLibraryStats(schoolRef: admin.firestore.DocumentReference) {
  const snap = await schoolRef.collection("library").get();
  let checkedOut = 0;
  for (const doc of snap.docs) {
    if (doc.data().status === "checked_out") checkedOut += 1;
  }
  return { total: snap.size, checkedOut, available: snap.size - checkedOut };
}

async function collectStaffByRole(schoolRef: admin.firestore.DocumentReference) {
  const snap = await schoolRef.collection("staffAccounts").get();
  const byRole: Record<string, number> = {};
  for (const doc of snap.docs) {
    const role = String(doc.data().role || "unknown");
    byRole[role] = (byRole[role] || 0) + 1;
  }
  return byRole;
}

async function collectAttendanceStats(schoolRef: admin.firestore.DocumentReference, since7d: number, since30d: number) {
  const snap = await schoolRef.collection("attendanceLog").get();
  let last7d = 0;
  let last30d = 0;
  let lastSignInAt: number | null = null;
  for (const doc of snap.docs) {
    const at = toMillis(doc.data().signedInAt);
    if (at == null) continue;
    if (lastSignInAt == null || at > lastSignInAt) lastSignInAt = at;
    if (at >= since30d) last30d += 1;
    if (at >= since7d) last7d += 1;
  }
  return { total: snap.size, last7d, last30d, lastSignInAt };
}

async function collectStudentEngagement(schoolRef: admin.firestore.DocumentReference, since30d: number) {
  const snap = await schoolRef.collection("students").get();
  let totalLifetimePoints = 0;
  let activeStudents30d = 0;
  let studentsWithPoints = 0;
  const studentsForSampling: Array<{ id: string; name: string; updatedAt: number }> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const lifetime = typeof data.lifetimePoints === "number" ? data.lifetimePoints : 0;
    const points = typeof data.points === "number" ? data.points : 0;
    totalLifetimePoints += lifetime;
    if (points > 0) studentsWithPoints += 1;
    const updatedAt = toMillis(data.updatedAt) ?? 0;
    if (updatedAt >= since30d) activeStudents30d += 1;
    const name =
      [data.firstName, data.lastName].filter(Boolean).join(" ") ||
      String(data.nickname || doc.id);
    studentsForSampling.push({ id: doc.id, name, updatedAt });
  }

  studentsForSampling.sort((a, b) => b.updatedAt - a.updatedAt);
  return {
    studentCount: snap.size,
    totalLifetimePoints,
    activeStudents30d,
    studentsWithPoints,
    sampleStudents: studentsForSampling.slice(0, 40),
  };
}

async function collectActivityInsights(
  schoolRef: admin.firestore.DocumentReference,
  sampleStudents: Array<{ id: string; name: string }>,
  since30d: number
) {
  const byCategory: Record<string, { count: number; points: number }> = {};
  const recent: Array<{
    studentId: string;
    studentName: string;
    desc: string;
    amount: number;
    date: number;
    kind: string;
  }> = [];
  let earnedLast30d = 0;
  let redeemedLast30d = 0;
  let totalSampled = 0;

  for (const student of sampleStudents) {
    const actSnap = await schoolRef
      .collection("students")
      .doc(student.id)
      .collection("activities")
      .orderBy("date", "desc")
      .limit(80)
      .get();

    for (const actDoc of actSnap.docs) {
      const data = actDoc.data();
      const date = toMillis(data.date);
      if (date == null) continue;
      totalSampled += 1;
      const desc = String(data.desc || "Activity");
      const amount = typeof data.amount === "number" ? data.amount : 0;
      const kind = classifyActivity(desc, amount);
      if (!byCategory[kind]) byCategory[kind] = { count: 0, points: 0 };
      byCategory[kind].count += 1;
      byCategory[kind].points += amount;
      if (date >= since30d) {
        if (amount < 0) redeemedLast30d += 1;
        else earnedLast30d += 1;
      }
      recent.push({
        studentId: student.id,
        studentName: student.name,
        desc,
        amount,
        date,
        kind,
      });
    }
  }

  recent.sort((a, b) => b.date - a.date);

  return {
    sampledStudents: sampleStudents.length,
    totalSampled,
    earnedLast30d,
    redeemedLast30d,
    byCategory: Object.entries(byCategory)
      .map(([label, v]) => ({ label, count: v.count, points: v.points }))
      .sort((a, b) => b.count - a.count),
    recentActivities: recent.slice(0, 30),
  };
}

async function latestBackup(schoolRef: admin.firestore.DocumentReference) {
  const snap = await schoolRef.collection("backups").orderBy("createdAt", "desc").limit(1).get();
  if (snap.empty) return { lastBackupAt: null as number | null, lastBackupType: null as string | null };
  const data = snap.docs[0].data();
  return {
    lastBackupAt: toMillis(data.createdAt),
    lastBackupType: typeof data.type === "string" ? data.type : null,
  };
}

function engagementScore(input: {
  studentCount: number;
  activeStudents30d: number;
  attendance30d: number;
  couponsUsed30d: number;
  lastBackupAt: number | null;
  now: number;
}): number {
  let score = 0;
  if (input.studentCount > 0) score += 10;
  if (input.studentCount > 0) {
    score += Math.round(25 * Math.min(1, input.activeStudents30d / input.studentCount));
  }
  if (input.attendance30d > 0) score += Math.min(25, Math.round(Math.log10(input.attendance30d + 1) * 12));
  if (input.couponsUsed30d > 0) score += Math.min(20, input.couponsUsed30d * 2);
  if (input.lastBackupAt != null && input.now - input.lastBackupAt < 30 * MS_DAY) score += 15;
  return Math.min(100, score);
}

/** Build fleet usage summaries for all schools (developer health + email). */
export async function buildDeveloperFleetSummaries(now = Date.now()): Promise<Record<string, unknown>[]> {
  const db = admin.firestore();
  const schoolsSnap = await db.collection("schools").get();
  const fleet: Record<string, unknown>[] = [];
  const batchSize = 4;
  const docs = schoolsSnap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const rows = await Promise.all(
      chunk.map((doc) => buildSchoolSummary(doc.id, doc.data(), now))
    );
    fleet.push(...rows);
  }
  fleet.sort((a, b) => String(a.schoolId).localeCompare(String(b.schoolId)));
  return fleet;
}

async function buildSchoolSummary(
  schoolId: string,
  schoolData: admin.firestore.DocumentData,
  now: number
): Promise<Record<string, unknown>> {
  const db = admin.firestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const since30d = now - 30 * MS_DAY;
  const since7d = now - 7 * MS_DAY;
  const app = (schoolData.appSettings ?? {}) as Record<string, unknown>;
  const pillars = pillarFlags(app);
  const counts = await collectCounts(schoolRef, pillars.payOffice);
  const [coupons, library, attendance, students, backup] = await Promise.all([
    collectCouponStats(schoolRef, since30d),
    collectLibraryStats(schoolRef),
    collectAttendanceStats(schoolRef, since7d, since30d),
    collectStudentEngagement(schoolRef, since30d),
    latestBackup(schoolRef),
  ]);

  const engagement = engagementScore({
    studentCount: students.studentCount,
    activeStudents30d: students.activeStudents30d,
    attendance30d: attendance.last30d,
    couponsUsed30d: coupons.usedLast30d,
    lastBackupAt: backup.lastBackupAt,
    now,
  });

  return {
    schoolId,
    name: String(schoolData.name || schoolId),
    updatedAt: toMillis(schoolData.updatedAt),
    pillars,
    counts,
    coupons,
    library,
    attendance,
    students: {
      count: students.studentCount,
      totalLifetimePoints: students.totalLifetimePoints,
      activeStudents30d: students.activeStudents30d,
      studentsWithPoints: students.studentsWithPoints,
    },
    backup,
    engagementScore: engagement,
  };
}

async function buildSchoolDetail(schoolId: string): Promise<Record<string, unknown>> {
  const db = admin.firestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    throw new functions.https.HttpsError("not-found", `School "${schoolId}" not found.`);
  }
  const schoolData = schoolSnap.data()!;
  const now = Date.now();
  const since30d = now - 30 * MS_DAY;
  const summary = await buildSchoolSummary(schoolId, schoolData, now);
  const students = await collectStudentEngagement(schoolRef, since30d);
  const [staffByRole, activities] = await Promise.all([
    collectStaffByRole(schoolRef),
    collectActivityInsights(schoolRef, students.sampleStudents, since30d),
  ]);

  const app = (schoolData.appSettings ?? {}) as Record<string, unknown>;
  const enabledFeatures: string[] = [];
  if (app.enableNotifications === true) enabledFeatures.push("notifications");
  if (app.enableHouses === true) enabledFeatures.push("houses");
  if (app.enableAchievements === true) enabledFeatures.push("achievements");
  if (app.enableBadges === true) enabledFeatures.push("badges");
  if (app.enableRaffle === true) enabledFeatures.push("raffle");
  if (app.kioskMode === true) enabledFeatures.push("kiosk");
  if (app.faceLoginEnabled === true) enabledFeatures.push("face_login");

  let faceEnrollments = 0;
  try {
    const faceSnap = await db.collection("faceAuth").where("schoolId", "==", schoolId).count().get();
    faceEnrollments = faceSnap.data().count;
  } catch {
    const faceSnap = await db.collection("faceAuth").where("schoolId", "==", schoolId).get();
    faceEnrollments = faceSnap.size;
  }

  const supportSnap = await schoolRef.collection("supportSessions").orderBy("startedAt", "desc").limit(5).get();
  const recentSupportSessions = supportSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      startedAt: toMillis(data.startedAt),
      developerUid: typeof data.developerUid === "string" ? data.developerUid : null,
    };
  });

  return {
    ...summary,
    appSettings: sanitizeAppSettings(app),
    staffByRole,
    teachersCount: (summary.counts as Record<string, number>)?.teachers ?? 0,
    activities,
    enabledFeatures,
    faceEnrollments,
    recentSupportSessions,
    generatedAt: now,
  };
}

/** Callable: fleet summaries or deep per-school usage insights (developer only). */
export const getDeveloperSchoolUsageInsights = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onCall(async (data: { schoolId?: string } | null, context) => {
    await requireDeveloper(context);
    const now = Date.now();
    const schoolIdRaw = data?.schoolId;
    const schoolId =
      typeof schoolIdRaw === "string" && schoolIdRaw.trim()
        ? schoolIdRaw.trim().toLowerCase()
        : null;

    if (schoolId) {
      const detail = await buildSchoolDetail(schoolId);
      return { mode: "detail" as const, detail, generatedAt: now };
    }

    const fleet = await buildDeveloperFleetSummaries(now);
    return { mode: "fleet" as const, fleet, schoolCount: fleet.length, generatedAt: now };
  });
