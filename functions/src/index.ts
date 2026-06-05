import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { signInAttendance } from "./signInAttendance";
import { getDeveloperSchoolUsageInsights } from "./developerSchoolInsights";
import {
  getDeveloperHealthAlertSettings,
  updateDeveloperHealthAlertSettings,
  sendDeveloperHealthAlertEmailNow,
  scheduledDeveloperHealthAlertEmail,
} from "./developerSchoolHealthEmail";
import { studentMayRedeemCouponData } from "./couponRedemption";
import { decryptField } from "./crypto";
import { isAllowedGoogleEmailOnAllowlist } from "./googleAllowlist";

admin.initializeApp();

const SUBCOLLECTIONS = ["students", "classes", "teachers", "staffAccounts", "categories", "prizes", "coupons"];
const RETENTION_DAYS = 30;
const AI_FUN_UNIFIED_PRIZE_ID = "__ai_fun_unified__";
const HOT_KIOSK_FUNCTION_OPTIONS = {
  timeoutSeconds: 30,
  memory: "256MB" as const,
  minInstances: 1,
};

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

function maskRecipient(to: unknown): string {
  const s = typeof to === "string" ? to.trim() : "";
  if (!s) return "—";
  const at = s.indexOf("@");
  if (at < 1) return `${s.slice(0, 3)}…`;
  return `${s.slice(0, 2)}***${s.slice(at)}`;
}

/**
 * Timing-safe string comparison to prevent side-channel attacks on passcodes.
 * Returns true if `a` and `b` are non-empty and equal, without leaking length
 * or character-position information through timing differences.
 */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still run timingSafeEqual against bufA to avoid leaking length info via timing.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function schoolAccessPasscodeFrom(data: Record<string, any>): string {
  return trimmedString(data.schoolAccessPasscode) || trimmedString(data.passcode) || "";
}

function adminPasscodeFrom(data: Record<string, any>): string {
  return trimmedString(data.adminPasscode) || trimmedString(data.passcode) || "";
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

async function hasExistingSchoolPortalAccess(
  schoolId: string,
  uid: string,
  context: functions.https.CallableContext
): Promise<boolean> {
  const db = admin.firestore();
  if (
    await hasSchoolRole(schoolId, uid, [
      "admin",
      "teacher",
      "secretary",
      "prizeClerk",
      "reports",
      "librarian",
      "office",
      "houseCoordinator",
    ])
  ) {
    return true;
  }
  const portalSnap = await db
    .collection("schools")
    .doc(schoolId)
    .collection("anonymousPortalSessions")
    .doc(uid)
    .get();
  if (portalSnap.exists) return true;
  // Allowlisted Google dev/owner accounts may enter any school without the access passcode
  // (same bypass used for admin passcode login).
  if (isAllowedGoogleAdminBypass(context)) return true;
  return isDeveloper(context);
}

async function ensureAnonymousPortalSession(schoolId: string, uid: string): Promise<void> {
  const db = admin.firestore();
  await db
    .collection("schools")
    .doc(schoolId)
    .collection("anonymousPortalSessions")
    .doc(uid)
    .set({ grantedAt: FieldValue.serverTimestamp() }, { merge: true });
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

async function hasKioskMembershipOrStaff(
  schoolId: string,
  context: functions.https.CallableContext,
  roles: Array<"admin" | "teacher" | "secretary" | "prizeClerk" | "reports" | "librarian" | "houseCoordinator"> = ["admin", "teacher", "secretary", "prizeClerk", "librarian"]
): Promise<boolean> {
  requireAuth(context);
  const uid = context.auth!.uid;
  const db = admin.firestore();
  const memberSnap = await db.collection("schools").doc(schoolId).collection("kioskMembers").doc(uid).get();
  if (memberSnap.exists) return true;
  if (await hasSchoolRole(schoolId, uid, roles)) return true;
  return isDeveloper(context);
}

async function schoolEntryCodeIsRequired(
  db: admin.firestore.Firestore,
  schoolId: string
): Promise<boolean> {
  const secretSnap = await db.collection("schools").doc(schoolId).collection("secrets").doc("entry").get();
  const code = secretSnap.exists ? String(secretSnap.data()?.code ?? "").trim() : "";
  return code.length > 0;
}

async function schoolAccessPasscodeIsRequired(
  db: admin.firestore.Firestore,
  schoolId: string
): Promise<boolean> {
  const schoolSnap = await db.collection("schools").doc(schoolId).get();
  if (!schoolSnap.exists) return false;
  return schoolAccessPasscodeFrom(schoolSnap.data() || {}).length > 0;
}

function requireDescriptor(value: unknown, name: string): asserts value is FaceDescriptor {
  if (
    !Array.isArray(value) ||
    value.length < 32 ||
    value.length > 2048 ||
    !value.every((n) => typeof n === "number" && Number.isFinite(n))
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `A valid ${name} descriptor is required.`
    );
  }
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

async function performFullBackup(schoolId: string, type: string) {
  const backupId = Date.now().toString();
  const db = admin.firestore();

  try {
    const { data, counts, totalDocs } = await collectFullSchoolData(schoolId);

    const jsonStr = JSON.stringify(data);
    const sha256 = crypto.createHash("sha256").update(jsonStr).digest("hex");
    const sizeBytes = Buffer.byteLength(jsonStr, "utf8");
    const storagePath = `backups/${schoolId}/${backupId}.json`;

    const bucket = admin.storage().bucket();
    await bucket.file(storagePath).save(jsonStr, {
      contentType: "application/json",
      metadata: { schoolId, sha256, type, backupId },
    });

    const metadata = {
      createdAt: Date.now(),
      storagePath,
      sha256,
      sizeBytes,
      type,
      status: "complete",
      collections: counts,
      totalDocs,
    };

    await db.collection("schools").doc(schoolId).collection("backups").doc(backupId).set(metadata);

    return { success: true, backupId, metadata };
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error";
    console.error(`Backup failed for ${schoolId}:`, error);

    try {
      await db.collection("schools").doc(schoolId).collection("backups").doc(backupId).set({
        createdAt: Date.now(),
        type,
        status: "failed",
        error: errorMsg,
        storagePath: "",
        sha256: "",
        sizeBytes: 0,
        collections: {},
        totalDocs: 0,
      });
    } catch (logErr) {
      console.error("Could not log backup failure:", logErr);
    }

    return { success: false, backupId, error: errorMsg };
  }
}

async function restoreSchoolFromData(schoolId: string, backupData: Record<string, any>) {
  const db = admin.firestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const BATCH_LIMIT = 499;

  const currentSnap = await schoolRef.get();
  const currentSchoolData = currentSnap.exists ? currentSnap.data() ?? {} : {};
  const currentPasscode = trimmedString(currentSchoolData.passcode) || null;
  const currentSchoolAccessPasscode = trimmedString(currentSchoolData.schoolAccessPasscode) || null;
  const currentAdminPasscode = trimmedString(currentSchoolData.adminPasscode) || null;

  for (const sub of SUBCOLLECTIONS) {
    const snap = await schoolRef.collection(sub).get();

    if (sub === "students") {
      for (const studentDoc of snap.docs) {
        const activitiesSnap = await studentDoc.ref.collection("activities").get();
        for (let i = 0; i < activitiesSnap.docs.length; i += BATCH_LIMIT) {
          const batch = db.batch();
          activitiesSnap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    }

    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  const schoolDocData: Record<string, any> = {};
  for (const key of Object.keys(backupData)) {
    if (!key.startsWith("_")) {
      schoolDocData[key] = backupData[key];
    }
  }
  if (currentPasscode) {
    schoolDocData.passcode = currentPasscode;
  }
  if (currentSchoolAccessPasscode) {
    schoolDocData.schoolAccessPasscode = currentSchoolAccessPasscode;
  }
  if (currentAdminPasscode) {
    schoolDocData.adminPasscode = currentAdminPasscode;
  }
  await schoolRef.set(schoolDocData);

  for (const sub of SUBCOLLECTIONS) {
    const items = backupData[`_${sub}`] as any[] | undefined;
    if (!items || items.length === 0) continue;

    const ops: Array<{ ref: any; data: any }> = [];

    for (const item of items) {
      const itemObj = { ...item };
      const itemId = itemObj.id;
      const activities = itemObj._activities;
      delete itemObj.id;
      delete itemObj._activities;

      const docRef = schoolRef.collection(sub).doc(itemId);
      ops.push({ ref: docRef, data: itemObj });

      if (sub === "students" && Array.isArray(activities)) {
        for (const act of activities) {
          const actObj = { ...act };
          const actId = actObj.id;
          delete actObj.id;
          ops.push({ ref: docRef.collection("activities").doc(actId), data: actObj });
        }
      }
    }

    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      ops.slice(i, i + BATCH_LIMIT).forEach((op) => batch.set(op.ref, op.data));
      await batch.commit();
    }
  }
}

async function pruneOldBackups(schoolId: string): Promise<number> {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const allBackups = await db.collection("schools").doc(schoolId).collection("backups").get();

  let deleted = 0;
  for (const backupDoc of allBackups.docs) {
    const data = backupDoc.data();
    const createdAt = data.createdAt || 0;

    if (createdAt > 0 && createdAt < cutoff) {
      if (data.storagePath) {
        try {
          await bucket.file(data.storagePath).delete();
        } catch {
          /* file already gone */
        }
      }
      await backupDoc.ref.delete();
      deleted++;
    }
  }

  return deleted;
}

// ========================================================================
// Callable: Full-depth backup
// ========================================================================

exports.createBackupTrigger = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await requireSchoolAdmin(data.schoolId, context);

    const type = data.type || "manual";
    const result = await performFullBackup(data.schoolId, type);

    if (!result.success) {
      throw new functions.https.HttpsError("internal", result.error || "Backup failed.");
    }

    return { success: true, backupId: result.backupId, metadata: result.metadata };
  });

// ========================================================================
// Callable: Backup all schools
// ========================================================================

exports.backupAllSchools = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onCall(async (_data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    // This operation is intentionally disabled by default because it can exfiltrate
    // data across all schools via Admin SDK. Re-enable only with an explicit allowlist.
    throw new functions.https.HttpsError(
      "permission-denied",
      "backupAllSchools is disabled."
    );
  });

// ========================================================================
// Callable: Full restore from backup
// ========================================================================

exports.restoreFromFullBackup = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await requireSchoolAdmin(data.schoolId, context);
    requireString(data.backupId, "backupId");

    const { schoolId, backupId } = data;
    const db = admin.firestore();
    const backupDoc = await db
      .collection("schools").doc(schoolId)
      .collection("backups").doc(backupId)
      .get();

    if (!backupDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Backup not found.");
    }

    const backupMeta = backupDoc.data()!;

    await performFullBackup(schoolId, "pre-restore");

    if (!backupMeta.storagePath) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This backup has no Cloud Storage file and cannot be restored."
      );
    }

    const bucket = admin.storage().bucket();
    const [fileContents] = await bucket.file(backupMeta.storagePath).download();
    const jsonStr = fileContents.toString("utf8");

    if (backupMeta.sha256) {
      const hash = crypto.createHash("sha256").update(jsonStr).digest("hex");
      if (hash !== backupMeta.sha256) {
        throw new functions.https.HttpsError(
          "data-loss",
          "Backup integrity check failed — the file may be corrupted."
        );
      }
    }

    await restoreSchoolFromData(schoolId, JSON.parse(jsonStr));

    return { success: true };
  });

// ========================================================================
// Callable: Download backup data
// ========================================================================

exports.downloadFullBackup = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await requireSchoolAdmin(data.schoolId, context);
    requireString(data.backupId, "backupId");

    const db = admin.firestore();
    const backupDoc = await db
      .collection("schools").doc(data.schoolId)
      .collection("backups").doc(data.backupId)
      .get();

    if (!backupDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Backup not found.");
    }

    const meta = backupDoc.data()!;

    if (!meta.storagePath) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This backup has no Cloud Storage file and cannot be downloaded."
      );
    }

    const bucket = admin.storage().bucket();
    const [fileContents] = await bucket.file(meta.storagePath).download();
    return { data: JSON.parse(fileContents.toString("utf8")), metadata: meta };
  });

// ========================================================================
// Callable: Verify backup integrity (SHA-256)
// ========================================================================

exports.verifyBackupIntegrity = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    await requireSchoolAdmin(data.schoolId, context);
    requireString(data.backupId, "backupId");

    const db = admin.firestore();
    const backupDoc = await db
      .collection("schools").doc(data.schoolId)
      .collection("backups").doc(data.backupId)
      .get();

    if (!backupDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Backup not found.");
    }

    const meta = backupDoc.data()!;

    if (!meta.storagePath || !meta.sha256) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This backup has no Cloud Storage file or integrity hash and cannot be verified."
      );
    }

    try {
      const bucket = admin.storage().bucket();
      const [fileContents] = await bucket.file(meta.storagePath).download();
      const hash = crypto.createHash("sha256").update(fileContents).digest("hex");
      const match = hash === meta.sha256;

      return {
        verified: match,
        expectedHash: meta.sha256,
        actualHash: hash,
        reason: match
          ? "Backup integrity verified — SHA-256 hash matches."
          : "Hash mismatch — backup file may be corrupted.",
      };
    } catch (error: any) {
      return { verified: false, reason: `Cannot read backup file: ${error.message}` };
    }
  }
);

// ========================================================================
// Scheduled: Automatic daily full backup + retention pruning
// Requires: Firebase Blaze plan + Cloud Scheduler API enabled
// ========================================================================

exports.scheduledFullBackup = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("every 6 hours")
  .timeZone("UTC")
  .onRun(async () => {
    const schoolsSnap = await admin.firestore().collection("schools").get();
    let succeeded = 0;
    let failed = 0;
    let totalPruned = 0;

    for (const schoolDoc of schoolsSnap.docs) {
      const result = await performFullBackup(schoolDoc.id, "scheduled");
      if (result.success) {
        succeeded++;
        totalPruned += await pruneOldBackups(schoolDoc.id);
      } else {
        failed++;
      }
    }

    functions.logger.info(
      `Scheduled backup: ${succeeded} succeeded, ${failed} failed, ${totalPruned} old backups pruned.`
    );

    return null;
  });

