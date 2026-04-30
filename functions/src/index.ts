import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { signInAttendance } from "./signInAttendance";
import { studentMayRedeemCouponData } from "./couponRedemption";
import { decryptField } from "./crypto";

admin.initializeApp();

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
  const currentPasscode = currentSnap.exists ? currentSnap.data()?.passcode : null;

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
  .pubsub.schedule("every 24 hours")
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

    if (typeof data.passcode !== "string" || data.passcode.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "A valid passcode is required.");
    }

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    const schoolDoc = await db.collection("schools").doc(schoolId).get();

    if (!schoolDoc.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const schoolData = schoolDoc.data()!;
    if (schoolData.passcode !== data.passcode) {
      throw new functions.https.HttpsError("permission-denied", "Invalid passcode.");
    }

    // Provision admin role using the Admin SDK (path must match client: schools/{schoolId}/roles_admin/{uid})
    const adminRoleRef = db.collection("schools").doc(schoolId).collection("roles_admin").doc(context.auth!.uid);
    await adminRoleRef.set({ role: 'admin' });

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

/** Callable: add current user to developer allow-list after verifying dev passcode. */
exports.addDeveloperMe = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    if (typeof data.passcode !== "string" || data.passcode.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "passcode is required.");
    }
    const devPasscode = process.env.DEV_PASSCODE;
    if (!devPasscode || data.passcode !== devPasscode) {
      throw new functions.https.HttpsError("permission-denied", "Invalid developer passcode.");
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
    const providedPasscode = typeof data.passcode === "string" ? data.passcode.trim() : "";
    const defaultPasscode = Math.floor(1000 + Math.random() * 9000).toString();

    const schoolDocData: Record<string, any> = {
      name: providedName || cleanId,
      updatedAt: now,
      passcode: providedPasscode || defaultPasscode,
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
      passcode: providedPasscode || existing.passcode || schoolDocData.passcode,
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
      passcode: finalSchoolDocData.passcode,
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
      const expected = secretSnap.exists ? String(secretSnap.data()?.code ?? "") : "";
      if (!expected || expected !== code) {
        throw new functions.https.HttpsError("permission-denied", "Invalid school code.");
      }
    }

    const uid = context.auth!.uid;
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(uid);
    await memberRef.set({ createdAt: Date.now() }, { merge: true });
    return { success: true };
  }
);

/** Callable: kiosk-safe student lookup by badge/card id. */
exports.lookupStudentByBadge = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.badgeId, "badgeId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const badgeId = String(data.badgeId).trim();

    const db = admin.firestore();
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(context.auth!.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }

    const studentsRef = db.collection("schools").doc(schoolId).collection("students");

    const byDoc = await studentsRef.doc(badgeId).get();
    if (byDoc.exists) return { studentId: byDoc.id };

    const byStr = await studentsRef.where("nfcId", "==", badgeId).limit(1).get();
    if (!byStr.empty) return { studentId: byStr.docs[0].id };

    if (/^\d+$/.test(badgeId)) {
      const asNum = Number(badgeId);
      if (Number.isFinite(asNum)) {
        const byNum = await studentsRef.where("nfcId", "==", asNum).limit(1).get();
        if (!byNum.empty) return { studentId: byNum.docs[0].id };
      }
    }

    return { studentId: null };
  }
);

/** Callable: redeem coupon (server-authoritative; kiosk-safe). */
exports.redeemCouponServer = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireString(data.couponCode, "couponCode");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const couponCode = String(data.couponCode).trim().toUpperCase();

    const db = admin.firestore();
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(context.auth!.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }

    const couponRef = db.collection("schools").doc(schoolId).collection("coupons").doc(couponCode);
    const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
    const now = Date.now();

    const result = await db.runTransaction(async (tx) => {
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
        const classRef = db.collection("schools").doc(schoolId).collection("classes").doc(classId);
        const classSnap = await tx.get(classRef);
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

      tx.update(studentRef, {
        points: Number(s.points || 0) + value,
        lifetimePoints: Number(s.lifetimePoints || 0) + value,
      });

      const activityRef = studentRef.collection("activities").doc();
      const cat = String(coupon.category || "Coupon");
      const code = String(coupon.code || couponCode);
      tx.set(activityRef, { desc: `Redeemed coupon: ${code} (${cat})`, amount: value, date: now });

      tx.update(couponRef, { used: true, usedAt: now, usedBy: studentId });
      return { value };
    });

    return { success: true, message: "Redeemed successfully", value: result.value };
  }
);

