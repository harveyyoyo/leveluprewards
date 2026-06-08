import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { signInAttendance } from "./signInAttendance";
import { decryptField } from "./crypto";
import { isAllowedGoogleEmailOnAllowlist } from "./googleAllowlist";

import "./init";

const SUBCOLLECTIONS = ["students", "classes", "teachers", "staffAccounts", "categories", "prizes", "coupons"];
const RETENTION_DAYS = 30;

// ========================================================================
// Auth helpers
// ========================================================================

function requireAuth(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
}

async function requireSchoolAdmin(
  schoolId: string,
  context: functions.https.CallableContext
): Promise<void> {
  requireAuth(context);
  requireString(schoolId, "schoolId");

  const db = admin.firestore();
  const roleSnap = await db
    .collection("schools")
    .doc(schoolId)
    .collection("roles_admin")
    .doc(context.auth!.uid)
    .get();

  if (!roleSnap.exists || roleSnap.data()?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin privileges required for this school."
    );
  }
}

function requireString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `A valid ${name} is required.`
    );
  }
}

function trimmedString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}



function schoolAccessPasscodeFrom(data: Record<string, any>): string {
  return trimmedString(data.schoolAccessPasscode) || trimmedString(data.passcode) || "";
}


function developerGoogleEmailAllowlist(): string[] {
  const allowlistStr =
    process.env.DEVELOPER_GOOGLE_EMAIL_ALLOWLIST ||
    process.env.NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST ||
    "";
  return allowlistStr
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Allowed Google accounts may provision school admin without the admin passcode. */
function isAllowedGoogleAdminBypass(context: functions.https.CallableContext): boolean {
  const email = (context.auth?.token?.email ?? "").trim().toLowerCase();
  if (!email || !isGoogleAuthenticated(context)) return false;
  return isAllowedGoogleEmailOnAllowlist(email, developerGoogleEmailAllowlist());
}

// Demo schools should authenticate like any other school (no passcode bypass).

function isGoogleAuthenticated(context: functions.https.CallableContext): boolean {
  const token = context.auth?.token as any;
  const provider = String(token?.firebase?.sign_in_provider ?? "");
  if (provider === "google.com") return true;

  // When an anonymous Firebase user is linked to Google, `sign_in_provider` may remain "anonymous".
  // The ID token still includes Google identities when the account is linked.
  const identities = token?.firebase?.identities;
  return Boolean(identities && (identities["google.com"] || identities.google));
}



async function hasSchoolRole(
  schoolId: string,
  uid: string,
  roles: Array<"admin" | "teacher" | "secretary" | "prizeClerk" | "reports" | "librarian" | "office" | "houseCoordinator">
): Promise<boolean> {
  const db = admin.firestore();
  const roleCollections: Record<string, string> = {
    admin: "roles_admin",
    teacher: "roles_teacher",
    secretary: "roles_secretary",
    prizeClerk: "roles_prizeClerk",
    reports: "roles_reports",
    librarian: "roles_librarian",
    office: "roles_office",
    houseCoordinator: "roles_houseCoordinator",
  };
  const snaps = await Promise.all(
    roles.map((role) =>
      db.collection("schools").doc(schoolId).collection(roleCollections[role]).doc(uid).get()
    )
  );
  return snaps.some((snap, index) => snap.exists && snap.data()?.role === roles[index]);
}





function getRewardPeriodKeys(now: number): {
  month: string;
  semester: string;
  year: string;
  all_time: string;
} {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return {
    month: `${y}-${String(m).padStart(2, "0")}`,
    semester: m <= 6 ? `${y}-H1` : `${y}-H2`,
    year: String(y),
    all_time: "all",
  };
}

function applyCategoryPointsByPeriodData(
  current: unknown,
  categoryName: string,
  points: number,
  now: number
): Record<string, Record<string, number>> {
  const next = current && typeof current === "object" && !Array.isArray(current)
    ? JSON.parse(JSON.stringify(current)) as Record<string, Record<string, number>>
    : {};
  const keys = getRewardPeriodKeys(now);
  for (const key of [keys.month, keys.semester, keys.year, keys.all_time]) {
    if (!next[key] || typeof next[key] !== "object") next[key] = {};
    next[key][categoryName] = Number(next[key][categoryName] || 0) + points;
  }
  return next;
}

function evaluateBadgeAwardsData(params: {
  student: any;
  badges: any[];
  categories: any[];
  categoryPointsByPeriod: Record<string, Record<string, number>>;
  now: number;
}): Array<{ badgeId: string; periodKey: string; earnedAt: number; name: string }> {
  const earned = Array.isArray(params.student.earnedBadges) ? params.student.earnedBadges : [];
  const earnedSet = new Set(earned.map((e: any) => `${e?.badgeId}:${e?.periodKey}`));
  const keys = getRewardPeriodKeys(params.now);
  const out: Array<{ badgeId: string; periodKey: string; earnedAt: number; name: string }> = [];
  for (const badge of params.badges) {
    if (!badge || badge.enabled === false || typeof badge.id !== "string") continue;
    const cat = params.categories.find((c) => c?.id === badge.categoryId);
    const categoryName = typeof cat?.name === "string" ? cat.name : "";
    if (!categoryName) continue;
    const periodKey = badge.period === "month"
      ? keys.month
      : badge.period === "semester"
        ? keys.semester
        : badge.period === "year"
          ? keys.year
          : "all";
    const periodPoints = Number(params.categoryPointsByPeriod[periodKey]?.[categoryName] || 0);
    const required = Number(badge.pointsRequired || 0);
    if (periodPoints < required || earnedSet.has(`${badge.id}:${periodKey}`)) continue;
    earnedSet.add(`${badge.id}:${periodKey}`);
    out.push({ badgeId: badge.id, periodKey, earnedAt: params.now, name: String(badge.name || "Unknown") });
  }
  return out;
}

function evaluateAchievementAwardsData(params: {
  student: any;
  achievements: any[];
  categories: any[];
  points: number;
  lifetimePoints: number;
  categoryPoints: Record<string, number>;
  now: number;
}): Array<{ achievementId: string; earnedAt: number; bonusPoints: number; name: string; wheelSpin: boolean }> {
  const earned = Array.isArray(params.student.earnedAchievements) ? params.student.earnedAchievements : [];
  const earnedSet = new Set(earned.map((e: any) => e?.achievementId));
  const out: Array<{ achievementId: string; earnedAt: number; bonusPoints: number; name: string; wheelSpin: boolean }> = [];
  for (const ach of params.achievements) {
    if (!ach || typeof ach.id !== "string" || earnedSet.has(ach.id)) continue;
    const criteria = ach.criteria || {};
    if (criteria.type === "manual") continue;
    const threshold = Number(criteria.threshold || 0);
    let earnedNow = false;
    if (criteria.type === "points") {
      if (typeof criteria.categoryId === "string" && criteria.categoryId) {
        const cat = params.categories.find((c) => c?.id === criteria.categoryId);
        const categoryName = typeof cat?.name === "string" ? cat.name : "";
        earnedNow = !!categoryName && Number(params.categoryPoints[categoryName] || 0) >= threshold;
      } else {
        earnedNow = params.points >= threshold;
      }
    } else if (criteria.type === "lifetimePoints") {
      earnedNow = params.lifetimePoints >= threshold;
    } else if (criteria.type === "coupons") {
      const cat = params.categories.find((c) => c?.id === criteria.categoryId);
      const categoryName = typeof cat?.name === "string" ? cat.name : "";
      earnedNow = !!categoryName && Number(params.categoryPoints[categoryName] || 0) >= threshold;
    }
    if (!earnedNow) continue;
    earnedSet.add(ach.id);
    out.push({
      achievementId: ach.id,
      earnedAt: params.now,
      bonusPoints: Number(ach.bonusPoints || 0),
      name: String(ach.name || "Unknown"),
      wheelSpin: ach.enableWheelSpin === true,
    });
  }
  return out;
}

// ========================================================================
// Core backup engine
// ========================================================================

async function collectFullSchoolData(schoolId: string) {
  const db = admin.firestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();

  if (!schoolSnap.exists) {
    throw new functions.https.HttpsError("not-found", `School "${schoolId}" not found.`);
  }

  const schoolData: Record<string, any> = JSON.parse(JSON.stringify(schoolSnap.data()));
  delete schoolData.passcode;
  delete schoolData.schoolAccessPasscode;
  delete schoolData.adminPasscode;

  const counts: Record<string, number> = {};
  let totalDocs = 1;

  for (const sub of SUBCOLLECTIONS) {
    const snap = await schoolRef.collection(sub).get();
    const items: any[] = [];
    counts[sub] = snap.size;
    totalDocs += snap.size;

    for (const d of snap.docs) {
      const item: any = { id: d.id, ...d.data() };

      if (sub === "students") {
        const activitiesSnap = await d.ref.collection("activities").get();
        if (activitiesSnap.size > 0) {
          item._activities = activitiesSnap.docs.map((a) => ({ id: a.id, ...a.data() }));
          counts.activities = (counts.activities || 0) + activitiesSnap.size;
          totalDocs += activitiesSnap.size;
        }
      }

      items.push(item);
    }

    schoolData[`_${sub}`] = items;
  }

  return { data: schoolData, counts, totalDocs };
}




// ========================================================================
// Callable: Full-depth backup
// ========================================================================
// ========================================================================
// Callable: Backup all schools
// ========================================================================
// ========================================================================
// Callable: Full restore from backup
// ========================================================================
// ========================================================================
// Callable: Download backup data
// ========================================================================
// ========================================================================
// Callable: Verify backup integrity (SHA-256)
// ========================================================================
// ========================================================================
// Scheduled: Automatic daily full backup + retention pruning
// Requires: Firebase Blaze plan + Cloud Scheduler API enabled
// ========================================================================
// ========================================================================
// Callable: Verify school passcode (used by login and student logout)
// ========================================================================
// ========================================================================
// Callable: Verify school access passcode (NO role provisioning)
// Used for "school sign-in" gate before choosing student/staff/admin.
// ========================================================================
// ========================================================================
// Developer allow-list (appConfig/global.developerUids) for attendance etc.
// ========================================================================


async function isDeveloper(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth?.uid) return false;
  const db = admin.firestore();
  try {
    const doc = await db.collection("appConfig").doc("developerAllowlist").get();
    if (!doc.exists) return false;
    const data = doc.data();
    return Array.isArray(data?.uids) && data!.uids.includes(context.auth.uid);
  } catch (e) {
    return false;
  }
}