// ========================================================================
// Callable: Verify school passcode (used by login and student logout)
// ========================================================================

exports.verifySchoolPasscode = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const passcode = typeof data.passcode === "string" ? String(data.passcode).trim() : "";
    const db = admin.firestore();
    const schoolDoc = await db.collection("schools").doc(schoolId).get();

    if (!schoolDoc.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const uid = context.auth!.uid;
    const adminRoleRef = db.collection("schools").doc(schoolId).collection("roles_admin").doc(uid);
    const googleAdminBypass = isAllowedGoogleAdminBypass(context);

    if (!googleAdminBypass) {
      if (passcode.length === 0) {
        const existingAdmin = await adminRoleRef.get();
        if (existingAdmin.exists && existingAdmin.data()?.role === "admin") {
          return { success: true };
        }
        throw new functions.https.HttpsError("invalid-argument", "A valid passcode is required.");
      }
      const schoolData = schoolDoc.data()!;
      const expected = adminPasscodeFrom(schoolData);
      if (!expected) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This school has no admin passcode configured. An administrator must set one before login is possible."
        );
      }
      if (!safeEqual(expected, passcode)) {
        throw new functions.https.HttpsError("permission-denied", "Invalid passcode.");
      }
    }

    // Provision admin role using the Admin SDK (path must match client: schools/{schoolId}/roles_admin/{uid})
    await adminRoleRef.set({ role: 'admin' });

    return { success: true };
  }
);

// ========================================================================
// Callable: Verify school access passcode (NO role provisioning)
// Used for "school sign-in" gate before choosing student/staff/admin.
// ========================================================================

exports.verifySchoolAccessPasscode = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const passcode = typeof data.passcode === "string" ? String(data.passcode).trim() : "";
    const db = admin.firestore();
    const schoolDoc = await db.collection("schools").doc(schoolId).get();

    if (!schoolDoc.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const uid = context.auth!.uid;

    if (passcode.length === 0) {
      if (isGoogleAuthenticated(context) && (await hasExistingSchoolPortalAccess(schoolId, uid, context))) {
        await ensureAnonymousPortalSession(schoolId, uid);
        return { success: true };
      }
      throw new functions.https.HttpsError("invalid-argument", "A valid passcode is required.");
    }

    const schoolData = schoolDoc.data()!;
    const expected = schoolAccessPasscodeFrom(schoolData);
    if (!expected) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This school has no access passcode configured. An administrator must set one before sign-in is possible."
      );
    }
    if (!safeEqual(expected, passcode)) {
      throw new functions.https.HttpsError("permission-denied", "Invalid passcode.");
    }

    // Lets the Next.js edge gate mint a school-scoped cookie after verifying the same passcode server-side.
    await ensureAnonymousPortalSession(schoolId, uid);

    return { success: true };
  }
);

// ========================================================================
// Developer allow-list (appConfig/global.developerUids) for attendance etc.
// ========================================================================

const APP_CONFIG_GLOBAL = "global";

async function isDeveloper(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth?.uid) return false;
  const db = admin.firestore();
  const globalRef = db.collection("appConfig").doc(APP_CONFIG_GLOBAL);
  const snap = await globalRef.get();
  const list = snap.exists ? (snap.data()?.developerUids as string[] | undefined) : undefined;
  return Array.isArray(list) && list.includes(context.auth!.uid);
}

async function requireDeveloper(context: functions.https.CallableContext): Promise<void> {
  requireAuth(context);
  if (!(await isDeveloper(context))) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Developer access is required."
    );
  }
}

exports.getDeveloperSchoolUsageInsights = getDeveloperSchoolUsageInsights;
exports.getDeveloperHealthAlertSettings = getDeveloperHealthAlertSettings;
exports.updateDeveloperHealthAlertSettings = updateDeveloperHealthAlertSettings;
exports.sendDeveloperHealthAlertEmailNow = sendDeveloperHealthAlertEmailNow;
exports.scheduledDeveloperHealthAlertEmail = scheduledDeveloperHealthAlertEmail;

/** Callable: add current user to developer allow-list (allowed Google accounts only). */
exports.addDeveloperMe = functions.https.onCall(
  async (_data: any, context: functions.https.CallableContext) => {
    requireAuth(context);

    const email = (context.auth?.token?.email ?? "").trim().toLowerCase();
    const provider = context.auth?.token?.firebase?.sign_in_provider;
    const allowlistStr = process.env.DEVELOPER_GOOGLE_EMAIL_ALLOWLIST || process.env.NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST || "";
    const allowlist = allowlistStr.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

    const isGoogleDev =
      provider === "google.com" && email && isAllowedGoogleEmailOnAllowlist(email, allowlist);

    if (!isGoogleDev) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Developer access requires signing in with an allowed Google account."
      );
    }

    const db = admin.firestore();
    const globalRef = db.collection("appConfig").doc(APP_CONFIG_GLOBAL);
    await globalRef.set(
      { developerUids: FieldValue.arrayUnion(context.auth!.uid) },
      { merge: true }
    );
    return { success: true };
  }
);


/** Callable: record a developer support session before opening a school's admin tools. */
exports.startDeveloperSupportSession = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    await requireDeveloper(context);
    requireString(data.schoolId, "schoolId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(schoolId);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) {
      throw new functions.https.HttpsError("not-found", `School "${schoolId}" was not found.`);
    }

    const now = Date.now();
    const uid = context.auth!.uid;
    const sessionRef = schoolRef.collection("supportSessions").doc(`${now}_${uid}`);
    await sessionRef.set({
      developerUid: uid,
      startedAt: now,
      schoolId,
      userAgent: context.rawRequest.get("user-agent") || "",
      status: "started",
    });

    // School Office and admin tools read Firestore via roles_admin — provision for this school.
    await schoolRef.collection("roles_admin").doc(uid).set({ role: "admin" }, { merge: true });

    return { success: true, sessionId: sessionRef.id };
  }
);

/** Callable: create or repair a school shell using the Admin SDK. */
exports.createSchoolByDeveloper = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    await requireDeveloper(context);
    requireString(data.schoolId, "schoolId");

    const cleanId = String(data.schoolId).trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanId) {
      throw new functions.https.HttpsError("invalid-argument", "School ID is invalid.");
    }

    const now = Date.now();
    const providedName = typeof data.name === "string" ? data.name.trim() : "";
    const providedLegacyPasscode = trimmedString(data.passcode);
    const providedSchoolAccessPasscode = trimmedString(data.schoolAccessPasscode) || providedLegacyPasscode;
    const providedAdminPasscode = trimmedString(data.adminPasscode) || providedLegacyPasscode;

    if (!providedSchoolAccessPasscode && !providedAdminPasscode) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "At least one passcode (schoolAccessPasscode, adminPasscode, or passcode) must be provided when creating a school."
      );
    }

    const schoolDocData: Record<string, any> = {
      name: providedName || cleanId,
      updatedAt: now,
      passcode: providedSchoolAccessPasscode || providedAdminPasscode,
      schoolAccessPasscode: providedSchoolAccessPasscode || providedAdminPasscode,
      adminPasscode: providedAdminPasscode || providedSchoolAccessPasscode,
      plan: "free",
      featureOverrides: {},
      hasMigratedStudents: true,
      hasMigratedClasses: true,
      hasMigratedTeachers: true,
      hasMigratedPrizes: true,
      hasMigratedCoupons: true,
      hasMigratedCategories: true,
    };

    const seedStudent = {
      id: "100",
      firstName: "Test",
      lastName: "Student",
      nfcId: "100",
      points: 0,
      lifetimePoints: 0,
      classId: "",
      categoryPoints: {},
      categoryPointsByPeriod: {},
      earnedAchievements: [],
      earnedBadges: [],
    };
    const seedTeacher = {
      id: "t1",
      name: "Teacher",
      username: "teacher",
      passcode: "1234",
    };
    const seedPrize = {
      id: "default_prize",
      name: "Default Prize",
      points: 10,
      icon: "Gift",
      inStock: true,
    };
    const seedStaffAccounts = [
      {
        id: "default_coupon_staff",
        displayName: "Coupon Staff",
        username: "coupon",
        passcode: "1234",
        role: "secretary",
        roles: ["secretary"],
      },
      {
        id: "default_prize_staff",
        displayName: "Prize Staff",
        username: "prize",
        passcode: "1234",
        role: "prizeClerk",
        roles: ["prizeClerk"],
      },
      {
        id: "default_reports_staff",
        displayName: "Reports Staff",
        username: "reports",
        passcode: "1234",
        role: "reports",
        roles: ["reports"],
      },
      {
        id: "default_librarian_staff",
        displayName: "Library Staff",
        username: "library",
        passcode: "1234",
        role: "librarian",
        roles: ["librarian"],
      },
    ];

    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(cleanId);
    const schoolSnap = await schoolRef.get();
    const studentsSnap = await schoolRef.collection("students").limit(1).get();
    const teachersSnap = await schoolRef.collection("teachers").limit(1).get();
    const prizesSnap = await schoolRef.collection("prizes").limit(1).get();
    const staffAccountsSnap = await schoolRef.collection("staffAccounts").limit(1).get();

    if (schoolSnap.exists && (!studentsSnap.empty || !teachersSnap.empty)) {
      throw new functions.https.HttpsError(
        "already-exists",
        `School ID "${cleanId}" already exists.`
      );
    }

    const existing = schoolSnap.exists ? schoolSnap.data() ?? {} : {};
    const finalSchoolDocData = {
      ...schoolDocData,
      ...existing,
      name: providedName || existing.name || schoolDocData.name,
      passcode: providedSchoolAccessPasscode || existing.passcode || schoolDocData.passcode,
      schoolAccessPasscode:
        providedSchoolAccessPasscode ||
        schoolAccessPasscodeFrom(existing) ||
        schoolDocData.schoolAccessPasscode,
      adminPasscode:
        providedAdminPasscode ||
        adminPasscodeFrom(existing) ||
        schoolDocData.adminPasscode,
      updatedAt: now,
      plan: existing.plan || schoolDocData.plan,
      featureOverrides: existing.featureOverrides || schoolDocData.featureOverrides,
      hasMigratedStudents: true,
      hasMigratedClasses: true,
      hasMigratedTeachers: true,
      hasMigratedPrizes: true,
      hasMigratedCoupons: true,
      hasMigratedCategories: true,
    };

    const batch = db.batch();
    batch.set(schoolRef, finalSchoolDocData, { merge: true });
    if (studentsSnap.empty) {
      const { id, ...studentData } = seedStudent;
      batch.set(schoolRef.collection("students").doc(id), studentData);
    }
    if (teachersSnap.empty) {
      const { id, ...teacherData } = seedTeacher;
      batch.set(schoolRef.collection("teachers").doc(id), teacherData);
    }
    if (prizesSnap.empty) {
      const { id, ...prizeData } = seedPrize;
      batch.set(schoolRef.collection("prizes").doc(id), prizeData);
    }
    if (staffAccountsSnap.empty) {
      for (const account of seedStaffAccounts) {
        batch.set(schoolRef.collection("staffAccounts").doc(account.id), account);
      }
    }
    const publicStaffAccounts = staffAccountsSnap.empty ? seedStaffAccounts : [];
    const staffDirectory = [
      {
        id: `teacher:${seedTeacher.username}`,
        sourceId: seedTeacher.id,
        type: "teacher",
        label: seedTeacher.name,
        username: seedTeacher.username,
        updatedAt: now,
      },
      ...publicStaffAccounts.map((account) => ({
        id: `${account.role}:${account.id}`,
        sourceId: account.id,
        type: account.role,
        label: account.displayName,
        username: account.username,
        updatedAt: now,
      })),
    ];
    batch.set(
      db.collection("schoolPublic").doc(cleanId),
      {
        active: true,
        name: finalSchoolDocData.name,
        plan: finalSchoolDocData.plan,
        featureOverrides: finalSchoolDocData.featureOverrides,
        staffDirectory,
        staffDirectoryUpdatedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
    await batch.commit();

    return {
      success: true,
      cleanId,
      passcode: finalSchoolDocData.schoolAccessPasscode,
      schoolAccessPasscode: finalSchoolDocData.schoolAccessPasscode,
      adminPasscode: finalSchoolDocData.adminPasscode,
      repaired: schoolSnap.exists,
    };
  }
);

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

/** Callable: verify school entry code and grant kiosk membership. */
exports.verifySchoolEntryCode = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.code, "code");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const code = String(data.code).trim();
    const db = admin.firestore();

    const DEMO_SCHOOL_IDS = new Set(["demo-arcade", "demo-001"]);
    if (!DEMO_SCHOOL_IDS.has(schoolId)) {
      const secretRef = db.collection("schools").doc(schoolId).collection("secrets").doc("entry");
      const secretSnap = await secretRef.get();
      const expected = secretSnap.exists ? String(secretSnap.data()?.code ?? "").trim() : "";
      if (expected.length > 0 && expected !== code) {
        throw new functions.https.HttpsError("permission-denied", "Invalid school code.");
      }
    }

    const uid = context.auth!.uid;
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(uid);
    await memberRef.set({ createdAt: Date.now() }, { merge: true });
    return { success: true };
  }
);

