import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
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
    // Primary: email allowlist from env var. Fallback: Firestore developer UID list
    // (survives env var misconfiguration / missing deploys).
    const googleAdminBypass =
      isAllowedGoogleAdminBypass(context) ||
      (isGoogleAuthenticated(context) && await isDeveloper(context));

    if (!googleAdminBypass) {
      if (passcode.length === 0) {
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
  try {
    const doc = await db.collection("appConfig").doc("developerAllowlist").get();
    if (!doc.exists) return false;
    const data = doc.data();
    return Array.isArray(data?.uids) && data!.uids.includes(context.auth.uid);
  } catch (e) {
    return false;
  }
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

/** Callable: add current user to developer allow-list (allowed Google accounts only). */
exports.addDeveloperMe = functions.https.onCall(
  async (_data: any, context: functions.https.CallableContext) => {
    requireAuth(context);

    const email = (context.auth?.token?.email ?? "").trim().toLowerCase();
    const allowlistStr = process.env.DEVELOPER_GOOGLE_EMAIL_ALLOWLIST || process.env.NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST || "";
    const allowlist = allowlistStr.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

    // Use the identity-aware check so an anonymous session linked to Google
    // (sign_in_provider stays "anonymous", but firebase.identities has google.com)
    // is accepted on the first sign-in instead of forcing a second attempt.
    const isGoogleDev =
      isGoogleAuthenticated(context) && email && isAllowedGoogleEmailOnAllowlist(email, allowlist);

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