/** Callable: set attendance config (allowed for school admin or developer). */
exports.setAttendanceConfig = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      requireAuth(context);
      requireString(data.schoolId, "schoolId");
      const schoolId = String(data.schoolId).trim().toLowerCase();

      const db = admin.firestore();
      let allowed = false;
      try {
        await requireSchoolAdmin(schoolId, context);
        allowed = true;
      } catch {
        if (await isDeveloper(context)) allowed = true;
      }
      if (!allowed) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges for this school or developer access required."
        );
      }

      const config = data.config;
      if (!config || typeof config !== "object") {
        throw new functions.https.HttpsError("invalid-argument", "config object is required.");
      }

      // Sanitize schedule so Firestore never gets undefined (causes internal error)
      const schedule = Array.isArray(config.schedule)
        ? config.schedule.map((s: any) => ({
            id: String(s?.id ?? ""),
            label: String(s?.label ?? ""),
            startTime: String(s?.startTime ?? "08:00"),
            endTime: String(s?.endTime ?? "08:45"),
          }))
        : [];

      // Coerce strings → numbers so values that come through form inputs
      // without explicit `valueAsNumber` don't silently flatten to 0.
      const toFiniteNumber = (v: unknown, fallback: number): number => {
        const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
        return Number.isFinite(n) ? n : fallback;
      };
      const payload: Record<string, unknown> = {
        pointsForSignIn: toFiniteNumber(config.pointsForSignIn, 1),
        pointsForOnTime: toFiniteNumber(config.pointsForOnTime, 5),
        onTimeWindowMinutes: toFiniteNumber(config.onTimeWindowMinutes, 5),
        schedule,
      };
      if (config.classPeriodAssignments && typeof config.classPeriodAssignments === "object") {
        payload.classPeriodAssignments = config.classPeriodAssignments;
      }
      if (config.classPeriodAssignmentsByDay && typeof config.classPeriodAssignmentsByDay === "object") {
        payload.classPeriodAssignmentsByDay = config.classPeriodAssignmentsByDay;
      }
      if (Array.isArray(config.enabledClassIds) && config.enabledClassIds.length > 0) {
        payload.enabledClassIds = config.enabledClassIds;
      }
      if (typeof config.categoryId === "string" && config.categoryId.length > 0) {
        payload.categoryId = config.categoryId;
      }
      if (typeof config.attendanceTimeZone === "string" && String(config.attendanceTimeZone).trim().length > 0) {
        payload.attendanceTimeZone = String(config.attendanceTimeZone).trim();
      }

      const configRef = db.collection("schools").doc(schoolId).collection("attendance").doc("config");
      await configRef.set(payload);
      return { success: true };
    } catch (err: any) {
      if (err?.code && err.code.startsWith("functions/")) {
        throw err;
      }
      functions.logger.warn("setAttendanceConfig error", err);
      throw new functions.https.HttpsError(
        "internal",
        err?.message ?? "Failed to save attendance settings."
      );
    }
  }
);