/** Callable: grant a browser a kiosk session for public student-mode school links. */
exports.enterSchoolKioskSession = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    const publicSnap = await db.collection("schoolPublic").doc(schoolId).get();
    if (!publicSnap.exists) {
      throw new functions.https.HttpsError("permission-denied", "Public student access is not enabled for this school.");
    }
    if (publicSnap.data()?.active === false) {
      throw new functions.https.HttpsError("permission-denied", "School is not active.");
    }
    if (await schoolEntryCodeIsRequired(db, schoolId)) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    if (
      await schoolAccessPasscodeIsRequired(db, schoolId) &&
      !(await hasExistingSchoolPortalAccess(schoolId, context.auth!.uid, context))
    ) {
      throw new functions.https.HttpsError("permission-denied", "School passcode required.");
    }

    await db
      .collection("schools")
      .doc(schoolId)
      .collection("kioskMembers")
      .doc(context.auth!.uid)
      .set({ createdAt: Date.now(), source: "student-login" }, { merge: true });
    return { success: true };
  }
);

/** Callable: register browser for student home portal (lobby gate + API lookups). */
exports.enterStudentPortalLobby = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();

    let appSettings: Record<string, unknown> = {};
    let active = true;
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    if (schoolSnap.exists) {
      const schoolData = schoolSnap.data() as Record<string, unknown>;
      if (schoolData.active === false) active = false;
      appSettings = (schoolData.appSettings as Record<string, unknown>) || {};
    } else {
      const publicSnap = await db.collection("schoolPublic").doc(schoolId).get();
      if (!publicSnap.exists) {
        throw new functions.https.HttpsError("not-found", "School not found.");
      }
      const publicData = publicSnap.data() as Record<string, unknown>;
      if (publicData.active === false) active = false;
      appSettings = (publicData.appSettings as Record<string, unknown>) || {};
    }

    if (!active) {
      throw new functions.https.HttpsError("permission-denied", "This school is not active.");
    }
    if (appSettings.enableStudentPortal !== true) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Student home portal is not enabled for this school."
      );
    }

    await db
      .collection("schools")
      .doc(schoolId)
      .collection("studentPortalMembers")
      .doc(context.auth!.uid)
      .set({ createdAt: Date.now(), source: "student-portal-lobby" }, { merge: true });

    return { success: true };
  }
);

/** Callable: kiosk-safe student lookup by badge/card id. */
exports.lookupStudentByBadge = functions
  .runWith(HOT_KIOSK_FUNCTION_OPTIONS)
  .https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const schoolId = String(data.schoolId).trim().toLowerCase();

    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    if (data?.warmup === true) {
      return { warmed: true, studentId: null };
    }

    requireString(data.badgeId, "badgeId");
    const badgeId = String(data.badgeId).trim();
    const db = admin.firestore();

    const studentsRef = db.collection("schools").doc(schoolId).collection("students");
    const numericBadgeId = /^\d+$/.test(badgeId) ? Number(badgeId) : null;

    const [byDoc, byStr, byNum] = await Promise.all([
      studentsRef.doc(badgeId).get(),
      studentsRef.where("nfcId", "==", badgeId).limit(1).get(),
      numericBadgeId !== null && Number.isFinite(numericBadgeId)
        ? studentsRef.where("nfcId", "==", numericBadgeId).limit(1).get()
        : Promise.resolve(null),
    ]);
    if (byDoc.exists) return { studentId: byDoc.id };

    if (!byStr.empty) return { studentId: byStr.docs[0].id };

    if (byNum && !byNum.empty) {
      return { studentId: byNum.docs[0].id };
    }

    return { studentId: null };
  }
);

const STUDENT_THEME_HEX = /^#[0-9a-fA-F]{6}$/;

function sanitizeKioskStudentThemePayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  const requireHex = (value: unknown, fallback: string): string => {
    const s = typeof value === "string" ? value.trim() : "";
    return STUDENT_THEME_HEX.test(s) ? s : fallback;
  };
  const out: Record<string, unknown> = {
    background: requireHex(data.background, "#020617"),
    text: requireHex(data.text, "#ffffff"),
    primary: requireHex(data.primary, "#13a58d"),
    cardBackground: requireHex(data.cardBackground, "#111827"),
    accent: requireHex(data.accent, "#22c55e"),
  };
  if (typeof data.emoji === "string" && data.emoji.trim()) {
    out.emoji = data.emoji.trim().slice(0, 8);
  }
  if (typeof data.fontFamily === "string" && data.fontFamily.trim()) {
    out.fontFamily = data.fontFamily.trim().replace(/[^\w\s-]/g, "").slice(0, 80);
  }
  if (typeof data.backgroundStyle === "string") {
    const bs = data.backgroundStyle.trim().slice(0, 500);
    if (bs.startsWith("linear-gradient") || bs.startsWith("radial-gradient")) {
      out.backgroundStyle = bs;
    }
  }
  if (typeof data.fontScale === "number" && Number.isFinite(data.fontScale)) {
    out.fontScale = Math.min(1.5, Math.max(0.85, data.fontScale));
  }
  if (typeof data.fontTracking === "number" && Number.isFinite(data.fontTracking)) {
    out.fontTracking = Math.min(0.2, Math.max(-0.05, data.fontTracking));
  }
  if (data.fontStyle === "normal" || data.fontStyle === "italic") {
    out.fontStyle = data.fontStyle;
  }
  if (typeof data.fontWeight === "number" && Number.isFinite(data.fontWeight)) {
    out.fontWeight = data.fontWeight >= 600 ? 800 : 400;
  }
  return out;
}

/** Callable: kiosk may set or clear a student's personal theme (theme field only). */
exports.setStudentKioskTheme = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    requireString(data.studentId, "studentId");
    const studentId = String(data.studentId).trim();
    const db = admin.firestore();
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const appSettings = schoolSnap.exists ? (schoolSnap.data()?.appSettings || {}) : {};
    if (appSettings.enableStudentThemes === false) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Student themes are turned off for this school."
      );
    }
    const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Student not found.");
    }
    if (data.remove === true || data.theme === null) {
      await studentRef.update({ theme: admin.firestore.FieldValue.delete() });
      return { success: true };
    }
    const theme = sanitizeKioskStudentThemePayload(data.theme);
    if (!theme) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid theme payload.");
    }
    await studentRef.update({ theme });
    return { success: true };
  }
);

async function redeemCouponForStudent(
  db: admin.firestore.Firestore,
  schoolId: string,
  studentId: string,
  couponCode: string
): Promise<{ value: number; bonusTotal: number; category: string }> {
  const schoolRef = db.collection("schools").doc(schoolId);
  const couponRef = schoolRef.collection("coupons").doc(couponCode);
  const studentRef = schoolRef.collection("students").doc(studentId);
  const [schoolSnap, categoriesSnap, achievementsSnap, badgesSnap] = await Promise.all([
    schoolRef.get(),
    schoolRef.collection("categories").get(),
    schoolRef.collection("achievements").get(),
    schoolRef.collection("badges").get(),
  ]);
  const appSettings = schoolSnap.exists ? (schoolSnap.data()?.appSettings || {}) : {};
  const achievements = appSettings.enableAchievements === true
    ? achievementsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    : [];
  const badges = appSettings.enableBadges === true
    ? badgesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    : [];
  const categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const couponSnap = await tx.get(couponRef);
    if (!couponSnap.exists) throw new functions.https.HttpsError("not-found", "Coupon code not found.");
    const coupon = couponSnap.data() as any;
    if (coupon.startsAt && typeof coupon.startsAt === "number" && now < coupon.startsAt) {
      throw new functions.https.HttpsError("failed-precondition", "This coupon is not valid yet.");
    }
    if (coupon.expiresAt && typeof coupon.expiresAt === "number" && now > coupon.expiresAt) {
      throw new functions.https.HttpsError("failed-precondition", "This coupon has expired.");
    }
    if (coupon.used === true) {
      throw new functions.https.HttpsError("failed-precondition", "This coupon has already been used.");
    }

    const studentSnap = await tx.get(studentRef);
    if (!studentSnap.exists) throw new functions.https.HttpsError("not-found", "Student not found.");
    const s = studentSnap.data() as any;
    const classId = typeof s.classId === "string" ? s.classId : "";
    let classPrimaryTeacherId: string | null = null;
    if (classId) {
      const classSnap = await tx.get(schoolRef.collection("classes").doc(classId));
      if (classSnap.exists) {
        const cd = classSnap.data() as any;
        if (typeof cd.primaryTeacherId === "string") classPrimaryTeacherId = cd.primaryTeacherId;
      }
    }
    const gate = studentMayRedeemCouponData(coupon, s, classPrimaryTeacherId);
    if (!gate.ok) {
      throw new functions.https.HttpsError("failed-precondition", gate.message || "Not eligible to redeem this coupon.");
    }

    const value = typeof coupon.value === "number" ? coupon.value : Number(coupon.value || 0);
    const categoryName = String(coupon.category || "Coupon");
    const newPoints = Number(s.points || 0) + value;
    const newLifetimePoints = Number(s.lifetimePoints || 0) + value;
    const categoryPoints = s.categoryPoints && typeof s.categoryPoints === "object" && !Array.isArray(s.categoryPoints)
      ? { ...(s.categoryPoints as Record<string, number>) }
      : {};
    categoryPoints[categoryName] = Number(categoryPoints[categoryName] || 0) + value;
    const categoryPointsByPeriod = applyCategoryPointsByPeriodData(s.categoryPointsByPeriod, categoryName, value, now);

    const earnedBadges = [...(Array.isArray(s.earnedBadges) ? s.earnedBadges : [])];
    for (const b of evaluateBadgeAwardsData({ student: s, badges, categories, categoryPointsByPeriod, now })) {
      earnedBadges.push({ badgeId: b.badgeId, periodKey: b.periodKey, earnedAt: b.earnedAt });
      tx.set(studentRef.collection("activities").doc(), {
        desc: `Badge earned: ${b.name}`,
        amount: 0,
        date: b.earnedAt,
      });
    }

    const earnedAchievements = [...(Array.isArray(s.earnedAchievements) ? s.earnedAchievements : [])];
    let bonusTotal = 0;
    for (const ach of evaluateAchievementAwardsData({
      student: s,
      achievements,
      categories,
      points: newPoints,
      lifetimePoints: newLifetimePoints,
      categoryPoints,
      now,
    })) {
      const earnedAchievement: Record<string, unknown> = {
        achievementId: ach.achievementId,
        earnedAt: ach.earnedAt,
      };
      if (ach.wheelSpin) earnedAchievement.wheelSpun = false;
      earnedAchievements.push(earnedAchievement);
      if (ach.wheelSpin) {
        tx.set(studentRef.collection("activities").doc(), {
          desc: `Achievement Unlocked: ${ach.name} (Wheel Spin ready!)`,
          amount: 0,
          date: now,
        });
      } else {
        bonusTotal += ach.bonusPoints;
        tx.set(studentRef.collection("activities").doc(), {
          desc: `Achievement Unlocked: ${ach.name}`,
          amount: ach.bonusPoints,
          date: now,
        });
      }
    }

    tx.update(studentRef, {
      points: newPoints + bonusTotal,
      lifetimePoints: newLifetimePoints + bonusTotal,
      categoryPoints,
      categoryPointsByPeriod,
      earnedAchievements,
      earnedBadges,
    });
    const cat = String(coupon.category || "Coupon");
    const code = String(coupon.code || couponCode);
    tx.set(studentRef.collection("activities").doc(), { desc: `Redeemed coupon: ${code} (${cat})`, amount: value, date: now });
    tx.update(couponRef, { used: true, usedAt: now, usedBy: studentId });
    return { value, bonusTotal, category: categoryName };
  });
}

/** Callable: redeem coupon (server-authoritative; kiosk-safe). */
exports.redeemCouponServer = functions
  .runWith(HOT_KIOSK_FUNCTION_OPTIONS)
  .https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    const schoolId = String(data.schoolId).trim().toLowerCase();

    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    if (data?.warmup === true) {
      return {
        success: true,
        message: "Warmed",
        value: 0,
        bonusTotal: 0,
      };
    }

    requireString(data.studentId, "studentId");
    requireString(data.couponCode, "couponCode");
    const studentId = String(data.studentId).trim();
    const couponCode = String(data.couponCode).trim().toUpperCase();

    const db = admin.firestore();
    const result = await redeemCouponForStudent(db, schoolId, studentId, couponCode);
    return {
      success: true,
      message: "Redeemed successfully",
      value: result.value,
      bonusTotal: result.bonusTotal,
      category: result.category,
    };
  }
);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function libraryDaysOverdue(dueAt: unknown, now: number): number {
  const due = typeof dueAt === "number" ? dueAt : 0;
  if (!due || now <= due) return 0;
  return Math.ceil((now - due) / MS_PER_DAY);
}

