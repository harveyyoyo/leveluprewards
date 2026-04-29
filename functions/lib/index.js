"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const crypto = require("crypto");
const firestore_1 = require("firebase-admin/firestore");
const signInAttendance_1 = require("./signInAttendance");
const couponRedemption_1 = require("./couponRedemption");
admin.initializeApp();
const SUBCOLLECTIONS = ["students", "classes", "teachers", "categories", "prizes", "coupons"];
const RETENTION_DAYS = 30;
// ========================================================================
// Auth helpers
// ========================================================================
function requireAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
}
async function requireSchoolAdmin(schoolId, context) {
    var _a;
    requireAuth(context);
    requireString(schoolId, "schoolId");
    const db = admin.firestore();
    const roleSnap = await db
        .collection("schools")
        .doc(schoolId)
        .collection("roles_admin")
        .doc(context.auth.uid)
        .get();
    if (!roleSnap.exists || ((_a = roleSnap.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Admin privileges required for this school.");
    }
}
function requireString(value, name) {
    if (typeof value !== "string" || value.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", `A valid ${name} is required.`);
    }
}
// ========================================================================
// Core backup engine
// ========================================================================
async function collectFullSchoolData(schoolId) {
    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(schoolId);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) {
        throw new functions.https.HttpsError("not-found", `School "${schoolId}" not found.`);
    }
    const schoolData = JSON.parse(JSON.stringify(schoolSnap.data()));
    delete schoolData.passcode;
    const counts = {};
    let totalDocs = 1;
    for (const sub of SUBCOLLECTIONS) {
        const snap = await schoolRef.collection(sub).get();
        const items = [];
        counts[sub] = snap.size;
        totalDocs += snap.size;
        for (const d of snap.docs) {
            const item = Object.assign({ id: d.id }, d.data());
            if (sub === "students") {
                const activitiesSnap = await d.ref.collection("activities").get();
                if (activitiesSnap.size > 0) {
                    item._activities = activitiesSnap.docs.map((a) => (Object.assign({ id: a.id }, a.data())));
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
async function performFullBackup(schoolId, type) {
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
    }
    catch (error) {
        const errorMsg = (error === null || error === void 0 ? void 0 : error.message) || "Unknown error";
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
        }
        catch (logErr) {
            console.error("Could not log backup failure:", logErr);
        }
        return { success: false, backupId, error: errorMsg };
    }
}
async function restoreSchoolFromData(schoolId, backupData) {
    var _a;
    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(schoolId);
    const BATCH_LIMIT = 499;
    const currentSnap = await schoolRef.get();
    const currentPasscode = currentSnap.exists ? (_a = currentSnap.data()) === null || _a === void 0 ? void 0 : _a.passcode : null;
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
    const schoolDocData = {};
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
        const items = backupData[`_${sub}`];
        if (!items || items.length === 0)
            continue;
        const ops = [];
        for (const item of items) {
            const itemObj = Object.assign({}, item);
            const itemId = itemObj.id;
            const activities = itemObj._activities;
            delete itemObj.id;
            delete itemObj._activities;
            const docRef = schoolRef.collection(sub).doc(itemId);
            ops.push({ ref: docRef, data: itemObj });
            if (sub === "students" && Array.isArray(activities)) {
                for (const act of activities) {
                    const actObj = Object.assign({}, act);
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
async function pruneOldBackups(schoolId) {
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
                }
                catch (_a) {
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
    .https.onCall(async (data, context) => {
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
    .https.onCall(async (_data, context) => {
    requireAuth(context);
    // This operation is intentionally disabled by default because it can exfiltrate
    // data across all schools via Admin SDK. Re-enable only with an explicit allowlist.
    throw new functions.https.HttpsError("permission-denied", "backupAllSchools is disabled.");
});
// ========================================================================
// Callable: Full restore from backup
// ========================================================================
exports.restoreFromFullBackup = functions
    .runWith({ timeoutSeconds: 540, memory: "512MB" })
    .https.onCall(async (data, context) => {
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
    const backupMeta = backupDoc.data();
    await performFullBackup(schoolId, "pre-restore");
    if (!backupMeta.storagePath) {
        throw new functions.https.HttpsError("failed-precondition", "This backup has no Cloud Storage file and cannot be restored.");
    }
    const bucket = admin.storage().bucket();
    const [fileContents] = await bucket.file(backupMeta.storagePath).download();
    const jsonStr = fileContents.toString("utf8");
    if (backupMeta.sha256) {
        const hash = crypto.createHash("sha256").update(jsonStr).digest("hex");
        if (hash !== backupMeta.sha256) {
            throw new functions.https.HttpsError("data-loss", "Backup integrity check failed — the file may be corrupted.");
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
    .https.onCall(async (data, context) => {
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
    const meta = backupDoc.data();
    if (!meta.storagePath) {
        throw new functions.https.HttpsError("failed-precondition", "This backup has no Cloud Storage file and cannot be downloaded.");
    }
    const bucket = admin.storage().bucket();
    const [fileContents] = await bucket.file(meta.storagePath).download();
    return { data: JSON.parse(fileContents.toString("utf8")), metadata: meta };
});
// ========================================================================
// Callable: Verify backup integrity (SHA-256)
// ========================================================================
exports.verifyBackupIntegrity = functions.https.onCall(async (data, context) => {
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
    const meta = backupDoc.data();
    if (!meta.storagePath || !meta.sha256) {
        throw new functions.https.HttpsError("failed-precondition", "This backup has no Cloud Storage file or integrity hash and cannot be verified.");
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
    }
    catch (error) {
        return { verified: false, reason: `Cannot read backup file: ${error.message}` };
    }
});
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
        }
        else {
            failed++;
        }
    }
    functions.logger.info(`Scheduled backup: ${succeeded} succeeded, ${failed} failed, ${totalPruned} old backups pruned.`);
    return null;
});
// ========================================================================
// Callable: Verify school passcode (used by login and student logout)
// ========================================================================
exports.verifySchoolPasscode = functions.https.onCall(async (data, context) => {
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
    const schoolData = schoolDoc.data();
    if (schoolData.passcode !== data.passcode) {
        throw new functions.https.HttpsError("permission-denied", "Invalid passcode.");
    }
    // Provision admin role using the Admin SDK (path must match client: schools/{schoolId}/roles_admin/{uid})
    const adminRoleRef = db.collection("schools").doc(schoolId).collection("roles_admin").doc(context.auth.uid);
    await adminRoleRef.set({ role: 'admin' });
    return { success: true };
});
// ========================================================================
// Developer allow-list (appConfig/global.developerUids) for attendance etc.
// ========================================================================
const APP_CONFIG_GLOBAL = "global";
async function isDeveloper(context) {
    var _a, _b;
    if (!((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid))
        return false;
    const db = admin.firestore();
    const globalRef = db.collection("appConfig").doc(APP_CONFIG_GLOBAL);
    const snap = await globalRef.get();
    const list = snap.exists ? (_b = snap.data()) === null || _b === void 0 ? void 0 : _b.developerUids : undefined;
    return Array.isArray(list) && list.includes(context.auth.uid);
}
async function requireDeveloper(context) {
    requireAuth(context);
    if (!(await isDeveloper(context))) {
        throw new functions.https.HttpsError("permission-denied", "Developer access is required.");
    }
}
/** Callable: add current user to developer allow-list after verifying dev passcode. */
exports.addDeveloperMe = functions.https.onCall(async (data, context) => {
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
    await globalRef.set({ developerUids: firestore_1.FieldValue.arrayUnion(context.auth.uid) }, { merge: true });
    return { success: true };
});
/** Callable: create or repair a school shell using the Admin SDK. */
exports.createSchoolByDeveloper = functions.https.onCall(async (data, context) => {
    var _a;
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
    const schoolDocData = {
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
    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(cleanId);
    const schoolSnap = await schoolRef.get();
    const studentsSnap = await schoolRef.collection("students").limit(1).get();
    const teachersSnap = await schoolRef.collection("teachers").limit(1).get();
    if (schoolSnap.exists && (!studentsSnap.empty || !teachersSnap.empty)) {
        throw new functions.https.HttpsError("already-exists", `School ID "${cleanId}" already exists.`);
    }
    const existing = schoolSnap.exists ? (_a = schoolSnap.data()) !== null && _a !== void 0 ? _a : {} : {};
    const finalSchoolDocData = Object.assign(Object.assign(Object.assign({}, schoolDocData), existing), { name: providedName || existing.name || schoolDocData.name, passcode: providedPasscode || existing.passcode || schoolDocData.passcode, updatedAt: now, plan: existing.plan || schoolDocData.plan, featureOverrides: existing.featureOverrides || schoolDocData.featureOverrides, hasMigratedStudents: true, hasMigratedClasses: true, hasMigratedTeachers: true, hasMigratedPrizes: true, hasMigratedCoupons: true, hasMigratedCategories: true });
    const batch = db.batch();
    batch.set(schoolRef, finalSchoolDocData, { merge: true });
    if (studentsSnap.empty) {
        const { id } = seedStudent, studentData = __rest(seedStudent, ["id"]);
        batch.set(schoolRef.collection("students").doc(id), studentData);
    }
    if (teachersSnap.empty) {
        const { id } = seedTeacher, teacherData = __rest(seedTeacher, ["id"]);
        batch.set(schoolRef.collection("teachers").doc(id), teacherData);
    }
    batch.set(db.collection("schoolPublic").doc(cleanId), {
        active: true,
        name: finalSchoolDocData.name,
        plan: finalSchoolDocData.plan,
        featureOverrides: finalSchoolDocData.featureOverrides,
        updatedAt: now,
    }, { merge: true });
    await batch.commit();
    return {
        success: true,
        cleanId,
        passcode: finalSchoolDocData.passcode,
        repaired: schoolSnap.exists,
    };
});
/** Callable: set attendance config (allowed for school admin or developer). */
exports.setAttendanceConfig = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        requireAuth(context);
        requireString(data.schoolId, "schoolId");
        const schoolId = String(data.schoolId).trim().toLowerCase();
        const db = admin.firestore();
        let allowed = false;
        try {
            await requireSchoolAdmin(schoolId, context);
            allowed = true;
        }
        catch (_b) {
            if (await isDeveloper(context))
                allowed = true;
        }
        if (!allowed) {
            throw new functions.https.HttpsError("permission-denied", "Admin privileges for this school or developer access required.");
        }
        const config = data.config;
        if (!config || typeof config !== "object") {
            throw new functions.https.HttpsError("invalid-argument", "config object is required.");
        }
        // Sanitize schedule so Firestore never gets undefined (causes internal error)
        const schedule = Array.isArray(config.schedule)
            ? config.schedule.map((s) => {
                var _a, _b, _c, _d;
                return ({
                    id: String((_a = s === null || s === void 0 ? void 0 : s.id) !== null && _a !== void 0 ? _a : ""),
                    label: String((_b = s === null || s === void 0 ? void 0 : s.label) !== null && _b !== void 0 ? _b : ""),
                    startTime: String((_c = s === null || s === void 0 ? void 0 : s.startTime) !== null && _c !== void 0 ? _c : "08:00"),
                    endTime: String((_d = s === null || s === void 0 ? void 0 : s.endTime) !== null && _d !== void 0 ? _d : "08:45"),
                });
            })
            : [];
        // Coerce strings → numbers so values that come through form inputs
        // without explicit `valueAsNumber` don't silently flatten to 0.
        const toFiniteNumber = (v, fallback) => {
            const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
            return Number.isFinite(n) ? n : fallback;
        };
        const payload = {
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
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) && err.code.startsWith("functions/")) {
            throw err;
        }
        functions.logger.warn("setAttendanceConfig error", err);
        throw new functions.https.HttpsError("internal", (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : "Failed to save attendance settings.");
    }
});
// ========================================================================
// Kiosk / school-entry helpers (private school URLs)
// ========================================================================
/** Callable: verify school entry code and grant kiosk membership. */
exports.verifySchoolEntryCode = functions.https.onCall(async (data, context) => {
    var _a, _b;
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
        const expected = secretSnap.exists ? String((_b = (_a = secretSnap.data()) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : "") : "";
        if (!expected || expected !== code) {
            throw new functions.https.HttpsError("permission-denied", "Invalid school code.");
        }
    }
    const uid = context.auth.uid;
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(uid);
    await memberRef.set({ createdAt: Date.now() }, { merge: true });
    return { success: true };
});
/** Callable: kiosk-safe student lookup by badge/card id. */
exports.lookupStudentByBadge = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.badgeId, "badgeId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const badgeId = String(data.badgeId).trim();
    const db = admin.firestore();
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(context.auth.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const studentsRef = db.collection("schools").doc(schoolId).collection("students");
    const byDoc = await studentsRef.doc(badgeId).get();
    if (byDoc.exists)
        return { studentId: byDoc.id };
    const byStr = await studentsRef.where("nfcId", "==", badgeId).limit(1).get();
    if (!byStr.empty)
        return { studentId: byStr.docs[0].id };
    if (/^\d+$/.test(badgeId)) {
        const asNum = Number(badgeId);
        if (Number.isFinite(asNum)) {
            const byNum = await studentsRef.where("nfcId", "==", asNum).limit(1).get();
            if (!byNum.empty)
                return { studentId: byNum.docs[0].id };
        }
    }
    return { studentId: null };
});
/** Callable: redeem coupon (server-authoritative; kiosk-safe). */
exports.redeemCouponServer = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireString(data.couponCode, "couponCode");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const couponCode = String(data.couponCode).trim().toUpperCase();
    const db = admin.firestore();
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(context.auth.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const couponRef = db.collection("schools").doc(schoolId).collection("coupons").doc(couponCode);
    const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
    const now = Date.now();
    const result = await db.runTransaction(async (tx) => {
        const couponSnap = await tx.get(couponRef);
        if (!couponSnap.exists)
            throw new functions.https.HttpsError("not-found", "Coupon code not found.");
        const coupon = couponSnap.data();
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
        if (!studentSnap.exists)
            throw new functions.https.HttpsError("not-found", "Student not found.");
        const s = studentSnap.data();
        const classId = typeof s.classId === "string" ? s.classId : "";
        let classPrimaryTeacherId = null;
        if (classId) {
            const classRef = db.collection("schools").doc(schoolId).collection("classes").doc(classId);
            const classSnap = await tx.get(classRef);
            if (classSnap.exists) {
                const cd = classSnap.data();
                if (typeof cd.primaryTeacherId === "string")
                    classPrimaryTeacherId = cd.primaryTeacherId;
            }
        }
        const gate = (0, couponRedemption_1.studentMayRedeemCouponData)(coupon, s, classPrimaryTeacherId);
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
});
/** Callable: sync offline pending coupon redemptions. */
exports.syncPendingRedemptions = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    if (!Array.isArray(data.items)) {
        throw new functions.https.HttpsError("invalid-argument", "items must be an array");
    }
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(context.auth.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const out = [];
    for (const it of data.items) {
        const id = String((it === null || it === void 0 ? void 0 : it.id) || "");
        const studentId = String((it === null || it === void 0 ? void 0 : it.studentId) || "");
        const couponCode = String((it === null || it === void 0 ? void 0 : it.couponCode) || "").toUpperCase();
        if (!id || !studentId || !couponCode)
            continue;
        try {
            const couponRef = db.collection("schools").doc(schoolId).collection("coupons").doc(couponCode);
            const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
            const now = Date.now();
            await db.runTransaction(async (tx) => {
                const couponSnap = await tx.get(couponRef);
                if (!couponSnap.exists)
                    throw new functions.https.HttpsError("not-found", "Coupon code not found.");
                const coupon = couponSnap.data();
                if (coupon.startsAt && typeof coupon.startsAt === "number" && now < coupon.startsAt) {
                    throw new functions.https.HttpsError("failed-precondition", "This coupon is not valid yet.");
                }
                if (coupon.expiresAt && typeof coupon.expiresAt === "number" && now > coupon.expiresAt) {
                    throw new functions.https.HttpsError("failed-precondition", "This coupon has expired.");
                }
                if (coupon.used === true)
                    throw new functions.https.HttpsError("failed-precondition", "This coupon has already been used.");
                const studentSnap = await tx.get(studentRef);
                if (!studentSnap.exists)
                    throw new functions.https.HttpsError("not-found", "Student not found.");
                const s = studentSnap.data();
                const classId = typeof s.classId === "string" ? s.classId : "";
                let classPrimaryTeacherId = null;
                if (classId) {
                    const classRef = db.collection("schools").doc(schoolId).collection("classes").doc(classId);
                    const classSnap = await tx.get(classRef);
                    if (classSnap.exists) {
                        const cd = classSnap.data();
                        if (typeof cd.primaryTeacherId === "string")
                            classPrimaryTeacherId = cd.primaryTeacherId;
                    }
                }
                const gate = (0, couponRedemption_1.studentMayRedeemCouponData)(coupon, s, classPrimaryTeacherId);
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
        }
        catch (e) {
            out.push({ id, status: "rejected", message: String((e === null || e === void 0 ? void 0 : e.message) || "Failed to sync") });
        }
    }
    return { results: out };
});
// ========================================================================
// Callable: download coupon snapshot for kiosk offline validation
// ========================================================================
exports.getCouponSnapshot = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(context.auth.uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const snap = await db.collection("schools").doc(schoolId).collection("coupons").get();
    const now = Date.now();
    const coupons = [];
    for (const d of snap.docs) {
        const c = d.data();
        if (c.used === true)
            continue;
        if (c.expiresAt && typeof c.expiresAt === "number" && now > c.expiresAt)
            continue;
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
});
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
exports.uploadSchoolLogo = functions.https.onCall(async (data, context) => {
    try {
        requireAuth(context);
        requireString(data.schoolId, "schoolId");
        const schoolId = String(data.schoolId).trim().toLowerCase();
        await requireSchoolAdmin(schoolId, context);
        if (typeof data.imageBase64 !== "string" || data.imageBase64.length === 0) {
            throw new functions.https.HttpsError("invalid-argument", "imageBase64 is required.");
        }
        const contentType = typeof data.contentType === "string" ? data.contentType.trim().toLowerCase() : "";
        if (!LOGO_ALLOWED_TYPES.includes(contentType)) {
            throw new functions.https.HttpsError("invalid-argument", "contentType must be image/png, image/jpeg, or image/webp.");
        }
        let buffer;
        try {
            buffer = Buffer.from(data.imageBase64, "base64");
        }
        catch (_a) {
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
                uploadedBy: context.auth.uid,
            };
            await db.collection("schools").doc(schoolId).update({
                logoUrl,
                logoHistory: firestore_1.FieldValue.arrayUnion(logoHistoryEntry),
            });
            await db.collection("schoolPublic").doc(schoolId).set({
                active: true,
                logoUrl,
                updatedAt: Date.now(),
            }, { merge: true });
        }
        catch (e) {
            console.error("uploadSchoolLogo: firestore update failed", e);
            throw new functions.https.HttpsError("internal", "Logo uploaded, but failed to save the logo URL to the school record.");
        }
        return { logoUrl };
    }
    catch (e) {
        // Preserve explicit HttpsErrors so the client gets a useful code/message.
        if (e instanceof functions.https.HttpsError)
            throw e;
        console.error("uploadSchoolLogo: unexpected error", e);
        throw new functions.https.HttpsError("internal", "Unexpected error while uploading logo.", { originalMessage: String((e === null || e === void 0 ? void 0 : e.message) || e) });
    }
});
// ========================================================================
// Callable: Upload app-wide logo (for all schools)
// ========================================================================
exports.uploadAppLogo = functions.https.onCall(async (data, context) => {
    try {
        requireAuth(context);
        // Only developers may modify the global app logo.
        if (!(await isDeveloper(context))) {
            throw new functions.https.HttpsError("permission-denied", "Developer access required to upload the app logo.");
        }
        if (typeof data.imageBase64 !== "string" || data.imageBase64.length === 0) {
            throw new functions.https.HttpsError("invalid-argument", "imageBase64 is required.");
        }
        const contentType = typeof data.contentType === "string" ? data.contentType.trim().toLowerCase() : "";
        if (!LOGO_ALLOWED_TYPES.includes(contentType)) {
            throw new functions.https.HttpsError("invalid-argument", "contentType must be image/png, image/jpeg, or image/webp.");
        }
        let buffer;
        try {
            buffer = Buffer.from(data.imageBase64, "base64");
        }
        catch (_a) {
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
            await db.collection("appConfig").doc("global").set({
                appLogoUrl: logoUrl,
                appLogoHistory: firestore_1.FieldValue.arrayUnion({
                    url: logoUrl,
                    uploadedAt: Date.now(),
                    uploadedBy: context.auth.uid,
                }),
                updatedAt: Date.now(),
                updatedBy: context.auth.uid,
            }, { merge: true });
        }
        catch (e) {
            console.error("uploadAppLogo: firestore update failed", e);
            throw new functions.https.HttpsError("internal", "Logo uploaded, but failed to save the logo URL to app configuration.");
        }
        return { logoUrl };
    }
    catch (e) {
        if (e instanceof functions.https.HttpsError)
            throw e;
        console.error("uploadAppLogo: unexpected error", e);
        throw new functions.https.HttpsError("internal", "Unexpected error while uploading app logo.", { originalMessage: String((e === null || e === void 0 ? void 0 : e.message) || e) });
    }
});
// ========================================================================
// Callable: Set app logo URL (e.g. restore from history)
// ========================================================================
exports.setAppLogoUrl = functions.https.onCall(async (data, context) => {
    try {
        requireAuth(context);
        // Only developers may modify the global app logo URL.
        if (!(await isDeveloper(context))) {
            throw new functions.https.HttpsError("permission-denied", "Developer access required to set the app logo URL.");
        }
        const url = typeof (data === null || data === void 0 ? void 0 : data.url) === "string" ? data.url.trim() : "";
        if (!url) {
            throw new functions.https.HttpsError("invalid-argument", "url is required.");
        }
        const db = admin.firestore();
        await db.collection("appConfig").doc("global").set({
            appLogoUrl: url,
            updatedAt: Date.now(),
            updatedBy: context.auth.uid,
        }, { merge: true });
        return { success: true, logoUrl: url };
    }
    catch (e) {
        if (e instanceof functions.https.HttpsError)
            throw e;
        console.error("setAppLogoUrl error", e);
        throw new functions.https.HttpsError("internal", "Failed to set app logo URL.", { originalMessage: String((e === null || e === void 0 ? void 0 : e.message) || e) });
    }
});
// ========================================================================
// Callable: Upload student profile photo (admin only)
// ========================================================================
exports.uploadStudentPhoto = functions.https.onCall(async (data, context) => {
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
        const contentType = typeof data.contentType === "string" ? data.contentType.trim().toLowerCase() : "";
        if (!STUDENT_PHOTO_ALLOWED_TYPES.includes(contentType)) {
            throw new functions.https.HttpsError("invalid-argument", "contentType must be image/png, image/jpeg, or image/webp.");
        }
        let buffer;
        try {
            buffer = Buffer.from(data.imageBase64, "base64");
        }
        catch (_a) {
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
    }
    catch (e) {
        if (e instanceof functions.https.HttpsError)
            throw e;
        console.error("uploadStudentPhoto: unexpected error", e);
        throw new functions.https.HttpsError("internal", "Unexpected error while uploading student photo.", { originalMessage: String((e === null || e === void 0 ? void 0 : e.message) || e) });
    }
});
/** Callable: admin uploads a student sticker/emoji image (same auth as profile photo). */
exports.uploadStudentCustomEmoji = functions.https.onCall(async (data, context) => {
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
        const contentType = typeof data.contentType === "string" ? data.contentType.trim().toLowerCase() : "";
        if (!STUDENT_CUSTOM_EMOJI_ALLOWED_TYPES.includes(contentType)) {
            throw new functions.https.HttpsError("invalid-argument", "contentType must be image/png, image/jpeg, image/webp, or image/gif.");
        }
        let buffer;
        try {
            buffer = Buffer.from(data.imageBase64, "base64");
        }
        catch (_a) {
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
    }
    catch (e) {
        if (e instanceof functions.https.HttpsError)
            throw e;
        console.error("uploadStudentCustomEmoji: unexpected error", e);
        throw new functions.https.HttpsError("internal", "Unexpected error while uploading student emoji.", { originalMessage: String((e === null || e === void 0 ? void 0 : e.message) || e) });
    }
});
// ========================================================================
// Callable: Verify teacher username and passcode
// ========================================================================
exports.verifyTeacherPasscode = functions.https.onCall(async (data, context) => {
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
    const teacherRoleRef = db.collection("schools").doc(data.schoolId).collection("roles_teacher").doc(context.auth.uid);
    await teacherRoleRef.set({ role: 'teacher', teacherId: teacherDoc.id });
    return { success: true };
});
// ========================================================================
// Callable: Verify desk staff (secretary / prize clerk) username + passcode
// ========================================================================
exports.verifyStaffAccountPasscode = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.username, "username");
    requireString(data.passcode, "passcode");
    const role = data.role;
    if (role !== "secretary" && role !== "prizeClerk") {
        throw new functions.https.HttpsError("invalid-argument", "role must be 'secretary' or 'prizeClerk'.");
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
        const row = d.data();
        return row.role === role && row.passcode === data.passcode;
    });
    if (!match) {
        throw new functions.https.HttpsError("permission-denied", "Invalid staff login.");
    }
    const roleCollection = role === "secretary" ? "roles_secretary" : "roles_prizeClerk";
    const roleRef = db
        .collection("schools")
        .doc(schoolId)
        .collection(roleCollection)
        .doc(context.auth.uid);
    const payload = role === "secretary"
        ? { role: "secretary" }
        : { role: "prizeClerk" };
    await roleRef.set(payload);
    return { success: true };
});
// ========================================================================
// Migration functions — consolidated into a single generic helper.
// The exported callable names are unchanged for backward compatibility.
// ========================================================================
async function migrateCollectionToSubcollection(schoolId, collectionName, flagField, context) {
    await requireSchoolAdmin(schoolId, context);
    const db = admin.firestore();
    const schoolDocRef = db.collection("schools").doc(schoolId);
    try {
        const schoolSnap = await schoolDocRef.get();
        if (!schoolSnap.exists) {
            throw new functions.https.HttpsError("not-found", "School not found.");
        }
        const schoolData = schoolSnap.data();
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
            chunk.forEach((item) => {
                batch.set(subRef.doc(item.id), item);
            });
            // On the last chunk, also update the flag and remove the inline array.
            if (i + BATCH_LIMIT >= items.length) {
                batch.update(schoolDocRef, {
                    [flagField]: true,
                    [collectionName]: firestore_1.FieldValue.delete(),
                });
            }
            await batch.commit();
        }
        return { success: true, message: `Migrated ${items.length} ${collectionName}.` };
    }
    catch (error) {
        console.error(`Migration of ${collectionName} failed:`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", "An unexpected error occurred during migration.");
    }
}
const MIGRATION_MAP = {
    migrateStudentsToSubcollection: { collection: "students", flag: "hasMigratedStudents" },
    migrateClassesToSubcollection: { collection: "classes", flag: "hasMigratedClasses" },
    migrateTeachersToSubcollection: { collection: "teachers", flag: "hasMigratedTeachers" },
    migratePrizesToSubcollection: { collection: "prizes", flag: "hasMigratedPrizes" },
    migrateCouponsToSubcollection: { collection: "coupons", flag: "hasMigratedCoupons" },
    migrateCategoriesToSubcollection: { collection: "categories", flag: "hasMigratedCategories" },
};
for (const [fnName, { collection: col, flag }] of Object.entries(MIGRATION_MAP)) {
    exports[fnName] = functions.https.onCall(async (data, context) => {
        return migrateCollectionToSubcollection(data.schoolId, col, flag, context);
    });
}
function requireDescriptor(value, name) {
    if (!Array.isArray(value) || value.length !== 128) {
        throw new functions.https.HttpsError("invalid-argument", `${name} must be a 128-length number array.`);
    }
    for (const n of value) {
        if (typeof n !== "number" || !Number.isFinite(n)) {
            throw new functions.https.HttpsError("invalid-argument", `${name} must contain only finite numbers.`);
        }
    }
}
function cosineSimilarity(a, b) {
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
    if (!denom)
        return 0;
    return dot / denom;
}
function descriptorRecordsFrom(value) {
    if (!Array.isArray(value))
        return [];
    const records = [];
    for (const item of value) {
        const candidate = Array.isArray(item)
            ? item
            : item && typeof item === "object" && Array.isArray(item.values)
                ? item.values
                : null;
        if (!candidate || candidate.length !== 128)
            continue;
        if (candidate.every((n) => typeof n === "number" && Number.isFinite(n))) {
            records.push({ values: candidate });
        }
    }
    return records;
}
exports.enrollStudentFace = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireDescriptor(data.descriptor, "descriptor");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const descriptor = data.descriptor;
    const db = admin.firestore();
    const ref = db.collection("schools").doc(schoolId).collection("faceAuth").doc(studentId);
    const snap = await ref.get();
    const prev = snap.exists ? snap.data() : null;
    const prevDescriptors = descriptorRecordsFrom(prev === null || prev === void 0 ? void 0 : prev.descriptors);
    const nextDescriptors = [...prevDescriptors, { values: descriptor }].slice(-3); // keep last 3
    await ref.set({
        enabled: true,
        descriptors: nextDescriptors,
        updatedAt: Date.now(),
    }, { merge: true });
    return { success: true, count: nextDescriptors.length };
});
exports.deleteStudentFace = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const db = admin.firestore();
    const ref = db.collection("schools").doc(schoolId).collection("faceAuth").doc(studentId);
    await ref.set({ enabled: false, descriptors: [], updatedAt: Date.now() }, { merge: true });
    return { success: true };
});
exports.matchStudentFace = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireDescriptor(data.descriptor, "descriptor");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const descriptor = data.descriptor;
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
exports.getStudentFaceAuthStatus = functions.https.onCall(async (data, context) => {
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
    const descriptors = descriptorRecordsFrom(d === null || d === void 0 ? void 0 : d.descriptors);
    const scanCount = descriptors.length;
    return {
        enrolled: scanCount > 0,
        scanCount,
        updatedAt: typeof (d === null || d === void 0 ? void 0 : d.updatedAt) === "number" ? d.updatedAt : null,
        autoLogin: typeof (d === null || d === void 0 ? void 0 : d.autoLogin) === "boolean" ? d.autoLogin : true,
        enabled: typeof (d === null || d === void 0 ? void 0 : d.enabled) === "boolean" ? d.enabled : false,
    };
});
exports.setStudentFaceAutoLogin = functions.https.onCall(async (data, context) => {
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
});
exports.signInAttendance = signInAttendance_1.signInAttendance;
//# sourceMappingURL=index.js.map