// ========================================================================
// Kiosk / school-entry helpers (private school URLs)
// ========================================================================
const STUDENT_THEME_HEX = /^#[0-9a-fA-F]{6}$/;



const MS_PER_DAY = 24 * 60 * 60 * 1000;


/** Callable: kiosk-safe prize redemption with trusted balance + stock updates. */

const CLASSROOM_TEACHER_CATEGORY_PREFIX = "__cm__:";

function classroomTeacherCategoryKey(teacherId: string, label: string): string {
  const tid = String(teacherId || "").trim();
  const clean = String(label || "").trim();
  if (!tid || !clean) return clean;
  return `${CLASSROOM_TEACHER_CATEGORY_PREFIX}${tid}:${clean}`;
}

function isTeacherScopedCategoryKey(key: string): boolean {
  return key.startsWith(CLASSROOM_TEACHER_CATEGORY_PREFIX);
}

function displayCategoryKey(key: string): string {
  if (!isTeacherScopedCategoryKey(key)) return String(key || "").trim() || "Uncategorized";
  const rest = key.slice(CLASSROOM_TEACHER_CATEGORY_PREFIX.length);
  const colon = rest.indexOf(":");
  return colon >= 0 ? rest.slice(colon + 1).trim() || "Uncategorized" : rest.trim();
}