/** Callable: return library book + optional category point adjustments (kiosk-safe). */
exports.libraryReturnServer = functions
  .runWith(HOT_KIOSK_FUNCTION_OPTIONS)
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireString(data.upc, "upc");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const upc = String(data.upc).trim().toUpperCase();

    if (
      !(await hasKioskMembershipOrStaff(schoolId, context, [
        "admin",
        "teacher",
        "secretary",
        "prizeClerk",
        "librarian",
      ]))
    ) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }

    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(schoolId);
    const libSnap = await schoolRef.collection("library").where("upc", "==", upc).limit(1).get();
    if (libSnap.empty) {
      throw new functions.https.HttpsError("not-found", "Library item not found.");
    }
    const itemDoc = libSnap.docs[0];
    const itemData = itemDoc.data() as {
      name?: string;
      status?: string;
      checkedOutTo?: string;
      dueAt?: number;
    };

    if (itemData.status !== "checked_out" || itemData.checkedOutTo !== studentId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This book is not checked out to this student."
      );
    }

    const schoolSnap = await schoolRef.get();
    const appSettings = (schoolSnap.data()?.appSettings ?? {}) as Record<string, unknown>;
    const loanPeriodDays =
      typeof appSettings.libraryLoanPeriodDays === "number" && appSettings.libraryLoanPeriodDays > 0
        ? appSettings.libraryLoanPeriodDays
        : 14;
    void loanPeriodDays;
    const lateFeesEnabled = appSettings.libraryLateFeesEnabled !== false;
    const latePointsPerDay =
      typeof appSettings.libraryLatePointsPerDay === "number" && appSettings.libraryLatePointsPerDay >= 0
        ? appSettings.libraryLatePointsPerDay
        : 2;
    const onTimeReturnPoints =
      typeof appSettings.libraryOnTimeReturnPoints === "number" && appSettings.libraryOnTimeReturnPoints > 0
        ? appSettings.libraryOnTimeReturnPoints
        : 0;
    const categoryId =
      typeof appSettings.libraryPointsCategoryId === "string"
        ? appSettings.libraryPointsCategoryId.trim()
        : "";

    let categoryName = "";
    if (categoryId) {
      const catSnap = await schoolRef.collection("categories").doc(categoryId).get();
      if (catSnap.exists && typeof catSnap.data()?.name === "string") {
        categoryName = catSnap.data()!.name.trim();
      }
    }

    const rawRewardMode =
      typeof appSettings.libraryRewardMode === "string" ? appSettings.libraryRewardMode.trim() : "";
    let rewardMode: "none" | "fines" | "app_points" | "isolated_points" = "none";
    if (
      rawRewardMode === "none" ||
      rawRewardMode === "fines" ||
      rawRewardMode === "app_points" ||
      rawRewardMode === "isolated_points"
    ) {
      rewardMode = rawRewardMode;
    } else if (categoryName && (lateFeesEnabled || onTimeReturnPoints > 0)) {
      rewardMode = "app_points";
    }

    const itemName = typeof itemData.name === "string" ? itemData.name.trim() : "Book";
    const now = Date.now();
    const daysOverdue = libraryDaysOverdue(itemData.dueAt, now);

    let pointsDelta = 0;
    let pointsMessage = "";

    if (rewardMode === "fines" && daysOverdue > 0 && lateFeesEnabled && latePointsPerDay > 0) {
      pointsDelta = daysOverdue * latePointsPerDay;
      pointsMessage = `Late return: ${pointsDelta} library fine${pointsDelta === 1 ? "" : "s"} added.`;
    } else if (rewardMode === "app_points" && categoryName) {
      if (daysOverdue > 0 && lateFeesEnabled && latePointsPerDay > 0) {
        pointsDelta = -(daysOverdue * latePointsPerDay);
        pointsMessage = `Late return: ${Math.abs(pointsDelta)} point(s) deducted (${categoryName}).`;
      } else if (daysOverdue === 0 && onTimeReturnPoints > 0) {
        pointsDelta = onTimeReturnPoints;
        pointsMessage = `On-time return: +${pointsDelta} point(s) (${categoryName}).`;
      }
    } else if (rewardMode === "isolated_points") {
      if (daysOverdue > 0 && lateFeesEnabled && latePointsPerDay > 0) {
        pointsDelta = -(daysOverdue * latePointsPerDay);
        pointsMessage = `Late return: ${Math.abs(pointsDelta)} library point(s) deducted.`;
      } else if (daysOverdue === 0 && onTimeReturnPoints > 0) {
        pointsDelta = onTimeReturnPoints;
        pointsMessage = `On-time return: +${pointsDelta} library point(s).`;
      }
    }

    await db.runTransaction(async (tx) => {
      const studentRef = schoolRef.collection("students").doc(studentId);
      const studentSnap = await tx.get(studentRef);

      tx.update(itemDoc.ref, {
        status: "available",
        checkedOutTo: null,
        checkedOutAt: null,
        dueAt: null,
      });

      if (studentSnap.exists) {
        const studentData = studentSnap.data() as {
          points?: number;
          categoryPoints?: Record<string, number>;
          libraryPoints?: number;
          libraryFineBalance?: number;
        };

        const studentUpdates: Record<string, unknown> = { updatedAt: now };

        if (rewardMode === "fines" && pointsDelta > 0) {
          const currentFines =
            typeof studentData.libraryFineBalance === "number" ? studentData.libraryFineBalance : 0;
          studentUpdates.libraryFineBalance = currentFines + pointsDelta;
        } else if (rewardMode === "isolated_points" && pointsDelta !== 0) {
          const currentLib =
            typeof studentData.libraryPoints === "number" ? studentData.libraryPoints : 0;
          studentUpdates.libraryPoints = Math.max(0, currentLib + pointsDelta);
        } else if (rewardMode === "app_points" && pointsDelta !== 0 && categoryName) {
          const currentPoints = typeof studentData.points === "number" ? studentData.points : 0;
          const newPoints = Math.max(0, currentPoints + pointsDelta);
          const categoryPoints = { ...(studentData.categoryPoints ?? {}) };
          categoryPoints[categoryName] = (categoryPoints[categoryName] || 0) + pointsDelta;
          studentUpdates.points = newPoints;
          studentUpdates.categoryPoints = categoryPoints;
        }

        if (Object.keys(studentUpdates).length > 1) {
          tx.update(studentRef, studentUpdates);
        }

        if (pointsDelta !== 0 && rewardMode !== "none") {
          const activityRef = studentRef.collection("activities").doc();
          const amountForActivity =
            rewardMode === "fines" ? 0 : rewardMode === "app_points" ? pointsDelta : pointsDelta;
          tx.set(activityRef, {
            desc:
              rewardMode === "fines"
                ? `Library late fine (${daysOverdue} day${daysOverdue === 1 ? "" : "s"}): ${itemName}`
                : pointsDelta < 0
                  ? `Library late fee (${daysOverdue} day${daysOverdue === 1 ? "" : "s"}): ${itemName}`
                  : `Library on-time bonus: ${itemName}`,
            amount: amountForActivity,
            date: now,
          });
        }
      }

      const returnActivityRef = studentRef.collection("activities").doc();
      tx.set(returnActivityRef, {
        desc: `Returned library item: ${itemName}`,
        amount: 0,
        date: now,
      });
    });

    return {
      success: true,
      pointsDelta,
      daysOverdue,
      message:
        pointsMessage ||
        (daysOverdue > 0
          ? `Returned "${itemName}" (${daysOverdue} day${daysOverdue === 1 ? "" : "s"} late).`
          : `Returned "${itemName}".`),
    };
  });

/** Callable: kiosk-safe prize redemption with trusted balance + stock updates. */
exports.redeemPrizeServer = functions
  .runWith(HOT_KIOSK_FUNCTION_OPTIONS)
  .https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    if (!(await hasKioskMembershipOrStaff(schoolId, context, ["admin", "teacher", "prizeClerk"]))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    if (data?.warmup === true) {
      return {
        success: true,
        message: "Warmed",
      };
    }

    requireString(data.studentId, "studentId");
    requireString(data.prizeId, "prizeId");
    const studentId = String(data.studentId).trim();
    const prizeId = String(data.prizeId).trim();
    const rawQuantity = Number(data.quantity ?? 1);
    const quantity = Number.isFinite(rawQuantity) ? Math.floor(rawQuantity) : 1;
    const issuePickupVoucher = data.issuePickupVoucher === true;
    const markFulfilled = issuePickupVoucher ? false : data.markFulfilled === true;
    if (quantity < 1 || quantity > 99) {
      throw new functions.https.HttpsError("invalid-argument", "Quantity must be between 1 and 99.");
    }

    const generateVoucherScanCode = () => {
      const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
      let code = "VR";
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    };

    const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
    const schoolRef = db.collection("schools").doc(schoolId);
    const prizeRef = db.collection("schools").doc(schoolId).collection("prizes").doc(prizeId);
    const redeemedAt = Date.now();

    const result = await db.runTransaction(async (tx) => {
      const studentSnap = await tx.get(studentRef);
      if (!studentSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Student not found.");
      }
      let prize: any = null;
      const prizeSnap = prizeId === AI_FUN_UNIFIED_PRIZE_ID ? null : await tx.get(prizeRef);
      if (prizeId === AI_FUN_UNIFIED_PRIZE_ID) {
        const schoolSnap = await tx.get(schoolRef);
        const settings = schoolSnap.exists ? (schoolSnap.data()?.appSettings || {}) : {};
        if (settings.enablePrizeAiSurprise === true) {
          const rawPoints = Number(settings.prizeAiSurpriseDefaultPoints ?? 1);
          prize = {
            name: "Fun",
            points: Number.isFinite(rawPoints) ? Math.max(0, Math.floor(rawPoints)) : 1,
            icon: "Sparkles",
            inStock: true,
            aiFunReward: "picker",
          };
        }
      } else if (prizeSnap?.exists) {
        prize = prizeSnap.data() as any;
      }
      if (!prize) {
        throw new functions.https.HttpsError("not-found", "Prize not found.");
      }

      const student = studentSnap.data() as any;
      const studentPoints = Number(student.points || 0);
      const prizePoints = Number(prize.points || 0);
      if (!Number.isFinite(prizePoints) || prizePoints < 0) {
        throw new functions.https.HttpsError("failed-precondition", "This prize is not configured correctly.");
      }
      const totalCost = prizePoints * quantity;

      if (prize.inStock !== true) {
        throw new functions.https.HttpsError("failed-precondition", "This prize is not available.");
      }
      if (typeof prize.stockCount === "number" && prize.stockCount < quantity) {
        throw new functions.https.HttpsError("failed-precondition", "Not enough items in stock for that quantity.");
      }
      if (studentPoints < totalCost) {
        throw new functions.https.HttpsError("failed-precondition", "Not enough points.");
      }

      const studentClassId = typeof student.classId === "string" ? student.classId : "";
      if (typeof prize.classId === "string" && prize.classId && prize.classId !== studentClassId) {
        throw new functions.https.HttpsError("failed-precondition", "This prize is not available for this student.");
      }

      const teacherIds = Array.isArray(prize.teacherIds)
        ? prize.teacherIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        : typeof prize.teacherId === "string" && prize.teacherId
          ? [prize.teacherId]
          : [];
      if (teacherIds.length > 0) {
        const studentTeacherIds = Array.isArray(student.teacherIds)
          ? student.teacherIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
          : [];
        let matchesTeacher = teacherIds.some((id: string) => studentTeacherIds.includes(id));
        if (!matchesTeacher && studentClassId) {
          const classRef = db.collection("schools").doc(schoolId).collection("classes").doc(studentClassId);
          const classSnap = await tx.get(classRef);
          const primaryTeacherId = classSnap.exists ? classSnap.data()?.primaryTeacherId : null;
          matchesTeacher = typeof primaryTeacherId === "string" && teacherIds.includes(primaryTeacherId);
        }
        if (!matchesTeacher) {
          throw new functions.https.HttpsError("failed-precondition", "This prize is not available for this student.");
        }
      }

      const activityRef = studentRef.collection("activities").doc();
      let voucherScanCode: string | undefined;
      if (issuePickupVoucher) {
        voucherScanCode = generateVoucherScanCode();
        const lookupRef = db
          .collection("schools")
          .doc(schoolId)
          .collection("prizeVoucherByCode")
          .doc(voucherScanCode);
        tx.set(lookupRef, {
          voucherScanCode,
          studentId,
          activityId: activityRef.id,
          prizeId,
          prizeName: String(prize.name || "Prize"),
          quantity,
          redeemedAt,
          fulfilled: false,
        });
      }

      const activityData: Record<string, unknown> = {
        desc: `Redeemed: ${String(prize.name || "Prize")}${quantity > 1 ? ` (x${quantity})` : ""}${issuePickupVoucher ? " (pickup voucher)" : ""}`,
        amount: -totalCost,
        date: redeemedAt,
        fulfilled: markFulfilled,
      };
      if (teacherIds[0]) activityData.teacherId = teacherIds[0];
      if (issuePickupVoucher && voucherScanCode) {
        activityData.pickupVoucher = true;
        activityData.voucherScanCode = voucherScanCode;
        activityData.prizeId = prizeId;
      }

      tx.update(studentRef, { points: studentPoints - totalCost });
      tx.set(activityRef, activityData);

      if (typeof prize.stockCount === "number") {
        const nextStock = prize.stockCount - quantity;
        tx.update(prizeRef, {
          stockCount: Math.max(0, nextStock),
          inStock: nextStock > 0,
        });
      }

      return { activityId: activityRef.id, totalCost, voucherScanCode };
    });

    return {
      success: true,
      activityId: result.activityId,
      redeemedAt,
      totalCost: result.totalCost,
      voucherScanCode: result.voucherScanCode,
      message: "Redeemed successfully",
    };
  }
);

/** Callable: scan printed pickup voucher (VR…) at a separate kiosk and mark fulfilled. */
exports.fulfillPrizeVoucherServer = functions
  .runWith(HOT_KIOSK_FUNCTION_OPTIONS)
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.voucherScanCode, "voucherScanCode");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const rawCode = String(data.voucherScanCode).trim().toUpperCase().replace(/^\*+|\*+$/g, "");
    if (!rawCode.startsWith("VR") || rawCode.length < 8) {
      throw new functions.https.HttpsError("invalid-argument", "Not a pickup voucher barcode.");
    }

    const db = admin.firestore();
    if (!(await hasKioskMembershipOrStaff(schoolId, context, ["admin", "teacher", "prizeClerk"]))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }

    const expectedStudentId =
      typeof data.expectedStudentId === "string" && data.expectedStudentId.trim()
        ? data.expectedStudentId.trim()
        : null;

    const lookupRef = db.collection("schools").doc(schoolId).collection("prizeVoucherByCode").doc(rawCode);
    const lookupSnap = await lookupRef.get();
    if (!lookupSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Voucher not found.");
    }
    const lookup = lookupSnap.data() as any;
    if (expectedStudentId && lookup.studentId !== expectedStudentId) {
      throw new functions.https.HttpsError("failed-precondition", "This voucher belongs to another student.");
    }
    if (lookup.fulfilled === true) {
      return {
        success: true,
        status: "already_fulfilled",
        prizeId: lookup.prizeId,
        prizeName: lookup.prizeName,
      };
    }

    const studentId = String(lookup.studentId);
    const activityId = String(lookup.activityId);
    const activityRef = db
      .collection("schools")
      .doc(schoolId)
      .collection("students")
      .doc(studentId)
      .collection("activities")
      .doc(activityId);

    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(lookupRef);
      if (!fresh.exists || fresh.data()?.fulfilled === true) return;
      tx.update(activityRef, { fulfilled: true });
      tx.update(lookupRef, { fulfilled: true });
    });

    return {
      success: true,
      status: "fulfilled",
      studentId,
      activityId,
      prizeId: lookup.prizeId,
      prizeName: lookup.prizeName,
      quantity: lookup.quantity ?? 1,
    };
  });