/** Callable: sync offline pending coupon redemptions. */
exports.syncPendingRedemptions = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    if (!Array.isArray(data.items)) {
      throw new functions.https.HttpsError("invalid-argument", "items must be an array");
    }
    const schoolId = String(data.schoolId).trim().toLowerCase();

    const db = admin.firestore();
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(context.auth!.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }

    const out: Array<{ id: string; status: "confirmed" | "rejected"; message?: string }> = [];
    for (const it of data.items as any[]) {
      const id = String(it?.id || "");
      const studentId = String(it?.studentId || "");
      const couponCode = String(it?.couponCode || "").toUpperCase();
      if (!id || !studentId || !couponCode) continue;
      try {
        const couponRef = db.collection("schools").doc(schoolId).collection("coupons").doc(couponCode);
        const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
        const now = Date.now();
        await db.runTransaction(async (tx) => {
          const couponSnap = await tx.get(couponRef);
          if (!couponSnap.exists) throw new functions.https.HttpsError("not-found", "Coupon code not found.");
          const coupon = couponSnap.data() as any;
          if (coupon.startsAt && typeof coupon.startsAt === "number" && now < coupon.startsAt) {
            throw new functions.https.HttpsError("failed-precondition", "This coupon is not valid yet.");
          }
          if (coupon.expiresAt && typeof coupon.expiresAt === "number" && now > coupon.expiresAt) {
            throw new functions.https.HttpsError("failed-precondition", "This coupon has expired.");
          }
          if (coupon.used === true) throw new functions.https.HttpsError("failed-precondition", "This coupon has already been used.");
          const studentSnap = await tx.get(studentRef);
          if (!studentSnap.exists) throw new functions.https.HttpsError("not-found", "Student not found.");
          const s = studentSnap.data() as any;
          const classId = typeof s.classId === "string" ? s.classId : "";
          let classPrimaryTeacherId: string | null = null;
          if (classId) {
            const classRef = db.collection("schools").doc(schoolId).collection("classes").doc(classId);
            const classSnap = await tx.get(classRef);
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
          tx.update(studentRef, { points: Number(s.points || 0) + value, lifetimePoints: Number(s.lifetimePoints || 0) + value });
          const activityRef = studentRef.collection("activities").doc();
          const cat = String(coupon.category || "Coupon");
          const code = String(coupon.code || couponCode);
          tx.set(activityRef, { desc: `Redeemed coupon: ${code} (${cat})`, amount: value, date: now });
          tx.update(couponRef, { used: true, usedAt: now, usedBy: studentId });
        });
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

    const db = admin.firestore();
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(context.auth!.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }

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

// ========================================================================
// Callable: Upload school logo (server-side to avoid client Storage hangs)
// ========================================================================

const LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
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
          "contentType must be image/png, image/jpeg, or image/webp."
        );
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(data.imageBase64, "base64");
      } catch {
        throw new functions.https.HttpsError("invalid-argument", "Invalid base64 image data.");
      }
      if (buffer.length > LOGO_MAX_BYTES) {
        throw new functions.https.HttpsError("invalid-argument", "Image must be under 5MB.");
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
          "contentType must be image/png, image/jpeg, or image/webp."
        );
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(data.imageBase64, "base64");
      } catch {
        throw new functions.https.HttpsError("invalid-argument", "Invalid base64 image data.");
      }
      if (buffer.length > LOGO_MAX_BYTES) {
        throw new functions.https.HttpsError("invalid-argument", "Image must be under 5MB.");
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
    requireString(data.username, "username");
    requireString(data.passcode, "passcode");

    const db = admin.firestore();

    // Find teacher by username in the teachers subcollection
    const teachersSnap = await db.collection("schools").doc(data.schoolId).collection("teachers")
      .where("username", "==", data.username)
      .limit(1)
      .get();

    if (teachersSnap.empty) {
      throw new functions.https.HttpsError("not-found", "Teacher not found.");
    }

    const teacherDoc = teachersSnap.docs[0];
    const teacherData = teacherDoc.data();

    // Check if the passcode matches
    if (teacherData.passcode !== data.passcode) {
      throw new functions.https.HttpsError("permission-denied", "Invalid teacher passcode.");
    }

    // Provision only the teacher role. Firestore rules grant narrow teacher
    // permissions from this document instead of relying on admin escalation.
    const teacherRoleRef = db.collection("schools").doc(data.schoolId).collection("roles_teacher").doc(context.auth!.uid);

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
          row.role === "secretary" || row.role === "prizeClerk" || row.role === "reports"
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
    requireString(data.username, "username");
    requireString(data.passcode, "passcode");
    const role = data.role as string;
    if (role !== "secretary" && role !== "prizeClerk" && role !== "reports") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "role must be 'secretary', 'prizeClerk', or 'reports'."
      );
    }

    const db = admin.firestore();
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const username = String(data.username).trim().toLowerCase();

    const accountsSnap = await db
      .collection("schools")
      .doc(schoolId)
      .collection("staffAccounts")
      .where("username", "==", username)
      .limit(5)
      .get();

    const match = accountsSnap.docs.find((d) => {
      const row = d.data() as { passcode?: string; role?: string; roles?: string[] };
      const roles = Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role];
      return roles.includes(role) && row.passcode === data.passcode;
    });

    if (!match) {
      throw new functions.https.HttpsError("permission-denied", "Invalid staff login.");
    }

    const row = match.data() as { displayName?: string; role?: string; roles?: string[] };
    const roles = (Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role])
      .filter((item): item is string => item === "secretary" || item === "prizeClerk" || item === "reports");
    const writes = roles.map((staffRole) => {
      const roleCollection =
        staffRole === "secretary"
          ? "roles_secretary"
          : staffRole === "prizeClerk"
            ? "roles_prizeClerk"
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

function requireDescriptor(value: unknown, name: string): asserts value is FaceDescriptor {
  if (!Array.isArray(value) || value.length !== 128) {
    throw new functions.https.HttpsError("invalid-argument", `${name} must be a 128-length number array.`);
  }
  for (const n of value) {
    if (typeof n !== "number" || !Number.isFinite(n)) {
      throw new functions.https.HttpsError("invalid-argument", `${name} must contain only finite numbers.`);
    }
  }
}

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

exports.enrollStudentFace = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireDescriptor(data.descriptor, "descriptor");

    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const descriptor = data.descriptor as FaceDescriptor;

    const db = admin.firestore();
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
    const snap = await db
      .collection("schools")
      .doc(schoolId)
      .collection("faceAuth")
      .where("enabled", "==", true)
      .limit(500)
      .get();

    let bestStudentId = "";
    let bestScore = -1;

    for (const doc of snap.docs) {
      const d = doc.data();
      const list = descriptorRecordsFrom(d.descriptors);
      for (const cand of list) {
        const score = cosineSimilarity(descriptor, cand.values);
        if (score > bestScore) {
          bestScore = score;
          bestStudentId = doc.id;
        }
      }
    }

    // Conservative threshold for "convenience-grade" matching.
    // Higher = fewer false positives, more fallbacks.
    const threshold = 0.9;
    if (!bestStudentId || bestScore < threshold) {
      return { studentId: null, confidence: bestScore };
    }
    return { studentId: bestStudentId, confidence: bestScore };
  });

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

    const studentName = [studentData.firstName, studentData.lastName].filter(Boolean).join(" ") || "A student";
    const isRedemption = activityData.amount < 0;
    const amountAbs = Math.abs(activityData.amount);
    const desc = String(activityData.desc || "");
    const isAchievement = desc.startsWith("Achievement earned:");
    const isBadge = desc.startsWith("Badge earned:");
    const isMilestone = isAchievement || isBadge;

    if (isMilestone && settings.notificationMilestonesEnabled === false) return;
    if (!isMilestone && !settings.notificationRewardsEnabled) return;
    
    const unlockedName = desc.replace(/^Achievement earned:\s*/i, "").replace(/^Badge earned:\s*/i, "").trim();
    const subject = isBadge
      ? "Badge Unlocked"
      : isAchievement
        ? "Milestone Unlocked"
        : isRedemption
          ? "Reward Redemption Alert"
          : "Point Award Alert";
    const message = isMilestone
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
      subtitle: isBadge ? "Badge unlocked" : isAchievement ? "Milestone reached" : isRedemption ? "Reward redeemed" : "Points earned",
      message,
      studentName,
      accent: isBadge ? "#f59e0b" : isAchievement ? "#2563eb" : isRedemption ? "#db2777" : "#16a34a",
      icon: isBadge ? "*" : isAchievement ? "T" : isRedemption ? "!" : "+",
      showArtwork: settings.notificationArtworkEnabled !== false && isMilestone,
    });

    queueContactAlerts({
      alerts, db, email: pEmail, phone: pPhone, subject: `${subject}: ${studentName}`,
      message, html, fromEmail, schoolId, studentId, whatsappEnabled: settings.notificationWhatsAppEnabled,
    });
    if (settings.notificationStudentsEnabled) {
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

    queueContactAlerts({
      alerts, db, email: pEmail, phone: pPhone, subject: `Attendance Alert: ${studentName}`,
      message, html, fromEmail, schoolId, studentId, whatsappEnabled: settings.notificationWhatsAppEnabled,
    });
    if (settings.notificationStudentsEnabled) {
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
    const delivery = v.delivery as { state?: string; error?: string; message?: string } | undefined;
    const subj = message?.subject != null ? String(message.subject) : "";
    const del =
      delivery?.state != null
        ? String(delivery.state)
        : delivery?.error != null
          ? String(delivery.error)
          : delivery?.message != null
            ? String(delivery.message)
            : "";
    const to = v.to;
    const toStr = typeof to === "string" ? to.trim() : "";
    let toMasked = "—";
    if (toStr) {
      const at = toStr.indexOf("@");
      toMasked = at < 1 ? `${toStr.slice(0, 2)}…` : `${toStr.slice(0, 2)}***${toStr.slice(at)}`;
    }
    return {
      id: d.id,
      toMasked,
      subject: subj || "—",
      delivery: del || "—",
      studentId: typeof v.studentId === "string" ? v.studentId : undefined,
    };
  });

  return { items };
});

// Note: onStudentActivityCreated and onAttendanceLogCreated are exported via
// `export const` above (ES module syntax). No duplicate CommonJS assignment needed.