function prizeCategoryIds(prize: any): string[] {
  return Array.isArray(prize?.categoryIds)
    ? prize.categoryIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : [];
}

function studentCategoryBalance(categoryPoints: Record<string, number>, category: any): number {
  const cp = categoryPoints || {};
  const name = String(category?.name || "").trim();
  if (!name) return 0;
  const safe = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  };
  if (category?.teacherId) {
    return safe(cp[classroomTeacherCategoryKey(String(category.teacherId), name)]);
  }
  const plain = safe(cp[name]);
  if (plain > 0) return plain;
  let scopedTotal = 0;
  for (const [key, value] of Object.entries(cp)) {
    if (!isTeacherScopedCategoryKey(key)) continue;
    if (displayCategoryKey(key).toLowerCase() === name.toLowerCase()) scopedTotal += safe(value);
  }
  return scopedTotal;
}



// ========================================================================
// Callable: download coupon snapshot for kiosk offline validation
// ========================================================================


// ========================================================================
// Callable: Upload school logo (server-side to avoid client Storage hangs)
// ========================================================================

// ========================================================================
// Callable: Upload app-wide logo (for all schools)
// ========================================================================
// ========================================================================
// Callable: Set app logo URL (e.g. restore from history)
// ========================================================================
// ========================================================================
// Callable: Upload student profile photo (admin only)
// ========================================================================
// ========================================================================
// Callable: Verify teacher username and passcode
// ========================================================================
// ========================================================================
// Callable: Staff portal login options (safe public directory)
// ========================================================================
// ========================================================================
// Callable: Verify staff (secretary / prize clerk / reports) username + passcode
// ========================================================================
// ========================================================================
// Migration functions — consolidated into a single generic helper.
// The exported callable names are unchanged for backward compatibility.
// ========================================================================