/** Callable: sync offline pending coupon redemptions. */
exports.syncPendingRedemptions = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    if (!Array.isArray(data.items)) {
      throw new functions.https.HttpsError("invalid-argument", "items must be an array");
    }
    const schoolId = String(data.schoolId).trim().toLowerCase();

    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const db = admin.firestore();

    const out: Array<{ id: string; status: "confirmed" | "rejected"; message?: string }> = [];
    for (const it of data.items as any[]) {
      const id = String(it?.id || "");
      const studentId = String(it?.studentId || "");
      const couponCode = String(it?.couponCode || "").toUpperCase();
      if (!id || !studentId || !couponCode) continue;
      try {
        await redeemCouponForStudent(db, schoolId, studentId, couponCode);
        out.push({ id, status: "confirmed" });
      } catch (e: any) {
        out.push({ id, status: "rejected", message: String(e?.message || "Failed to sync") });
      }
    }
    return { results: out };
  }
);

// ========================================================================
// Callable: download coupon snapshot for kiosk offline validation
// ========================================================================

exports.getCouponSnapshot = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const schoolId = String(data.schoolId).trim().toLowerCase();

    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const db = admin.firestore();

    const snap = await db.collection("schools").doc(schoolId).collection("coupons").get();
    const now = Date.now();
    const coupons: any[] = [];
    for (const d of snap.docs) {
      const c = d.data() as any;
      if (c.used === true) continue;
      if (c.expiresAt && typeof c.expiresAt === "number" && now > c.expiresAt) continue;
      coupons.push({
        code: String(c.code || d.id).toUpperCase(),
        value: typeof c.value === "number" ? c.value : Number(c.value || 0),
        category: typeof c.category === "string" ? c.category : undefined,
        startsAt: typeof c.startsAt === "number" ? c.startsAt : undefined,
        expiresAt: typeof c.expiresAt === "number" ? c.expiresAt : undefined,
        redemptionScope: typeof c.redemptionScope === "string" ? c.redemptionScope : undefined,
        createdByTeacherId: typeof c.createdByTeacherId === "string" ? c.createdByTeacherId : undefined,
        allowedClassIds: Array.isArray(c.allowedClassIds) ? c.allowedClassIds : undefined,
        allowedTeacherIds: Array.isArray(c.allowedTeacherIds) ? c.allowedTeacherIds : undefined,
      });
    }
    return { updatedAt: now, coupons };
  }
);

function formatLocalDateParts(now: number, timeZone?: string): { full: string; monthDay: string } {
  const d = new Date(now);
  let year = String(d.getFullYear());
  let month = String(d.getMonth() + 1).padStart(2, "0");
  let day = String(d.getDate()).padStart(2, "0");
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(d);
      year = parts.find((p) => p.type === "year")?.value || year;
      month = parts.find((p) => p.type === "month")?.value || month;
      day = parts.find((p) => p.type === "day")?.value || day;
    } catch {
      // Fall back to the runtime local date if the stored time zone is invalid.
    }
  }
  return { full: `${year}-${month}-${day}`, monthDay: `${month}-${day}` };
}

/** Callable: award birthday/special-day points without client Firestore writes. */
exports.awardSpecialDayPoints = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }

    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(schoolId);
    const studentRef = schoolRef.collection("students").doc(studentId);
    const attendanceRef = schoolRef.collection("attendance").doc("config");
    const now = Date.now();

    const result = await db.runTransaction(async (tx) => {
      const [schoolSnap, studentSnap, attendanceSnap] = await Promise.all([
        tx.get(schoolRef),
        tx.get(studentRef),
        tx.get(attendanceRef),
      ]);
      if (!schoolSnap.exists) throw new functions.https.HttpsError("not-found", "School not found.");
      if (!studentSnap.exists) throw new functions.https.HttpsError("not-found", "Student not found.");

      const settings = (schoolSnap.data()?.appSettings || {}) as any;
      const attendanceConfig = attendanceSnap.exists ? (attendanceSnap.data() || {}) : {};
      const timeZone = typeof attendanceConfig.attendanceTimeZone === "string"
        ? attendanceConfig.attendanceTimeZone.trim()
        : undefined;
      const today = formatLocalDateParts(now, timeZone);
      const student = studentSnap.data() as any;
      const lastAwarded = student.lastSpecialDayAwarded && typeof student.lastSpecialDayAwarded === "object"
        ? { ...(student.lastSpecialDayAwarded as Record<string, string>) }
        : {};
      const awards: Array<{ desc: string; amount: number }> = [];

      if (settings.enableBirthdayPoints === true && typeof student.birthday === "string") {
        const birthMD = student.birthday.length >= 10 ? student.birthday.substring(5, 10) : "";
        const amount = Number(settings.birthdayPointsAmount || 0);
        if (birthMD === today.monthDay && lastAwarded.birthday !== today.full && amount > 0) {
          awards.push({ desc: `Happy Birthday! 🎂 (+${amount} pts)`, amount });
          lastAwarded.birthday = today.full;

          // Auto-post a celebration to the school bulletin board (deduped by deterministic id).
          const studentName = [trimmedString(student.firstName), trimmedString(student.lastName)].filter(Boolean).join(" ").trim() || "A student";
          const postId = `birthday_${studentId}_${today.full}`;
          tx.set(schoolRef.collection("bulletinBoardPosts").doc(postId), {
            id: postId,
            kind: "birthday",
            emoji: "🎂",
            title: "Birthday Celebration",
            message: `Happy Birthday to ${studentName}!`,
            studentId,
            studentName,
            date: today.full,
            createdAt: now,
            updatedAt: now,
          }, { merge: true });
        }
      }

      const totalAward = awards.reduce((sum, award) => sum + award.amount, 0);
      if (totalAward <= 0) return { totalAward: 0, awards: [] as Array<{ desc: string; amount: number }> };

      tx.update(studentRef, {
        points: Number(student.points || 0) + totalAward,
        lifetimePoints: Number(student.lifetimePoints || 0) + totalAward,
        lastSpecialDayAwarded: lastAwarded,
      });
      for (const award of awards) {
        tx.set(studentRef.collection("activities").doc(), {
          desc: award.desc,
          amount: award.amount,
          date: now,
        });
      }
      return { totalAward, awards };
    });

    return { success: true, ...result };
  }
);

// ========================================================================
// Callable: Upload school logo (server-side to avoid client Storage hangs)
// ========================================================================

const LOGO_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
const STUDENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const STUDENT_PHOTO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const STUDENT_CUSTOM_EMOJI_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const STUDENT_CUSTOM_EMOJI_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

exports.uploadSchoolLogo = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      requireAuth(context);
      requireString(data.schoolId, "schoolId");
      const schoolId = String(data.schoolId).trim().toLowerCase();

      await requireSchoolAdmin(schoolId, context);

      if (typeof data.imageBase64 !== "string" || data.imageBase64.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "imageBase64 is required.");
      }
      const contentType =
        typeof data.contentType === "string" ? data.contentType.trim().toLowerCase() : "";
      if (!LOGO_ALLOWED_TYPES.includes(contentType)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "contentType must be image/png, image/jpeg, image/webp, or image/svg+xml."
        );
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(data.imageBase64, "base64");
      } catch {
        throw new functions.https.HttpsError("invalid-argument", "Invalid base64 image data.");
      }
      if (buffer.length > LOGO_MAX_BYTES) {
        throw new functions.https.HttpsError("invalid-argument", "Image must be under 10MB.");
      }

      const bucket = admin.storage().bucket();
      const timestamp = Date.now();
      const path = `school-logos/${schoolId}-${timestamp}`;
      const file = bucket.file(path);

      const downloadToken = crypto.randomUUID();
      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        validation: false,
      });

      // Use Firebase Storage download-token URL (does not require URL signing).
      // https://firebase.google.com/docs/storage/web/download-files#download_data_via_url
      const encodedPath = encodeURIComponent(path);
      const logoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

      try {
        const db = admin.firestore();
        const logoHistoryEntry = {
          url: logoUrl,
          uploadedAt: Date.now(),
          uploadedBy: context.auth!.uid,
        };
        await db.collection("schools").doc(schoolId).update({
          logoUrl,
          logoHistory: FieldValue.arrayUnion(logoHistoryEntry),
        });
        await db.collection("schoolPublic").doc(schoolId).set(
          {
            active: true,
            logoUrl,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error("uploadSchoolLogo: firestore update failed", e);
        throw new functions.https.HttpsError(
          "internal",
          "Logo uploaded, but failed to save the logo URL to the school record."
        );
      }

      return { logoUrl };
    } catch (e: any) {
      // Preserve explicit HttpsErrors so the client gets a useful code/message.
      if (e instanceof functions.https.HttpsError) throw e;
      console.error("uploadSchoolLogo: unexpected error", e);
      throw new functions.https.HttpsError(
        "internal",
        "Unexpected error while uploading logo.",
        { originalMessage: String(e?.message || e) }
      );
    }
  }
);

// ========================================================================
// Callable: Upload app-wide logo (for all schools)
// ========================================================================

exports.uploadAppLogo = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      requireAuth(context);

      // Only developers may modify the global app logo.
      if (!(await isDeveloper(context))) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Developer access required to upload the app logo."
        );
      }

      if (typeof data.imageBase64 !== "string" || data.imageBase64.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "imageBase64 is required.");
      }
      const contentType =
        typeof data.contentType === "string" ? data.contentType.trim().toLowerCase() : "";
      if (!LOGO_ALLOWED_TYPES.includes(contentType)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "contentType must be image/png, image/jpeg, image/webp, or image/svg+xml."
        );
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(data.imageBase64, "base64");
      } catch {
        throw new functions.https.HttpsError("invalid-argument", "Invalid base64 image data.");
      }
      if (buffer.length > LOGO_MAX_BYTES) {
        throw new functions.https.HttpsError("invalid-argument", "Image must be under 10MB.");
      }

      const bucket = admin.storage().bucket();
      const timestamp = Date.now();
      const path = `app-branding/app-logo-${timestamp}`;
      const file = bucket.file(path);

      const downloadToken = crypto.randomUUID();
      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        validation: false,
      });

      const encodedPath = encodeURIComponent(path);
      const logoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

      try {
        const db = admin.firestore();
        await db.collection("appConfig").doc("global").set(
          {
            appLogoUrl: logoUrl,
            appLogoHistory: FieldValue.arrayUnion({
              url: logoUrl,
              uploadedAt: Date.now(),
              uploadedBy: context.auth!.uid,
            }),
            updatedAt: Date.now(),
            updatedBy: context.auth!.uid,
          },
          { merge: true }
        );
      } catch (e) {
        console.error("uploadAppLogo: firestore update failed", e);
        throw new functions.https.HttpsError(
          "internal",
          "Logo uploaded, but failed to save the logo URL to app configuration."
        );
      }

      return { logoUrl };
    } catch (e: any) {
      if (e instanceof functions.https.HttpsError) throw e;
      console.error("uploadAppLogo: unexpected error", e);
      throw new functions.https.HttpsError(
        "internal",
        "Unexpected error while uploading app logo.",
        { originalMessage: String(e?.message || e) }
      );
    }
  }
);

// ========================================================================
// Callable: Set app logo URL (e.g. restore from history)
// ========================================================================

exports.setAppLogoUrl = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      requireAuth(context);

      // Only developers may modify the global app logo URL.
      if (!(await isDeveloper(context))) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Developer access required to set the app logo URL."
        );
      }

      const url = typeof data?.url === "string" ? data.url.trim() : "";
      if (!url) {
        throw new functions.https.HttpsError("invalid-argument", "url is required.");
      }
      const db = admin.firestore();
      await db.collection("appConfig").doc("global").set(
        {
          appLogoUrl: url,
          updatedAt: Date.now(),
          updatedBy: context.auth!.uid,
        },
        { merge: true }
      );
      return { success: true, logoUrl: url };
    } catch (e: any) {
      if (e instanceof functions.https.HttpsError) throw e;
      console.error("setAppLogoUrl error", e);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to set app logo URL.",
        { originalMessage: String(e?.message || e) }
      );
    }
  }
);

// ========================================================================
// Callable: Upload student profile photo (admin only)
// ========================================================================

exports.uploadStudentPhoto = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      requireAuth(context);
      requireString(data.schoolId, "schoolId");
      requireString(data.studentId, "studentId");
      const schoolId = String(data.schoolId).trim().toLowerCase();
      const studentId = String(data.studentId).trim();

      await requireSchoolAdmin(schoolId, context);

      if (typeof data.imageBase64 !== "string" || data.imageBase64.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "imageBase64 is required.");
      }
      const contentType =
        typeof data.contentType === "string" ? data.contentType.trim().toLowerCase() : "";
      if (!STUDENT_PHOTO_ALLOWED_TYPES.includes(contentType)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "contentType must be image/png, image/jpeg, or image/webp."
        );
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(data.imageBase64, "base64");
      } catch {
        throw new functions.https.HttpsError("invalid-argument", "Invalid base64 image data.");
      }
      if (buffer.length > STUDENT_PHOTO_MAX_BYTES) {
        throw new functions.https.HttpsError("invalid-argument", "Image must be under 5MB.");
      }

      const bucket = admin.storage().bucket();
      const path = `student-photos/${schoolId}/${studentId}`;
      const file = bucket.file(path);

      const downloadToken = crypto.randomUUID();
      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        validation: false,
      });

      const encodedPath = encodeURIComponent(path);
      const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

      const db = admin.firestore();
      await db.collection("schools").doc(schoolId).collection("students").doc(studentId).update({ photoUrl });

      return { photoUrl };
    } catch (e: any) {
      if (e instanceof functions.https.HttpsError) throw e;
      console.error("uploadStudentPhoto: unexpected error", e);
      throw new functions.https.HttpsError(
        "internal",
        "Unexpected error while uploading student photo.",
        { originalMessage: String(e?.message || e) }
      );
    }
  }
);

