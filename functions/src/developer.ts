import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getDeveloperSchoolUsageInsights } from "./developerSchoolInsights";
import {
  getDeveloperHealthAlertSettings,
  updateDeveloperHealthAlertSettings,
  sendDeveloperHealthAlertEmailNow,
  scheduledDeveloperHealthAlertEmail,
} from "./developerSchoolHealthEmail";
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


exports.getDeveloperSchoolUsageInsights = getDeveloperSchoolUsageInsights;
exports.getDeveloperHealthAlertSettings = getDeveloperHealthAlertSettings;
exports.updateDeveloperHealthAlertSettings = updateDeveloperHealthAlertSettings;
exports.sendDeveloperHealthAlertEmailNow = sendDeveloperHealthAlertEmailNow;
exports.scheduledDeveloperHealthAlertEmail = scheduledDeveloperHealthAlertEmail;
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



// Note: onStudentActivityCreated and onAttendanceLogCreated are exported via
// `export const` above (ES module syntax). No duplicate CommonJS assignment needed.