async function migrateCollectionToSubcollection(
  schoolId: string,
  collectionName: string,
  flagField: string,
  context: functions.https.CallableContext
): Promise<{ success: boolean; message: string }> {
  await requireSchoolAdmin(schoolId, context);

  const db = admin.firestore();
  const schoolDocRef = db.collection("schools").doc(schoolId);

  try {
    const schoolSnap = await schoolDocRef.get();
    if (!schoolSnap.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const schoolData = schoolSnap.data()!;
    const capitalizedName = collectionName.charAt(0).toUpperCase() + collectionName.slice(1);

    if (schoolData[flagField]) {
      return { success: true, message: `${capitalizedName} have already been migrated.` };
    }

    const items = schoolData[collectionName] || [];
    if (items.length === 0) {
      await schoolDocRef.update({ [flagField]: true });
      return { success: true, message: `No ${collectionName} to migrate.` };
    }

    const BATCH_LIMIT = 499;
    for (let i = 0; i < items.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      const chunk = items.slice(i, i + BATCH_LIMIT);
      const subRef = schoolDocRef.collection(collectionName);

      chunk.forEach((item: any) => {
        batch.set(subRef.doc(item.id), item);
      });

      // On the last chunk, also update the flag and remove the inline array.
      if (i + BATCH_LIMIT >= items.length) {
        batch.update(schoolDocRef, {
          [flagField]: true,
          [collectionName]: FieldValue.delete(),
        });
      }

      await batch.commit();
    }

    return { success: true, message: `Migrated ${items.length} ${collectionName}.` };
  } catch (error) {
    console.error(`Migration of ${collectionName} failed:`, error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred during migration."
    );
  }
}

const MIGRATION_MAP: Record<string, { collection: string; flag: string }> = {
  migrateStudentsToSubcollection:    { collection: "students",    flag: "hasMigratedStudents" },
  migrateClassesToSubcollection:     { collection: "classes",     flag: "hasMigratedClasses" },
  migrateTeachersToSubcollection:    { collection: "teachers",    flag: "hasMigratedTeachers" },
  migratePrizesToSubcollection:      { collection: "prizes",      flag: "hasMigratedPrizes" },
  migrateCouponsToSubcollection:     { collection: "coupons",     flag: "hasMigratedCoupons" },
  migrateCategoriesToSubcollection:  { collection: "categories",  flag: "hasMigratedCategories" },
};

for (const [fnName, { collection: col, flag }] of Object.entries(MIGRATION_MAP)) {
  exports[fnName] = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    return migrateCollectionToSubcollection(data.schoolId, col, flag, context);
  });
}

// ========================================================================
// Face login (convenience-grade): enroll + match descriptors
// - Requires Firebase Auth (anonymous OK)
// - Stores only face descriptors (embeddings), not images
// ========================================================================

type FaceDescriptor = number[];
type FaceDescriptorRecord = { values: FaceDescriptor };

function cosineSimilarity(a: FaceDescriptor, b: FaceDescriptor): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!denom) return 0;
  return dot / denom;
}

function descriptorRecordsFrom(value: unknown): FaceDescriptorRecord[] {
  if (!Array.isArray(value)) return [];
  const records: FaceDescriptorRecord[] = [];
  for (const item of value) {
    const candidate =
      Array.isArray(item)
        ? item
        : item && typeof item === "object" && Array.isArray((item as any).values)
          ? (item as any).values
          : null;
    if (!candidate || candidate.length !== 128) continue;
    if (candidate.every((n: unknown) => typeof n === "number" && Number.isFinite(n))) {
      records.push({ values: candidate as FaceDescriptor });
    }
  }
  return records;
}

/** Min cosine similarity to treat a training scan as the same person as another student. */
const FACE_DUPLICATE_ENROLL_THRESHOLD = 0.9;


exports.signInAttendance = signInAttendance;

// ========================================================================
// Notifications & Alerts
// ========================================================================

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCelebrationEmailHtml(args: {
  title: string;
  subtitle: string;
  message: string;
  studentName: string;
  accent: string;
  icon: string;
  showArtwork: boolean;
}): string {
  const title = escapeHtml(args.title);
  const subtitle = escapeHtml(args.subtitle);
  const message = escapeHtml(args.message);
  const studentName = escapeHtml(args.studentName);
  const icon = escapeHtml(args.icon);
  const accent = escapeHtml(args.accent || "#2563eb");

  if (!args.showArtwork) {
    return `<div style="font-family:Arial,sans-serif;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 12px;color:${accent};">${title}</h2>
      <p style="margin:0 0 8px;">${message}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#64748b;">This is an automated alert from your school's reward system.</p>
    </div>`;
  }

  return `<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:22px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.14);">
      <div style="background:linear-gradient(135deg,${accent},#0f172a);padding:26px 24px;color:#ffffff;text-align:center;">
        <div style="display:inline-flex;width:72px;height:72px;border-radius:999px;background:rgba(255,255,255,0.18);border:2px solid rgba(255,255,255,0.45);align-items:center;justify-content:center;font-size:38px;line-height:72px;">${icon}</div>
        <p style="margin:18px 0 6px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;opacity:0.82;">${subtitle}</p>
        <h1 style="margin:0;font-size:30px;line-height:1.1;font-weight:900;">${title}</h1>
      </div>
      <div style="padding:24px;text-align:center;">
        <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:700;">${studentName}</p>
        <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">${message}</p>
        <div style="margin:22px auto 0;width:86%;height:10px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#facc15,#34d399);"></div>
        <p style="margin:18px 0 0;font-size:12px;color:#64748b;">This is an automated celebration from your school's reward system.</p>
      </div>
    </div>
  </div>`;
}