/** Callable: admin uploads a student sticker/emoji image (same auth as profile photo). */
exports.uploadStudentCustomEmoji = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      requireAuth(context);
      requireString(data.schoolId, "schoolId");
      requireString(data.studentId, "studentId");
      const schoolId = String(data.schoolId).trim().toLowerCase();
      const studentId = String(data.studentId).trim();

      await requireSchoolAdmin(schoolId, context);

      const db = admin.firestore();
      const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
      const studentSnap = await studentRef.get();
      if (!studentSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Student not found.");
      }

      if (typeof data.imageBase64 !== "string" || data.imageBase64.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "imageBase64 is required.");
      }
      const contentType =
        typeof data.contentType === "string" ? data.contentType.trim().toLowerCase() : "";
      if (!STUDENT_CUSTOM_EMOJI_ALLOWED_TYPES.includes(contentType)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "contentType must be image/png, image/jpeg, image/webp, or image/gif."
        );
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(data.imageBase64, "base64");
      } catch {
        throw new functions.https.HttpsError("invalid-argument", "Invalid base64 image data.");
      }
      if (buffer.length > STUDENT_CUSTOM_EMOJI_MAX_BYTES) {
        throw new functions.https.HttpsError("invalid-argument", "Image must be under 2MB.");
      }

      const bucket = admin.storage().bucket();
      const path = `student-custom-emojis/${schoolId}/${studentId}`;
      const file = bucket.file(path);

      const downloadToken = crypto.randomUUID();
      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
        validation: false,
      });

      const encodedPath = encodeURIComponent(path);
      const customEmojiUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

      await studentRef.update({ customEmojiUrl });

      return { customEmojiUrl };
    } catch (e: any) {
      if (e instanceof functions.https.HttpsError) throw e;
      console.error("uploadStudentCustomEmoji: unexpected error", e);
      throw new functions.https.HttpsError(
        "internal",
        "Unexpected error while uploading student emoji.",
        { originalMessage: String(e?.message || e) }
      );
    }
  }
);

// ========================================================================
// Callable: Verify teacher username and passcode
// ========================================================================

exports.verifyTeacherPasscode = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const passcode = typeof data.passcode === "string" ? String(data.passcode).trim() : "";
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    const uid = context.auth!.uid;
    const teacherRoleRef = db.collection("schools").doc(schoolId).collection("roles_teacher").doc(uid);
    const existingTeacher = await teacherRoleRef.get();

    if (passcode.length === 0) {
      if (isGoogleAuthenticated(context) && existingTeacher.exists && existingTeacher.data()?.role === "teacher") {
        return { success: true };
      }
      throw new functions.https.HttpsError("invalid-argument", "A valid passcode is required.");
    }

    requireString(data.username, "username");

    // Find teacher by username in the teachers subcollection
    const teachersSnap = await db.collection("schools").doc(schoolId).collection("teachers")
      .where("username", "==", data.username)
      .limit(1)
      .get();

    if (teachersSnap.empty) {
      throw new functions.https.HttpsError("not-found", "Teacher not found.");
    }

    const teacherDoc = teachersSnap.docs[0];
    const teacherData = teacherDoc.data();

    // Check if the passcode matches
    if (teacherData.passcode !== passcode) {
      throw new functions.https.HttpsError("permission-denied", "Invalid teacher passcode.");
    }

    // Provision only the teacher role. Firestore rules grant narrow teacher
    // permissions from this document instead of relying on admin escalation.
    await teacherRoleRef.set({ role: 'teacher', teacherId: teacherDoc.id });

    return { success: true };
  }
);

// ========================================================================
// Callable: Staff portal login options (safe public directory)
// ========================================================================

exports.getStaffPortalLoginOptions = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(schoolId);
    const schoolDoc = await schoolRef.get();

    if (!schoolDoc.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const [teachersSnap, staffSnap] = await Promise.all([
      schoolRef.collection("teachers").get(),
      schoolRef.collection("staffAccounts").get(),
    ]);

    const teachers = teachersSnap.docs
      .map((docSnap) => {
        const row = docSnap.data() as { name?: string; username?: string };
        const name = typeof row.name === "string" ? row.name.trim() : "";
        const username = typeof row.username === "string" && row.username.trim()
          ? row.username.trim()
          : docSnap.id;
        if (!name || !username) return null;
        return {
          id: docSnap.id,
          type: "teacher" as const,
          label: name,
          username,
        };
      })
      .filter(Boolean);

    const staff = staffSnap.docs
      .map((docSnap) => {
        const row = docSnap.data() as {
          displayName?: string;
          username?: string;
          role?: string;
        };
        const role =
          row.role === "secretary" || row.role === "prizeClerk" || row.role === "reports" || row.role === "librarian" || row.role === "office"
            ? row.role
            : null;
        const username = typeof row.username === "string" ? row.username.trim().toLowerCase() : "";
        const displayName = typeof row.displayName === "string" ? row.displayName.trim() : "";
        if (!role || !username || !displayName) return null;
        return {
          id: docSnap.id,
          type: role,
          label: displayName,
          username,
        };
      })
      .filter(Boolean);

    return { options: [...teachers, ...staff] };
  }
);

// ========================================================================
// Callable: Verify staff (secretary / prize clerk / reports) username + passcode
// ========================================================================

exports.verifyStaffAccountPasscode = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const passcode = typeof data.passcode === "string" ? String(data.passcode).trim() : "";
    const role = data.role as string;
    if (role !== "secretary" && role !== "prizeClerk" && role !== "reports" && role !== "librarian" && role !== "office" && role !== "houseCoordinator") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "role must be 'secretary', 'prizeClerk', 'reports', 'librarian', 'office', or 'houseCoordinator'."
      );
    }

    const db = admin.firestore();
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const uid = context.auth!.uid;
    const roleCollection =
      role === "secretary"
        ? "roles_secretary"
        : role === "prizeClerk"
          ? "roles_prizeClerk"
          : role === "librarian"
            ? "roles_librarian"
            : role === "office"
              ? "roles_office"
              : role === "houseCoordinator"
                ? "roles_houseCoordinator"
                : "roles_reports";
    const existingRoleRef = db.collection("schools").doc(schoolId).collection(roleCollection).doc(uid);
    const existingRole = await existingRoleRef.get();

    if (passcode.length === 0) {
      if (isGoogleAuthenticated(context) && existingRole.exists && existingRole.data()?.role === role) {
        return { success: true, displayName: role, roles: [role] };
      }
      requireString(data.username, "username");
      throw new functions.https.HttpsError("invalid-argument", "A valid passcode is required.");
    }

    requireString(data.username, "username");
    const username = String(data.username).trim().toLowerCase();

    let accountsSnap = await db
      .collection("schools")
      .doc(schoolId)
      .collection("staffAccounts")
      .where("username", "==", username)
      .limit(5)
      .get();

    if (accountsSnap.empty) {
      const allAccountsSnap = await db
        .collection("schools")
        .doc(schoolId)
        .collection("staffAccounts")
        .get();

      const matchedDocs = allAccountsSnap.docs.filter((d) => {
        const u = String(d.data()?.username || "").trim().toLowerCase();
        return u === username;
      });

      if (matchedDocs.length > 0) {
        accountsSnap = {
          docs: matchedDocs,
          empty: false,
          size: matchedDocs.length,
        } as any;
      }
    }

    const match = accountsSnap.docs.find((d) => {
      const row = d.data() as { passcode?: string; role?: string; roles?: string[] };
      const roles = Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role];
      const dbPasscode = row.passcode !== undefined && row.passcode !== null ? String(row.passcode).trim() : "";
      const inputPasscode = passcode !== undefined && passcode !== null ? String(passcode).trim() : "";
      return roles.includes(role) && dbPasscode === inputPasscode;
    });

    if (!match) {
      throw new functions.https.HttpsError("permission-denied", "Invalid staff login.");
    }

    const row = match.data() as { displayName?: string; role?: string; roles?: string[] };
    const roles = (Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role])
      .filter((item): item is string => item === "secretary" || item === "prizeClerk" || item === "reports" || item === "librarian" || item === "office" || item === "houseCoordinator");
    const writes = roles.map((staffRole) => {
      const roleCollection =
        staffRole === "secretary"
          ? "roles_secretary"
          : staffRole === "prizeClerk"
            ? "roles_prizeClerk"
            : staffRole === "librarian"
              ? "roles_librarian"
              : staffRole === "office"
                ? "roles_office"
              : staffRole === "houseCoordinator"
                ? "roles_houseCoordinator"
                : "roles_reports";
      return db
        .collection("schools")
        .doc(schoolId)
        .collection(roleCollection)
        .doc(context.auth!.uid)
        .set({ role: staffRole });
    });
    const displayName =
      typeof row.displayName === "string" && row.displayName.trim().length > 0
        ? row.displayName.trim()
        : username;

    await Promise.all(writes);

    return { success: true, displayName, roles };
  }
);

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

async function findDuplicateFaceEnrollment(
  db: admin.firestore.Firestore,
  schoolId: string,
  descriptor: FaceDescriptor,
  exceptStudentId: string
): Promise<{ studentId: string; score: number } | null> {
  const snap = await db
    .collection("schools")
    .doc(schoolId)
    .collection("faceAuth")
    .where("enabled", "==", true)
    .limit(500)
    .get();

  let best: { studentId: string; score: number } | null = null;
  for (const doc of snap.docs) {
    if (doc.id === exceptStudentId) continue;
    const list = descriptorRecordsFrom(doc.data()?.descriptors);
    if (list.length === 0) continue;
    for (const cand of list) {
      const score = cosineSimilarity(descriptor, cand.values);
      if (score >= FACE_DUPLICATE_ENROLL_THRESHOLD && (!best || score > best.score)) {
        best = { studentId: doc.id, score };
      }
    }
  }
  return best;
}

exports.checkStudentFaceDuplicate = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireDescriptor(data.descriptor, "descriptor");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const descriptor = data.descriptor as FaceDescriptor;

    const db = admin.firestore();
    if (!(await hasSchoolRole(schoolId, context.auth!.uid, ["admin"]))) {
      if (!(await isDeveloper(context))) {
        throw new functions.https.HttpsError("permission-denied", "Admin privileges required for this school.");
      }
    }

    const duplicate = await findDuplicateFaceEnrollment(db, schoolId, descriptor, studentId);
    if (!duplicate) {
      return { duplicate: false };
    }
    return {
      duplicate: true,
      matchedStudentId: duplicate.studentId,
      confidence: duplicate.score,
    };
  }
);

exports.enrollStudentFace = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireDescriptor(data.descriptor, "descriptor");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const descriptor = data.descriptor as FaceDescriptor;
    const allowDuplicate = data.allowDuplicate === true;

    const db = admin.firestore();
    if (!(await hasSchoolRole(schoolId, context.auth!.uid, ["admin"]))) {
      if (!(await isDeveloper(context))) {
        throw new functions.https.HttpsError("permission-denied", "Admin privileges required for this school.");
      }
    }

    const duplicate = await findDuplicateFaceEnrollment(db, schoolId, descriptor, studentId);
    if (duplicate && !allowDuplicate) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `This face is already enrolled for student ${duplicate.studentId}.`,
        { matchedStudentId: duplicate.studentId, confidence: duplicate.score }
      );
    }

    const ref = db.collection("schools").doc(schoolId).collection("faceAuth").doc(studentId);
    const snap = await ref.get();

    const prev = snap.exists ? snap.data() : null;
    const prevDescriptors = descriptorRecordsFrom(prev?.descriptors);
    const nextDescriptors = [...prevDescriptors, { values: descriptor }].slice(-3); // keep last 3

    await ref.set(
      {
        enabled: true,
        descriptors: nextDescriptors,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return { success: true, count: nextDescriptors.length };
  }
);

exports.deleteStudentFace = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();

    const db = admin.firestore();
    const uid = context.auth!.uid;
    const mayManageFace = (await hasSchoolRole(schoolId, uid, ["admin", "teacher"])) || (await isDeveloper(context));
    if (!mayManageFace) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const ref = db.collection("schools").doc(schoolId).collection("faceAuth").doc(studentId);
    await ref.set({ enabled: false, descriptors: [], updatedAt: Date.now() }, { merge: true });
    return { success: true };
  }
);

exports.matchStudentFace = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireDescriptor(data.descriptor, "descriptor");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const descriptor = data.descriptor as FaceDescriptor;

    const db = admin.firestore();
    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const snap = await db
      .collection("schools")
      .doc(schoolId)
      .collection("faceAuth")
      .where("enabled", "==", true)
      .limit(500)
      .get();

    /** Best cosine match per student (max over their stored descriptor scans). */
    const perStudent: { studentId: string; score: number }[] = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      const list = descriptorRecordsFrom(d.descriptors);
      if (list.length === 0) continue;
      let bestForStudent = -1;
      for (const cand of list) {
        const score = cosineSimilarity(descriptor, cand.values);
        if (score > bestForStudent) bestForStudent = score;
      }
      perStudent.push({ studentId: doc.id, score: bestForStudent });
    }
    perStudent.sort((a, b) => b.score - a.score);

    const top = perStudent[0];
    const second = perStudent[1];

    // Conservative threshold for "convenience-grade" matching.
    // Higher = fewer false positives, more fallbacks.
    const threshold = 0.9;
    // If two enrolled students score nearly the same, do not pick a winner — reduces
    // "closest student wins" mistakes (open-set: a stranger can still match one spike
    // above threshold; raising threshold or adding NFC/PIN is the remaining lever).
    const minMarginSecondStudent = 0.04;

    if (!top || top.score < threshold) {
      return { studentId: null, confidence: top?.score ?? -1 };
    }
    // Only treat as ambiguous when the runner-up also clears the match threshold.
    // Stale/orphan enrollments that score high-but-below-threshold should not block
    // a clear winner (common on demo schools after partial resets).
    if (
      second &&
      second.score >= threshold &&
      top.score - second.score < minMarginSecondStudent
    ) {
      return { studentId: null, confidence: top.score, ambiguous: true };
    }
    return { studentId: top.studentId, confidence: top.score };
  });

exports.listSchoolFaceEnrollments = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const schoolId = String(data.schoolId).trim().toLowerCase();

    const mayView =
      (await hasSchoolRole(schoolId, context.auth!.uid, ["admin", "teacher"])) ||
      (await isDeveloper(context));
    if (!mayView) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "School staff privileges required for this school."
      );
    }

    const db = admin.firestore();
    const snap = await db.collection("schools").doc(schoolId).collection("faceAuth").get();
    const enrollments: {
      studentId: string;
      enabled: boolean;
      scanCount: number;
      updatedAt: number | null;
    }[] = [];

    for (const doc of snap.docs) {
      const d = doc.data();
      const descriptors = descriptorRecordsFrom(d?.descriptors);
      enrollments.push({
        studentId: doc.id,
        enabled: d?.enabled === true,
        scanCount: descriptors.length,
        updatedAt: typeof d?.updatedAt === "number" ? d.updatedAt : null,
      });
    }
    enrollments.sort((a, b) => a.studentId.localeCompare(b.studentId, undefined, { numeric: true }));
    return { enrollments };
  }
);

exports.devClearSampleSchoolFaceAuth = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    if (!(await isDeveloper(context))) {
      throw new functions.https.HttpsError("permission-denied", "Developer privileges required.");
    }

    const schoolId = String(data.schoolId).trim().toLowerCase();
    if (schoolId !== "schoolabc" && schoolId !== "yeshiva") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        'Face auth clear is only allowed for sample schools "schoolabc" and "yeshiva".'
      );
    }

    const exceptStudentIds = Array.isArray(data.exceptStudentIds)
      ? data.exceptStudentIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];
    const keep = new Set(exceptStudentIds);

    const db = admin.firestore();
    const snap = await db.collection("schools").doc(schoolId).collection("faceAuth").get();
    const batch = db.batch();
    let cleared = 0;
    for (const doc of snap.docs) {
      if (keep.has(doc.id)) continue;
      batch.delete(doc.ref);
      cleared += 1;
    }
    if (cleared > 0) await batch.commit();

    return { cleared, keptStudentIds: exceptStudentIds };
  }
);

exports.getStudentFaceAuthStatus = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();

    // Admin-only: status is used in the admin student modal.
    await requireSchoolAdmin(schoolId, context);

    const db = admin.firestore();
    const ref = db.collection("schools").doc(schoolId).collection("faceAuth").doc(studentId);
    const snap = await ref.get();
    const d = snap.exists ? snap.data() : null;
    const descriptors = descriptorRecordsFrom(d?.descriptors);
    const scanCount = descriptors.length;
    return {
      enrolled: scanCount > 0,
      scanCount,
      updatedAt: typeof d?.updatedAt === "number" ? d!.updatedAt : null,
      autoLogin: typeof d?.autoLogin === "boolean" ? d!.autoLogin : true,
      enabled: typeof d?.enabled === "boolean" ? d!.enabled : false,
    };
  }
);

exports.setStudentFaceAutoLogin = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    const autoLogin = typeof data.autoLogin === "boolean" ? data.autoLogin : null;
    if (autoLogin === null) {
      throw new functions.https.HttpsError("invalid-argument", "autoLogin must be a boolean.");
    }

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();

    await requireSchoolAdmin(schoolId, context);

    const db = admin.firestore();
    const ref = db.collection("schools").doc(schoolId).collection("faceAuth").doc(studentId);
    await ref.set({ autoLogin, updatedAt: Date.now() }, { merge: true });
    return { success: true };
  }
);

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

function numericOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

async function queueStaffInventoryAlerts(args: {
  db: admin.firestore.Firestore;
  schoolId: string;
  subject: string;
  message: string;
  html?: string;
  fromEmail: string;
  whatsappEnabled?: boolean;
}): Promise<void> {
  const { db, schoolId, subject, message, html, fromEmail, whatsappEnabled } = args;
  const alerts: Promise<any>[] = [];

  const [teachersSnap, staffSnap] = await Promise.all([
    db.collection("schools").doc(schoolId).collection("teachers").get(),
    db.collection("schools").doc(schoolId).collection("staffAccounts").get(),
  ]);

  for (const d of teachersSnap.docs) {
    const data = d.data();
    const email = decryptField(data?.email);
    const phone = decryptField(data?.phone);
    queueContactAlerts({
      alerts,
      db,
      email,
      phone: whatsappEnabled ? phone : undefined,
      subject,
      message,
      html,
      fromEmail,
      schoolId,
      whatsappEnabled,
    });
  }

  for (const d of staffSnap.docs) {
    const data = d.data();
    const email = decryptField(data?.email);
    const phone = decryptField(data?.phone);
    queueContactAlerts({
      alerts,
      db,
      email,
      phone: whatsappEnabled ? phone : undefined,
      subject,
      message,
      html,
      fromEmail,
      schoolId,
      whatsappEnabled,
    });
  }

  await Promise.all(alerts);
}

/** Triggered when a student earns points or redeems a prize. */
export const onStudentActivityCreated = functions.firestore
  .document("schools/{schoolId}/students/{studentId}/activities/{activityId}")
  .onCreate(async (snapshot, context) => {
    const { schoolId, studentId } = context.params;
    const activityData = snapshot.data();
    if (!activityData) return;

    const db = admin.firestore();
    
    // Check school settings
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const settings = schoolSnap.data()?.appSettings;
    
    if (!settings?.enableNotifications) {
      return;
    }

    // Get student data
    const studentSnap = await db.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
    const studentData = studentSnap.data();
    if (!studentData) return;

    const prefs =
      studentData.notificationPrefs && typeof studentData.notificationPrefs === "object"
        ? (studentData.notificationPrefs as Record<string, unknown>)
        : {};
    const parentNotifEnabled = prefs.parentEnabled !== false;
    const studentNotifEnabled = prefs.studentEnabled !== false;

    const studentName = [studentData.firstName, studentData.lastName].filter(Boolean).join(" ") || "A student";
    const isRedemption = activityData.amount < 0;
    const amountAbs = Math.abs(activityData.amount);
    const desc = String(activityData.desc || "");
    const isAchievement = desc.startsWith("Achievement earned:");
    const isBadge = desc.startsWith("Badge earned:");
    const isMilestone = isAchievement || isBadge;
    const isLibraryCheckout = /^Checked out library item:/i.test(desc);
    const isLibraryReturn = /^Returned library item:/i.test(desc);
    const isLibraryEvent = isLibraryCheckout || isLibraryReturn;

    if (isLibraryEvent) {
      // Library pillar + dedicated toggle gate library activity notifications.
      if (settings.payLibrary === false) return;
      if (!settings.notificationLibraryEnabled) return;
    } else {
      if (isMilestone && settings.notificationMilestonesEnabled === false) return;
      if (!isMilestone && !settings.notificationRewardsEnabled) return;
    }
    
    const unlockedName = desc.replace(/^Achievement earned:\s*/i, "").replace(/^Badge earned:\s*/i, "").trim();
    const subject = isLibraryEvent
      ? (isLibraryCheckout ? "Library Checkout Alert" : "Library Return Alert")
      : isBadge
      ? "Badge Unlocked"
      : isAchievement
        ? "Milestone Unlocked"
        : isRedemption
          ? "Reward Redemption Alert"
          : "Point Award Alert";
    const message = isLibraryEvent
      ? `${studentName} ${isLibraryCheckout ? "checked out" : "returned"}: ${desc.replace(/^Checked out library item:\s*/i, "").replace(/^Returned library item:\s*/i, "").trim() || "a library item"}.`
      : isMilestone
      ? `${studentName} unlocked ${unlockedName || "a new achievement"}${amountAbs ? ` and earned ${amountAbs} bonus points` : ""}.`
      : isRedemption
        ? `${studentName} just redeemed ${amountAbs} points for: ${desc}`
        : `${studentName} just earned ${amountAbs} points for: ${desc}`;

    const alerts: Promise<any>[] = [];

    const pEmail = decryptField(studentData.parentEmail);
    const pPhone = decryptField(studentData.parentPhone);
    const sEmail = decryptField(studentData.studentEmail);
    const sPhone = decryptField(studentData.studentPhone);

    const schoolName = schoolSnap.data()?.name || "School";
    const fromEmail = `"${schoolName} Alerts" <alerts@levelup-edu.com>`;
    const html = buildCelebrationEmailHtml({
      title: isMilestone ? unlockedName || subject : subject,
      subtitle: isLibraryEvent
        ? (isLibraryCheckout ? "Library checkout" : "Library return")
        : isBadge ? "Badge unlocked" : isAchievement ? "Milestone reached" : isRedemption ? "Reward redeemed" : "Points earned",
      message,
      studentName,
      accent: isLibraryEvent ? "#4f46e5" : isBadge ? "#f59e0b" : isAchievement ? "#2563eb" : isRedemption ? "#db2777" : "#16a34a",
      icon: isLibraryEvent ? "B" : isBadge ? "*" : isAchievement ? "T" : isRedemption ? "!" : "+",
      showArtwork: settings.notificationArtworkEnabled !== false && isMilestone,
    });

    if (parentNotifEnabled) {
      queueContactAlerts({
        alerts, db, email: pEmail, phone: pPhone, subject: `${subject}: ${studentName}`,
        message, html, fromEmail, schoolId, studentId, whatsappEnabled: settings.notificationWhatsAppEnabled,
      });
    }
    if (settings.notificationStudentsEnabled && studentNotifEnabled) {
      queueContactAlerts({
        alerts, db, email: sEmail, phone: sPhone, subject,
        message, html, fromEmail, schoolId, studentId, whatsappEnabled: settings.notificationWhatsAppEnabled,
      });
    }

    // Notify Staff if enabled
    if (settings.notificationStaffAlertsEnabled) {
      const teacherIds = studentData.teacherIds || [];
      for (const tid of teacherIds) {
        const tSnap = await db.collection("schools").doc(schoolId).collection("teachers").doc(tid).get();
        const tData = tSnap.data();
        const tEmail = decryptField(tData?.email);
        const tPhone = decryptField(tData?.phone);

        queueContactAlerts({
          alerts, db, email: tEmail, phone: settings.notificationWhatsAppEnabled ? tPhone : undefined,
          subject: `Staff Alert: ${studentName}`,
          message: `Staff Alert: ${message}`,
          fromEmail,
          schoolId,
          whatsappEnabled: settings.notificationWhatsAppEnabled,
        });
      }
    }

    await Promise.all(alerts);
  });

/**
 * Triggered when a prize is edited or redeemed (stockCount changes).
 * Sends staff alerts when stock is low or the shop becomes empty.
 */
export const onPrizeUpdated = functions.firestore
  .document("schools/{schoolId}/prizes/{prizeId}")
  .onUpdate(async (change, context) => {
    const { schoolId } = context.params;
    const before = change.before.data() as Record<string, any> | undefined;
    const after = change.after.data() as Record<string, any> | undefined;
    if (!after) return;

    const db = admin.firestore();
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const settings = schoolSnap.data()?.appSettings as Record<string, any> | undefined;
    if (!settings?.enableNotifications) return;
    if (!settings?.notificationStaffAlertsEnabled) return;
    if (!settings?.notificationPrizeInventoryEnabled) return;

    const schoolName = schoolSnap.data()?.name || "School";
    const fromEmail = `"${schoolName} Alerts" <alerts@levelup-edu.com>`;
    const whatsappEnabled = !!settings.notificationWhatsAppEnabled;

    const afterCount = numericOrNull(after.stockCount);
    const beforeCount = numericOrNull(before?.stockCount);
    const thresholdRaw = numericOrNull(settings.notificationPrizeLowStockThreshold);
    const threshold = thresholdRaw === null ? 5 : Math.max(0, Math.floor(thresholdRaw));
    const name = String(after.name || "Prize").trim() || "Prize";
    const inStock = after.inStock !== false;

    const alertsToSend: Array<Promise<void>> = [];

    // Low stock / out of stock: only when a finite count exists and crosses into threshold.
    if (afterCount !== null && inStock) {
      const crossedIntoLow =
        afterCount <= threshold &&
        (beforeCount === null || beforeCount > threshold) &&
        (beforeCount === null || beforeCount !== afterCount);
      const crossedIntoZero =
        afterCount === 0 && (beforeCount === null || beforeCount > 0) && (beforeCount === null || beforeCount !== afterCount);

      if (crossedIntoLow || crossedIntoZero) {
        const subject = crossedIntoZero ? `Inventory alert: Out of stock (${name})` : `Inventory alert: Low stock (${name})`;
        const message =
          crossedIntoZero
            ? `Rewards shop inventory alert: "${name}" is out of stock (0 left).`
            : `Rewards shop inventory alert: "${name}" is low (only ${afterCount} left).`;
        const html = buildCelebrationEmailHtml({
          title: crossedIntoZero ? "Out of stock" : "Low stock",
          subtitle: "Rewards shop inventory",
          message,
          studentName: schoolName,
          accent: crossedIntoZero ? "#ef4444" : "#f59e0b",
          icon: crossedIntoZero ? "!" : "i",
          showArtwork: false,
        });
        alertsToSend.push(
          queueStaffInventoryAlerts({
            db,
            schoolId,
            subject,
            message,
            html,
            fromEmail,
            whatsappEnabled,
          })
        );
      }
    }

    // Shop empty: only when enabled, and rate-limited.
    if (settings.notificationPrizeEmptyShopEnabled) {
      const lastEmptyAt = numericOrNull(settings.inventoryLastEmptyShopAlertAt);
      const now = Date.now();
      const cooldownMs = 6 * 60 * 60 * 1000; // 6 hours
      const cooldownOk = lastEmptyAt === null ? true : now - lastEmptyAt > cooldownMs;

      if (cooldownOk) {
        const snap = await db.collection("schools").doc(schoolId).collection("prizes").get();
        const prizes = snap.docs.map((d) => d.data() as Record<string, any>);
        const available = prizes.some((p) => {
          const listed = p?.inStock !== false;
          const c = numericOrNull(p?.stockCount);
          const countOk = c === null ? true : c > 0;
          return listed && countOk;
        });

        if (!available) {
          const subject = "Inventory alert: Rewards shop is empty";
          const message = `Rewards shop inventory alert: there are currently no prizes available to redeem (all are out of stock or not listed).`;
          const html = buildCelebrationEmailHtml({
            title: "Rewards shop empty",
            subtitle: "Rewards shop inventory",
            message,
            studentName: schoolName,
            accent: "#f97316",
            icon: "!",
            showArtwork: false,
          });
          alertsToSend.push(
            queueStaffInventoryAlerts({
              db,
              schoolId,
              subject,
              message,
              html,
              fromEmail,
              whatsappEnabled,
            })
          );
          await db.collection("schools").doc(schoolId).set(
            { appSettings: { inventoryLastEmptyShopAlertAt: now } },
            { merge: true }
          );
        }
      }
    }

    await Promise.all(alertsToSend);
  });

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