function queueContactAlerts(args: {
  alerts: Promise<any>[];
  db: admin.firestore.Firestore;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  html?: string;
  fromEmail: string;
  schoolId: string;
  studentId?: string;
  whatsappEnabled?: boolean;
}): void {
  const { alerts, db, email, phone, subject, message, html, fromEmail, schoolId, studentId, whatsappEnabled } = args;
  if (email) {
    alerts.push(db.collection("mail").add({
      to: email,
      from: fromEmail,
      message: {
        subject,
        text: message,
        ...(html ? { html } : {}),
      },
      schoolId,
      ...(studentId ? { studentId } : {}),
    }));
  }
  if (phone) {
    alerts.push(db.collection("sms").add({
      to: phone,
      body: message,
      schoolId,
      ...(studentId ? { studentId } : {}),
    }));
    if (whatsappEnabled) {
      alerts.push(db.collection("whatsapp").add({
        to: phone,
        body: message,
        schoolId,
        ...(studentId ? { studentId } : {}),
      }));
    }
  }
}



/** Triggered when a student signs in via the attendance kiosk. */
export const onAttendanceLogCreated = functions.firestore
  .document("schools/{schoolId}/attendanceLog/{logId}")
  .onCreate(async (snapshot, context) => {
    const { schoolId } = context.params;
    const logData = snapshot.data();
    if (!logData) return;

    const db = admin.firestore();
    
    // Check school settings
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const settings = schoolSnap.data()?.appSettings;
    
    if (!settings?.enableNotifications || !settings?.notificationAttendanceEnabled) {
      return;
    }

    const studentId = logData.studentId;
    const studentSnap = await db.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
    const studentData = studentSnap.data();
    if (!studentData) return;

    const prefs =
      studentData.notificationPrefs && typeof studentData.notificationPrefs === "object"
        ? (studentData.notificationPrefs as Record<string, unknown>)
        : {};
    const parentNotifEnabled = prefs.parentEnabled !== false;
    const studentNotifEnabled = prefs.studentEnabled !== false;

    const studentName = logData.studentName || "A student";
    const status = logData.onTime ? "on time" : "signed in";
    const period = logData.periodLabel ? ` for ${logData.periodLabel}` : "";
    const message = `${studentName} ${status}${period} at ${new Date(logData.signedInAt).toLocaleTimeString()}.`;

    const alerts: Promise<any>[] = [];

    const pEmail = decryptField(studentData.parentEmail);
    const pPhone = decryptField(studentData.parentPhone);
    const sEmail = decryptField(studentData.studentEmail);
    const sPhone = decryptField(studentData.studentPhone);

    const schoolName = schoolSnap.data()?.name || "School";
    const fromEmail = `"${schoolName} Alerts" <alerts@levelup-edu.com>`;
    const html = buildCelebrationEmailHtml({
      title: "Attendance Alert",
      subtitle: "Class sign-in",
      message,
      studentName,
      accent: "#10b981",
      icon: "OK",
      showArtwork: false,
    });

    if (parentNotifEnabled) {
      queueContactAlerts({
        alerts, db, email: pEmail, phone: pPhone, subject: `Attendance Alert: ${studentName}`,
        message, html, fromEmail, schoolId, studentId, whatsappEnabled: settings.notificationWhatsAppEnabled,
      });
    }
    if (settings.notificationStudentsEnabled && studentNotifEnabled) {
      queueContactAlerts({
        alerts, db, email: sEmail, phone: sPhone, subject: "Attendance Alert",
        message, html, fromEmail, schoolId, studentId, whatsappEnabled: settings.notificationWhatsAppEnabled,
      });
    }

    await Promise.all(alerts);
  });
// Note: onStudentActivityCreated and onAttendanceLogCreated are exported via
// `export const` above (ES module syntax). No duplicate CommonJS assignment needed.