/** Callable: list recent mail queue rows for a school (Admin SDK; bypasses client Firestore rules on `mail`). */
exports.adminListMailQueue = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  requireAuth(context);
  requireString(data.schoolId, "schoolId");
  const schoolId = String(data.schoolId).trim().toLowerCase();

  if (!(await isDeveloper(context))) {
    await requireSchoolAdmin(schoolId, context);
  }

  const limitRaw = data.limit;
  const limitN =
    typeof limitRaw === "number" && limitRaw > 0 && limitRaw <= 100
      ? Math.floor(limitRaw)
      : 40;

  const db = admin.firestore();
  const snap = await db.collection("mail").where("schoolId", "==", schoolId).limit(limitN).get();

  const items = snap.docs.map((d) => {
    const v = d.data() as Record<string, unknown>;
    const message = v.message as { subject?: string } | undefined;
    const delivery = v.delivery as
      | {
          state?: string;
          error?: string;
          message?: string;
          attempts?: number;
          startTime?: unknown;
          endTime?: unknown;
        }
      | undefined;
    const subj = message?.subject != null ? String(message.subject) : "";
    const deliveryState =
      delivery?.state != null
        ? String(delivery.state)
        : typeof v.state === "string"
          ? v.state
          : "";
    const deliveryError =
      delivery?.error != null
        ? String(delivery.error)
        : typeof v.error === "string"
          ? v.error
          : "";
    const deliveryMessage =
      delivery?.message != null
        ? String(delivery.message)
        : typeof v.deliveryMessage === "string"
          ? v.deliveryMessage
          : "";
    const deliveryAttempts =
      typeof delivery?.attempts === "number" && Number.isFinite(delivery.attempts)
        ? Math.max(0, Math.floor(delivery.attempts))
        : null;
    const toMillisMaybe = (ts: unknown): number | null => {
      if (!ts) return null;
      if (typeof ts === "number" && Number.isFinite(ts)) return Math.floor(ts);
      if (typeof ts === "object" && ts) {
        const anyTs = ts as any;
        if (typeof anyTs.toMillis === "function") return Number(anyTs.toMillis());
        const seconds = typeof anyTs.seconds === "number" ? anyTs.seconds : null;
        const nanos = typeof anyTs.nanoseconds === "number" ? anyTs.nanoseconds : 0;
        if (seconds != null && Number.isFinite(seconds) && Number.isFinite(nanos)) {
          return Math.floor(seconds * 1000 + nanos / 1_000_000);
        }
      }
      return null;
    };
    const deliveryStartTimeMs = toMillisMaybe(delivery?.startTime);
    const deliveryEndTimeMs = toMillisMaybe(delivery?.endTime);
    const del = deliveryState || deliveryError || deliveryMessage || "queued";
    const to = v.to;
    const toStr = typeof to === "string" ? to.trim() : "";
    let toMasked = "—";
    if (toStr) {
      const at = toStr.indexOf("@");
      toMasked = at < 1 ? `${toStr.slice(0, 2)}…` : `${toStr.slice(0, 2)}***${toStr.slice(at)}`;
    }
    return {
      id: d.id,
      createdAtMs: d.createTime ? d.createTime.toMillis() : null,
      toMasked,
      subject: subj || "—",
      delivery: del,
      deliveryState: deliveryState || null,
      deliveryAttempts,
      deliveryError: deliveryError || null,
      deliveryMessage: deliveryMessage || null,
      deliveryStartTimeMs,
      deliveryEndTimeMs,
      studentId: typeof v.studentId === "string" ? v.studentId : undefined,
    };
  });

  return { items };
});

/** Callable: build a preview of a notification email without enqueuing delivery. */
exports.adminPreviewTestNotification = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  requireAuth(context);
  requireString(data.schoolId, "schoolId");
  requireString(data.studentId, "studentId");
  requireString(data.template, "template");
  const schoolId = String(data.schoolId).trim().toLowerCase();
  const studentId = String(data.studentId).trim();

  if (!(await isDeveloper(context))) {
    await requireSchoolAdmin(schoolId, context);
  }

  const template = String(data.template).trim();
  const db = admin.firestore();
  const [schoolSnap, studentSnap] = await Promise.all([
    db.collection("schools").doc(schoolId).get(),
    db.collection("schools").doc(schoolId).collection("students").doc(studentId).get(),
  ]);
  if (!studentSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Student not found");
  }
  const studentData = studentSnap.data() || {};

  const studentName =
    [studentData.firstName, studentData.lastName].filter(Boolean).join(" ") || studentData.nickname || "A student";

  let subject = "Test Notification";
  let subtitle = "Test alert";
  let message = `${studentName} triggered a test notification.`;
  let accent = "#2563eb";
  let icon = "T";
  let showArtwork = true;

  if (template === "reward_redemption") {
    subject = `Reward Redemption Alert: ${studentName}`;
    subtitle = "Reward redeemed";
    message = `${studentName} just redeemed 10 points for: Test prize.`;
    accent = "#db2777";
    icon = "!";
    showArtwork = false;
  } else if (template === "points_award") {
    subject = `Point Award Alert: ${studentName}`;
    subtitle = "Points earned";
    message = `${studentName} just earned 5 points for: Test activity.`;
    accent = "#16a34a";
    icon = "+";
    showArtwork = false;
  } else if (template === "milestone") {
    subject = `Milestone Unlocked: ${studentName}`;
    subtitle = "Milestone reached";
    message = `${studentName} unlocked Monthly Champion and earned 25 bonus points.`;
    accent = "#2563eb";
    icon = "T";
    showArtwork = true;
  } else if (template === "attendance") {
    subject = `Attendance Alert: ${studentName}`;
    subtitle = "Class sign-in";
    message = `${studentName} signed in for Period 1 at ${new Date().toLocaleTimeString()}.`;
    accent = "#10b981";
    icon = "OK";
    showArtwork = false;
  } else if (template === "library_checkout") {
    subject = `Library Checkout Alert: ${studentName}`;
    subtitle = "Library checkout";
    message = `${studentName} checked out: Test book.`;
    accent = "#4f46e5";
    icon = "B";
    showArtwork = false;
  } else if (template === "library_return") {
    subject = `Library Return Alert: ${studentName}`;
    subtitle = "Library return";
    message = `${studentName} returned: Test book.`;
    accent = "#4f46e5";
    icon = "B";
    showArtwork = false;
  } else {
    throw new functions.https.HttpsError("invalid-argument", "Unknown template");
  }

  const settings = schoolSnap.data()?.appSettings || {};
  const schoolName = schoolSnap.data()?.name || "School";
  const fromEmail = `"${schoolName} Alerts" <alerts@levelup-edu.com>`;
  const html = buildCelebrationEmailHtml({
    title: subject.replace(/:\s*.*$/, ""),
    subtitle,
    message,
    studentName,
    accent,
    icon,
    showArtwork: settings.notificationArtworkEnabled !== false && showArtwork,
  });

  const toParent = decryptField(studentData.parentEmail) || "";
  const toStudent = decryptField(studentData.studentEmail) || "";

  return {
    subject,
    fromEmail,
    html,
    text: message,
    to: {
      parentEmail: toParent ? maskRecipient(toParent) : "—",
      studentEmail: toStudent ? maskRecipient(toStudent) : "—",
    },
  };
});

/** Callable: enqueue a test notification email into the Trigger Email queue. */
exports.adminSendTestNotification = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  requireAuth(context);
  requireString(data.schoolId, "schoolId");
  requireString(data.studentId, "studentId");
  requireString(data.template, "template");
  const schoolId = String(data.schoolId).trim().toLowerCase();
  const studentId = String(data.studentId).trim();

  if (!(await isDeveloper(context))) {
    await requireSchoolAdmin(schoolId, context);
  }

  const recipientRaw = typeof data.recipient === "string" ? data.recipient : "parent";
  const recipient = recipientRaw === "student" ? "student" : "parent";

  const preview = await (exports.adminPreviewTestNotification as any)({ ...data, schoolId, studentId }, context);
  const db = admin.firestore();

  const studentSnap = await db.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
  const studentData = studentSnap.data() || {};
  const toEmail =
    recipient === "student" ? decryptField(studentData.studentEmail) : decryptField(studentData.parentEmail);
  if (!toEmail) {
    throw new functions.https.HttpsError("failed-precondition", `No ${recipient} email on student record.`);
  }

  const docRef = await db.collection("mail").add({
    to: toEmail,
    from: preview.fromEmail,
    message: {
      subject: preview.subject,
      text: preview.text,
      html: preview.html,
    },
    schoolId,
    studentId,
    test: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { mailDocId: docRef.id };
});

/**
 * Weekly parent digest (Sunday 15:00 America/New_York — Eastern Time, DST-aware).
 * Sends email/SMS to parents who opted in on the student record when
 * `notificationParentWeeklyDigestEnabled` is on for the school.
 */
exports.scheduledParentWeeklyDigest = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("0 15 * * 0")
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = admin.firestore();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const schoolsSnap = await db.collection("schools").get();

    for (const schoolDoc of schoolsSnap.docs) {
      const schoolId = schoolDoc.id;
      const appSettings = schoolDoc.data()?.appSettings as Record<string, any> | undefined;
      if (!appSettings?.enableNotifications) continue;
      if (!appSettings?.notificationParentWeeklyDigestEnabled) continue;

      const schoolName = String(schoolDoc.data()?.name || "School").trim() || "School";
      const fromEmail = `"${schoolName} Rewards" <alerts@levelup-edu.com>`;
      const whatsappEnabled = !!appSettings.notificationWhatsAppEnabled;

      const studentsSnap = await db.collection("schools").doc(schoolId).collection("students").get();

      for (const st of studentsSnap.docs) {
        const studentId = st.id;
        const studentData = st.data() || {};
        const prefs = (studentData.notificationPrefs || {}) as Record<string, any>;
        if (prefs.parentWeeklyDigest !== true) continue;
        if (prefs.parentEnabled === false) continue;

        const parentEmail = decryptField(studentData.parentEmail);
        const parentPhone = decryptField(studentData.parentPhone);
        if (!parentEmail && !parentPhone) continue;

        let earned = 0;
        let spent = 0;
        let redemptions = 0;
        const lines: string[] = [];

        try {
          const actSnap = await db
            .collection("schools")
            .doc(schoolId)
            .collection("students")
            .doc(studentId)
            .collection("activities")
            .orderBy("date", "desc")
            .limit(120)
            .get();

          for (const ad of actSnap.docs) {
            const a = ad.data() as Record<string, any>;
            const d = typeof a.date === "number" ? a.date : 0;
            if (d < weekAgo) continue;
            const amt = typeof a.amount === "number" ? a.amount : 0;
            if (amt > 0) earned += amt;
            else if (amt < 0) {
              spent += -amt;
              const desc = String(a.desc || "");
              if (/redeemed/i.test(desc)) redemptions += 1;
            }
            if (lines.length < 10) {
              lines.push(
                `${new Date(d).toLocaleDateString()}: ${String(a.desc || "Activity")} (${amt > 0 ? "+" : ""}${amt} pts)`,
              );
            }
          }
        } catch (e) {
          functions.logger.warn("parentWeeklyDigest activities read failed", { schoolId, studentId, err: String(e) });
          continue;
        }

        const firstName = String(studentData.firstName || "Student").trim() || "Student";
        const message =
          `Weekly summary for ${firstName}: points gained +${earned}, points spent ${spent}, prize redemptions ${redemptions}.` +
          (lines.length ? `\n\nRecent activity:\n${lines.join("\n")}` : "");

        const html = buildCelebrationEmailHtml({
          title: "Weekly rewards summary",
          subtitle: schoolName,
          message,
          studentName: firstName,
          accent: "#2563eb",
          icon: "📅",
          showArtwork: false,
        });

        const alerts: Promise<any>[] = [];
        queueContactAlerts({
          alerts,
          db,
          email: parentEmail || undefined,
          phone: parentPhone || undefined,
          subject: `${schoolName}: Weekly rewards summary`,
          message,
          html,
          fromEmail,
          schoolId,
          studentId,
          whatsappEnabled,
        });
        await Promise.all(alerts);
      }
    }

    functions.logger.info("scheduledParentWeeklyDigest completed");
    return null;
  });

// Note: onStudentActivityCreated and onAttendanceLogCreated are exported via
// `export const` above (ES module syntax). No duplicate CommonJS assignment needed.
