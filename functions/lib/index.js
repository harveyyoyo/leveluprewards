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
exports.onAttendanceLogCreated = exports.onPrizeUpdated = exports.onStudentActivityCreated = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const crypto = require("crypto");
const firestore_1 = require("firebase-admin/firestore");
const signInAttendance_1 = require("./signInAttendance");
const couponRedemption_1 = require("./couponRedemption");
const crypto_1 = require("./crypto");
admin.initializeApp();
const SUBCOLLECTIONS = ["students", "classes", "teachers", "staffAccounts", "categories", "prizes", "coupons"];
const RETENTION_DAYS = 30;
const AI_FUN_UNIFIED_PRIZE_ID = "__ai_fun_unified__";
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
function trimmedString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function maskRecipient(to) {
    const s = typeof to === "string" ? to.trim() : "";
    if (!s)
        return "—";
    const at = s.indexOf("@");
    if (at < 1)
        return `${s.slice(0, 3)}…`;
    return `${s.slice(0, 2)}***${s.slice(at)}`;
}
function schoolAccessPasscodeFrom(data) {
    return trimmedString(data.schoolAccessPasscode) || trimmedString(data.passcode) || "1234";
}
function adminPasscodeFrom(data) {
    return trimmedString(data.adminPasscode) || trimmedString(data.passcode) || "1234";
}
// Demo schools should authenticate like any other school (no passcode bypass).
async function hasSchoolRole(schoolId, uid, roles) {
    const db = admin.firestore();
    const roleCollections = {
        admin: "roles_admin",
        teacher: "roles_teacher",
        secretary: "roles_secretary",
        prizeClerk: "roles_prizeClerk",
        reports: "roles_reports",
    };
    const snaps = await Promise.all(roles.map((role) => db.collection("schools").doc(schoolId).collection(roleCollections[role]).doc(uid).get()));
    return snaps.some((snap, index) => { var _a; return snap.exists && ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.role) === roles[index]; });
}
async function hasKioskMembershipOrStaff(schoolId, context, roles = ["admin", "teacher", "secretary", "prizeClerk"]) {
    requireAuth(context);
    const uid = context.auth.uid;
    const db = admin.firestore();
    const memberSnap = await db.collection("schools").doc(schoolId).collection("kioskMembers").doc(uid).get();
    if (memberSnap.exists)
        return true;
    if (await hasSchoolRole(schoolId, uid, roles))
        return true;
    return isDeveloper(context);
}
async function schoolEntryCodeIsRequired(db, schoolId) {
    var _a, _b;
    const secretSnap = await db.collection("schools").doc(schoolId).collection("secrets").doc("entry").get();
    const code = secretSnap.exists ? String((_b = (_a = secretSnap.data()) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : "").trim() : "";
    return code.length > 0;
}
function requireDescriptor(value, name) {
    if (!Array.isArray(value) ||
        value.length < 32 ||
        value.length > 2048 ||
        !value.every((n) => typeof n === "number" && Number.isFinite(n))) {
        throw new functions.https.HttpsError("invalid-argument", `A valid ${name} descriptor is required.`);
    }
}
function getRewardPeriodKeys(now) {
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
function applyCategoryPointsByPeriodData(current, categoryName, points, now) {
    const next = current && typeof current === "object" && !Array.isArray(current)
        ? JSON.parse(JSON.stringify(current))
        : {};
    const keys = getRewardPeriodKeys(now);
    for (const key of [keys.month, keys.semester, keys.year, keys.all_time]) {
        if (!next[key] || typeof next[key] !== "object")
            next[key] = {};
        next[key][categoryName] = Number(next[key][categoryName] || 0) + points;
    }
    return next;
}
function evaluateBadgeAwardsData(params) {
    var _a;
    const earned = Array.isArray(params.student.earnedBadges) ? params.student.earnedBadges : [];
    const earnedSet = new Set(earned.map((e) => `${e === null || e === void 0 ? void 0 : e.badgeId}:${e === null || e === void 0 ? void 0 : e.periodKey}`));
    const keys = getRewardPeriodKeys(params.now);
    const out = [];
    for (const badge of params.badges) {
        if (!badge || badge.enabled === false || typeof badge.id !== "string")
            continue;
        const cat = params.categories.find((c) => (c === null || c === void 0 ? void 0 : c.id) === badge.categoryId);
        const categoryName = typeof (cat === null || cat === void 0 ? void 0 : cat.name) === "string" ? cat.name : "";
        if (!categoryName)
            continue;
        const periodKey = badge.period === "month"
            ? keys.month
            : badge.period === "semester"
                ? keys.semester
                : badge.period === "year"
                    ? keys.year
                    : "all";
        const periodPoints = Number(((_a = params.categoryPointsByPeriod[periodKey]) === null || _a === void 0 ? void 0 : _a[categoryName]) || 0);
        const required = Number(badge.pointsRequired || 0);
        if (periodPoints < required || earnedSet.has(`${badge.id}:${periodKey}`))
            continue;
        earnedSet.add(`${badge.id}:${periodKey}`);
        out.push({ badgeId: badge.id, periodKey, earnedAt: params.now, name: String(badge.name || "Unknown") });
    }
    return out;
}
function evaluateAchievementAwardsData(params) {
    const earned = Array.isArray(params.student.earnedAchievements) ? params.student.earnedAchievements : [];
    const earnedSet = new Set(earned.map((e) => e === null || e === void 0 ? void 0 : e.achievementId));
    const out = [];
    for (const ach of params.achievements) {
        if (!ach || typeof ach.id !== "string" || earnedSet.has(ach.id))
            continue;
        const criteria = ach.criteria || {};
        if (criteria.type === "manual")
            continue;
        const threshold = Number(criteria.threshold || 0);
        let earnedNow = false;
        if (criteria.type === "points") {
            if (typeof criteria.categoryId === "string" && criteria.categoryId) {
                const cat = params.categories.find((c) => (c === null || c === void 0 ? void 0 : c.id) === criteria.categoryId);
                const categoryName = typeof (cat === null || cat === void 0 ? void 0 : cat.name) === "string" ? cat.name : "";
                earnedNow = !!categoryName && Number(params.categoryPoints[categoryName] || 0) >= threshold;
            }
            else {
                earnedNow = params.points >= threshold;
            }
        }
        else if (criteria.type === "lifetimePoints") {
            earnedNow = params.lifetimePoints >= threshold;
        }
        else if (criteria.type === "coupons") {
            const cat = params.categories.find((c) => (c === null || c === void 0 ? void 0 : c.id) === criteria.categoryId);
            const categoryName = typeof (cat === null || cat === void 0 ? void 0 : cat.name) === "string" ? cat.name : "";
            earnedNow = !!categoryName && Number(params.categoryPoints[categoryName] || 0) >= threshold;
        }
        if (!earnedNow)
            continue;
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
async function collectFullSchoolData(schoolId) {
    const db = admin.firestore();
    const schoolRef = db.collection("schools").doc(schoolId);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) {
        throw new functions.https.HttpsError("not-found", `School "${schoolId}" not found.`);
    }
    const schoolData = JSON.parse(JSON.stringify(schoolSnap.data()));
    delete schoolData.passcode;
    delete schoolData.schoolAccessPasscode;
    delete schoolData.adminPasscode;
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
    const currentSchoolData = currentSnap.exists ? (_a = currentSnap.data()) !== null && _a !== void 0 ? _a : {} : {};
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
    const schoolDocData = {};
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
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const passcode = typeof data.passcode === "string" ? String(data.passcode).trim() : "";
    const db = admin.firestore();
    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
        throw new functions.https.HttpsError("not-found", "School not found.");
    }
    if (passcode.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "A valid passcode is required.");
    }
    const schoolData = schoolDoc.data();
    if (adminPasscodeFrom(schoolData) !== passcode) {
        throw new functions.https.HttpsError("permission-denied", "Invalid passcode.");
    }
    // Provision admin role using the Admin SDK (path must match client: schools/{schoolId}/roles_admin/{uid})
    const adminRoleRef = db.collection("schools").doc(schoolId).collection("roles_admin").doc(context.auth.uid);
    await adminRoleRef.set({ role: 'admin' });
    return { success: true };
});
// ========================================================================
// Callable: Verify school access passcode (NO role provisioning)
// Used for "school sign-in" gate before choosing student/faculty/admin.
// ========================================================================
exports.verifySchoolAccessPasscode = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    if (typeof data.passcode !== "string" || data.passcode.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "A valid passcode is required.");
    }
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const passcode = String(data.passcode).trim();
    const db = admin.firestore();
    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
        throw new functions.https.HttpsError("not-found", "School not found.");
    }
    const schoolData = schoolDoc.data();
    if (schoolAccessPasscodeFrom(schoolData) !== passcode) {
        throw new functions.https.HttpsError("permission-denied", "Invalid passcode.");
    }
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
/** Callable: record a developer support session before opening a school's admin tools. */
exports.startDeveloperSupportSession = functions.https.onCall(async (data, context) => {
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
    const sessionRef = schoolRef.collection("supportSessions").doc(`${now}_${context.auth.uid}`);
    await sessionRef.set({
        developerUid: context.auth.uid,
        startedAt: now,
        schoolId,
        userAgent: context.rawRequest.get("user-agent") || "",
        status: "started",
    });
    return { success: true, sessionId: sessionRef.id };
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
    const providedLegacyPasscode = trimmedString(data.passcode);
    const providedSchoolAccessPasscode = trimmedString(data.schoolAccessPasscode) || providedLegacyPasscode;
    const providedAdminPasscode = trimmedString(data.adminPasscode) || providedLegacyPasscode;
    const defaultPasscode = "1234";
    const schoolDocData = {
        name: providedName || cleanId,
        updatedAt: now,
        passcode: providedSchoolAccessPasscode || defaultPasscode,
        schoolAccessPasscode: providedSchoolAccessPasscode || defaultPasscode,
        adminPasscode: providedAdminPasscode || defaultPasscode,
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
        throw new functions.https.HttpsError("already-exists", `School ID "${cleanId}" already exists.`);
    }
    const existing = schoolSnap.exists ? (_a = schoolSnap.data()) !== null && _a !== void 0 ? _a : {} : {};
    const finalSchoolDocData = Object.assign(Object.assign(Object.assign({}, schoolDocData), existing), { name: providedName || existing.name || schoolDocData.name, passcode: providedSchoolAccessPasscode || existing.passcode || schoolDocData.passcode, schoolAccessPasscode: providedSchoolAccessPasscode ||
            schoolAccessPasscodeFrom(existing) ||
            schoolDocData.schoolAccessPasscode, adminPasscode: providedAdminPasscode ||
            adminPasscodeFrom(existing) ||
            schoolDocData.adminPasscode, updatedAt: now, plan: existing.plan || schoolDocData.plan, featureOverrides: existing.featureOverrides || schoolDocData.featureOverrides, hasMigratedStudents: true, hasMigratedClasses: true, hasMigratedTeachers: true, hasMigratedPrizes: true, hasMigratedCoupons: true, hasMigratedCategories: true });
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
    if (prizesSnap.empty) {
        const { id } = seedPrize, prizeData = __rest(seedPrize, ["id"]);
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
    batch.set(db.collection("schoolPublic").doc(cleanId), {
        active: true,
        name: finalSchoolDocData.name,
        plan: finalSchoolDocData.plan,
        featureOverrides: finalSchoolDocData.featureOverrides,
        staffDirectory,
        staffDirectoryUpdatedAt: now,
        updatedAt: now,
    }, { merge: true });
    await batch.commit();
    return {
        success: true,
        cleanId,
        passcode: finalSchoolDocData.schoolAccessPasscode,
        schoolAccessPasscode: finalSchoolDocData.schoolAccessPasscode,
        adminPasscode: finalSchoolDocData.adminPasscode,
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
        const expected = secretSnap.exists ? String((_b = (_a = secretSnap.data()) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : "").trim() : "";
        if (expected.length > 0 && expected !== code) {
            throw new functions.https.HttpsError("permission-denied", "Invalid school code.");
        }
    }
    const uid = context.auth.uid;
    const memberRef = db.collection("schools").doc(schoolId).collection("kioskMembers").doc(uid);
    await memberRef.set({ createdAt: Date.now() }, { merge: true });
    return { success: true };
});
/** Callable: grant a browser a kiosk session for public student-mode school links. */
exports.enterSchoolKioskSession = functions.https.onCall(async (data, context) => {
    var _a;
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const db = admin.firestore();
    const publicSnap = await db.collection("schoolPublic").doc(schoolId).get();
    if (!publicSnap.exists) {
        throw new functions.https.HttpsError("permission-denied", "Public student access is not enabled for this school.");
    }
    if (((_a = publicSnap.data()) === null || _a === void 0 ? void 0 : _a.active) === false) {
        throw new functions.https.HttpsError("permission-denied", "School is not active.");
    }
    if (await schoolEntryCodeIsRequired(db, schoolId)) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    await db
        .collection("schools")
        .doc(schoolId)
        .collection("kioskMembers")
        .doc(context.auth.uid)
        .set({ createdAt: Date.now(), source: "student-login" }, { merge: true });
    return { success: true };
});
/** Callable: kiosk-safe student lookup by badge/card id. */
exports.lookupStudentByBadge = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.badgeId, "badgeId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const badgeId = String(data.badgeId).trim();
    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const db = admin.firestore();
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
async function redeemCouponForStudent(db, schoolId, studentId, couponCode) {
    var _a;
    const schoolRef = db.collection("schools").doc(schoolId);
    const couponRef = schoolRef.collection("coupons").doc(couponCode);
    const studentRef = schoolRef.collection("students").doc(studentId);
    const [schoolSnap, categoriesSnap, achievementsSnap, badgesSnap] = await Promise.all([
        schoolRef.get(),
        schoolRef.collection("categories").get(),
        schoolRef.collection("achievements").get(),
        schoolRef.collection("badges").get(),
    ]);
    const appSettings = schoolSnap.exists ? (((_a = schoolSnap.data()) === null || _a === void 0 ? void 0 : _a.appSettings) || {}) : {};
    const achievements = appSettings.enableAchievements === true
        ? achievementsSnap.docs.map((d) => (Object.assign({ id: d.id }, d.data())))
        : [];
    const badges = appSettings.enableBadges === true
        ? badgesSnap.docs.map((d) => (Object.assign({ id: d.id }, d.data())))
        : [];
    const categories = categoriesSnap.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
    const now = Date.now();
    return db.runTransaction(async (tx) => {
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
            const classSnap = await tx.get(schoolRef.collection("classes").doc(classId));
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
        const categoryName = String(coupon.category || "Coupon");
        const newPoints = Number(s.points || 0) + value;
        const newLifetimePoints = Number(s.lifetimePoints || 0) + value;
        const categoryPoints = s.categoryPoints && typeof s.categoryPoints === "object" && !Array.isArray(s.categoryPoints)
            ? Object.assign({}, s.categoryPoints) : {};
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
            const earnedAchievement = {
                achievementId: ach.achievementId,
                earnedAt: ach.earnedAt,
            };
            if (ach.wheelSpin)
                earnedAchievement.wheelSpun = false;
            earnedAchievements.push(earnedAchievement);
            if (ach.wheelSpin) {
                tx.set(studentRef.collection("activities").doc(), {
                    desc: `Achievement Unlocked: ${ach.name} (Wheel Spin ready!)`,
                    amount: 0,
                    date: now,
                });
            }
            else {
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
        return { value, bonusTotal };
    });
}
/** Callable: redeem coupon (server-authoritative; kiosk-safe). */
exports.redeemCouponServer = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireString(data.couponCode, "couponCode");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const couponCode = String(data.couponCode).trim().toUpperCase();
    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const db = admin.firestore();
    const result = await redeemCouponForStudent(db, schoolId, studentId, couponCode);
    return {
        success: true,
        message: "Redeemed successfully",
        value: result.value,
        bonusTotal: result.bonusTotal,
    };
});
/** Callable: kiosk-safe prize redemption with trusted balance + stock updates. */
exports.redeemPrizeServer = functions.https.onCall(async (data, context) => {
    var _a;
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.studentId, "studentId");
    requireString(data.prizeId, "prizeId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const studentId = String(data.studentId).trim();
    const prizeId = String(data.prizeId).trim();
    const rawQuantity = Number((_a = data.quantity) !== null && _a !== void 0 ? _a : 1);
    const quantity = Number.isFinite(rawQuantity) ? Math.floor(rawQuantity) : 1;
    if (quantity < 1 || quantity > 99) {
        throw new functions.https.HttpsError("invalid-argument", "Quantity must be between 1 and 99.");
    }
    const db = admin.firestore();
    if (!(await hasKioskMembershipOrStaff(schoolId, context, ["admin", "teacher", "prizeClerk"]))) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const studentRef = db.collection("schools").doc(schoolId).collection("students").doc(studentId);
    const schoolRef = db.collection("schools").doc(schoolId);
    const prizeRef = db.collection("schools").doc(schoolId).collection("prizes").doc(prizeId);
    const redeemedAt = Date.now();
    const result = await db.runTransaction(async (tx) => {
        var _a, _b, _c;
        const studentSnap = await tx.get(studentRef);
        if (!studentSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Student not found.");
        }
        let prize = null;
        const prizeSnap = prizeId === AI_FUN_UNIFIED_PRIZE_ID ? null : await tx.get(prizeRef);
        if (prizeId === AI_FUN_UNIFIED_PRIZE_ID) {
            const schoolSnap = await tx.get(schoolRef);
            const settings = schoolSnap.exists ? (((_a = schoolSnap.data()) === null || _a === void 0 ? void 0 : _a.appSettings) || {}) : {};
            if (settings.enablePrizeAiSurprise === true) {
                const rawPoints = Number((_b = settings.prizeAiSurpriseDefaultPoints) !== null && _b !== void 0 ? _b : 1);
                prize = {
                    name: "Fun",
                    points: Number.isFinite(rawPoints) ? Math.max(0, Math.floor(rawPoints)) : 1,
                    icon: "Sparkles",
                    inStock: true,
                    aiFunReward: "picker",
                };
            }
        }
        else if (prizeSnap === null || prizeSnap === void 0 ? void 0 : prizeSnap.exists) {
            prize = prizeSnap.data();
        }
        if (!prize) {
            throw new functions.https.HttpsError("not-found", "Prize not found.");
        }
        const student = studentSnap.data();
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
            ? prize.teacherIds.filter((id) => typeof id === "string" && id.length > 0)
            : typeof prize.teacherId === "string" && prize.teacherId
                ? [prize.teacherId]
                : [];
        if (teacherIds.length > 0) {
            const studentTeacherIds = Array.isArray(student.teacherIds)
                ? student.teacherIds.filter((id) => typeof id === "string" && id.length > 0)
                : [];
            let matchesTeacher = teacherIds.some((id) => studentTeacherIds.includes(id));
            if (!matchesTeacher && studentClassId) {
                const classRef = db.collection("schools").doc(schoolId).collection("classes").doc(studentClassId);
                const classSnap = await tx.get(classRef);
                const primaryTeacherId = classSnap.exists ? (_c = classSnap.data()) === null || _c === void 0 ? void 0 : _c.primaryTeacherId : null;
                matchesTeacher = typeof primaryTeacherId === "string" && teacherIds.includes(primaryTeacherId);
            }
            if (!matchesTeacher) {
                throw new functions.https.HttpsError("failed-precondition", "This prize is not available for this student.");
            }
        }
        const activityRef = studentRef.collection("activities").doc();
        const activityData = {
            desc: `Redeemed: ${String(prize.name || "Prize")}${quantity > 1 ? ` (x${quantity})` : ""}`,
            amount: -totalCost,
            date: redeemedAt,
            fulfilled: false,
        };
        if (teacherIds[0])
            activityData.teacherId = teacherIds[0];
        tx.update(studentRef, { points: studentPoints - totalCost });
        tx.set(activityRef, activityData);
        if (typeof prize.stockCount === "number") {
            const nextStock = prize.stockCount - quantity;
            tx.update(prizeRef, {
                stockCount: Math.max(0, nextStock),
                inStock: nextStock > 0,
            });
        }
        return { activityId: activityRef.id, totalCost };
    });
    return {
        success: true,
        activityId: result.activityId,
        redeemedAt,
        totalCost: result.totalCost,
        message: "Redeemed successfully",
    };
});
/** Callable: sync offline pending coupon redemptions. */
exports.syncPendingRedemptions = functions.https.onCall(async (data, context) => {
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
    const out = [];
    for (const it of data.items) {
        const id = String((it === null || it === void 0 ? void 0 : it.id) || "");
        const studentId = String((it === null || it === void 0 ? void 0 : it.studentId) || "");
        const couponCode = String((it === null || it === void 0 ? void 0 : it.couponCode) || "").toUpperCase();
        if (!id || !studentId || !couponCode)
            continue;
        try {
            await redeemCouponForStudent(db, schoolId, studentId, couponCode);
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
    if (!(await hasKioskMembershipOrStaff(schoolId, context))) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const db = admin.firestore();
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
function formatLocalDateParts(now, timeZone) {
    var _a, _b, _c;
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
            year = ((_a = parts.find((p) => p.type === "year")) === null || _a === void 0 ? void 0 : _a.value) || year;
            month = ((_b = parts.find((p) => p.type === "month")) === null || _b === void 0 ? void 0 : _b.value) || month;
            day = ((_c = parts.find((p) => p.type === "day")) === null || _c === void 0 ? void 0 : _c.value) || day;
        }
        catch (_d) {
            // Fall back to the runtime local date if the stored time zone is invalid.
        }
    }
    return { full: `${year}-${month}-${day}`, monthDay: `${month}-${day}` };
}
/** Callable: award birthday/special-day points without client Firestore writes. */
exports.awardSpecialDayPoints = functions.https.onCall(async (data, context) => {
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
        var _a;
        const [schoolSnap, studentSnap, attendanceSnap] = await Promise.all([
            tx.get(schoolRef),
            tx.get(studentRef),
            tx.get(attendanceRef),
        ]);
        if (!schoolSnap.exists)
            throw new functions.https.HttpsError("not-found", "School not found.");
        if (!studentSnap.exists)
            throw new functions.https.HttpsError("not-found", "Student not found.");
        const settings = (((_a = schoolSnap.data()) === null || _a === void 0 ? void 0 : _a.appSettings) || {});
        const attendanceConfig = attendanceSnap.exists ? (attendanceSnap.data() || {}) : {};
        const timeZone = typeof attendanceConfig.attendanceTimeZone === "string"
            ? attendanceConfig.attendanceTimeZone.trim()
            : undefined;
        const today = formatLocalDateParts(now, timeZone);
        const student = studentSnap.data();
        const lastAwarded = student.lastSpecialDayAwarded && typeof student.lastSpecialDayAwarded === "object"
            ? Object.assign({}, student.lastSpecialDayAwarded) : {};
        const awards = [];
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
        if (settings.enableSpecialDayPoints === true && settings.specialDayDate === today.monthDay) {
            const amount = Number(settings.specialDayPointsAmount || 0);
            if (lastAwarded.specialDay !== today.full && amount > 0) {
                const label = typeof settings.specialDayLabel === "string" && settings.specialDayLabel.trim()
                    ? settings.specialDayLabel.trim()
                    : "Special Day";
                awards.push({ desc: `${label}! (+${amount} pts)`, amount });
                lastAwarded.specialDay = today.full;
            }
        }
        const totalAward = awards.reduce((sum, award) => sum + award.amount, 0);
        if (totalAward <= 0)
            return { totalAward: 0, awards: [] };
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
    return Object.assign({ success: true }, result);
});
// ========================================================================
// Callable: Upload school logo (server-side to avoid client Storage hangs)
// ========================================================================
const LOGO_MAX_BYTES = 10 * 1024 * 1024; // 10MB
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
// Callable: Staff portal login options (safe public directory)
// ========================================================================
exports.getStaffPortalLoginOptions = functions.https.onCall(async (data, context) => {
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
        const row = docSnap.data();
        const name = typeof row.name === "string" ? row.name.trim() : "";
        const username = typeof row.username === "string" && row.username.trim()
            ? row.username.trim()
            : docSnap.id;
        if (!name || !username)
            return null;
        return {
            id: docSnap.id,
            type: "teacher",
            label: name,
            username,
        };
    })
        .filter(Boolean);
    const staff = staffSnap.docs
        .map((docSnap) => {
        const row = docSnap.data();
        const role = row.role === "secretary" || row.role === "prizeClerk" || row.role === "reports"
            ? row.role
            : null;
        const username = typeof row.username === "string" ? row.username.trim().toLowerCase() : "";
        const displayName = typeof row.displayName === "string" ? row.displayName.trim() : "";
        if (!role || !username || !displayName)
            return null;
        return {
            id: docSnap.id,
            type: role,
            label: displayName,
            username,
        };
    })
        .filter(Boolean);
    return { options: [...teachers, ...staff] };
});
// ========================================================================
// Callable: Verify staff (secretary / prize clerk / reports) username + passcode
// ========================================================================
exports.verifyStaffAccountPasscode = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.username, "username");
    requireString(data.passcode, "passcode");
    const role = data.role;
    if (role !== "secretary" && role !== "prizeClerk" && role !== "reports") {
        throw new functions.https.HttpsError("invalid-argument", "role must be 'secretary', 'prizeClerk', or 'reports'.");
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
        const roles = Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role];
        return roles.includes(role) && row.passcode === data.passcode;
    });
    if (!match) {
        throw new functions.https.HttpsError("permission-denied", "Invalid staff login.");
    }
    const row = match.data();
    const roles = (Array.isArray(row.roles) && row.roles.length > 0 ? row.roles : [row.role])
        .filter((item) => item === "secretary" || item === "prizeClerk" || item === "reports");
    const writes = roles.map((staffRole) => {
        const roleCollection = staffRole === "secretary"
            ? "roles_secretary"
            : staffRole === "prizeClerk"
                ? "roles_prizeClerk"
                : "roles_reports";
        return db
            .collection("schools")
            .doc(schoolId)
            .collection(roleCollection)
            .doc(context.auth.uid)
            .set({ role: staffRole });
    });
    const displayName = typeof row.displayName === "string" && row.displayName.trim().length > 0
        ? row.displayName.trim()
        : username;
    await Promise.all(writes);
    return { success: true, displayName, roles };
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
    if (!(await hasSchoolRole(schoolId, context.auth.uid, ["admin"]))) {
        if (!(await isDeveloper(context))) {
            throw new functions.https.HttpsError("permission-denied", "Admin privileges required for this school.");
        }
    }
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
    const uid = context.auth.uid;
    const mayManageFace = (await hasSchoolRole(schoolId, uid, ["admin", "teacher"])) || (await isDeveloper(context));
    if (!mayManageFace) {
        throw new functions.https.HttpsError("permission-denied", "School entry required.");
    }
    const ref = db.collection("schools").doc(schoolId).collection("faceAuth").doc(studentId);
    await ref.set({ enabled: false, descriptors: [], updatedAt: Date.now() }, { merge: true });
    return { success: true };
});
exports.matchStudentFace = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a;
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireDescriptor(data.descriptor, "descriptor");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    const descriptor = data.descriptor;
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
    const perStudent = [];
    for (const doc of snap.docs) {
        const d = doc.data();
        const list = descriptorRecordsFrom(d.descriptors);
        if (list.length === 0)
            continue;
        let bestForStudent = -1;
        for (const cand of list) {
            const score = cosineSimilarity(descriptor, cand.values);
            if (score > bestForStudent)
                bestForStudent = score;
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
        return { studentId: null, confidence: (_a = top === null || top === void 0 ? void 0 : top.score) !== null && _a !== void 0 ? _a : -1 };
    }
    if (second && top.score - second.score < minMarginSecondStudent) {
        return { studentId: null, confidence: top.score, ambiguous: true };
    }
    return { studentId: top.studentId, confidence: top.score };
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
// ========================================================================
// Notifications & Alerts
// ========================================================================
function escapeHtml(value) {
    return String(value !== null && value !== void 0 ? value : "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function buildCelebrationEmailHtml(args) {
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
function queueContactAlerts(args) {
    const { alerts, db, email, phone, subject, message, html, fromEmail, schoolId, studentId, whatsappEnabled } = args;
    if (email) {
        alerts.push(db.collection("mail").add(Object.assign({ to: email, from: fromEmail, message: Object.assign({ subject, text: message }, (html ? { html } : {})), schoolId }, (studentId ? { studentId } : {}))));
    }
    if (phone) {
        alerts.push(db.collection("sms").add(Object.assign({ to: phone, body: message, schoolId }, (studentId ? { studentId } : {}))));
        if (whatsappEnabled) {
            alerts.push(db.collection("whatsapp").add(Object.assign({ to: phone, body: message, schoolId }, (studentId ? { studentId } : {}))));
        }
    }
}
function numericOrNull(v) {
    if (typeof v !== "number" || !Number.isFinite(v))
        return null;
    return v;
}
async function queueStaffInventoryAlerts(args) {
    const { db, schoolId, subject, message, html, fromEmail, whatsappEnabled } = args;
    const alerts = [];
    const [teachersSnap, staffSnap] = await Promise.all([
        db.collection("schools").doc(schoolId).collection("teachers").get(),
        db.collection("schools").doc(schoolId).collection("staffAccounts").get(),
    ]);
    for (const d of teachersSnap.docs) {
        const data = d.data();
        const email = (0, crypto_1.decryptField)(data === null || data === void 0 ? void 0 : data.email);
        const phone = (0, crypto_1.decryptField)(data === null || data === void 0 ? void 0 : data.phone);
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
        const email = (0, crypto_1.decryptField)(data === null || data === void 0 ? void 0 : data.email);
        const phone = (0, crypto_1.decryptField)(data === null || data === void 0 ? void 0 : data.phone);
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
exports.onStudentActivityCreated = functions.firestore
    .document("schools/{schoolId}/students/{studentId}/activities/{activityId}")
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    const { schoolId, studentId } = context.params;
    const activityData = snapshot.data();
    if (!activityData)
        return;
    const db = admin.firestore();
    // Check school settings
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const settings = (_a = schoolSnap.data()) === null || _a === void 0 ? void 0 : _a.appSettings;
    if (!(settings === null || settings === void 0 ? void 0 : settings.enableNotifications)) {
        return;
    }
    // Get student data
    const studentSnap = await db.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
    const studentData = studentSnap.data();
    if (!studentData)
        return;
    const prefs = studentData.notificationPrefs && typeof studentData.notificationPrefs === "object"
        ? studentData.notificationPrefs
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
        if (settings.payLibrary === false)
            return;
        if (!settings.notificationLibraryEnabled)
            return;
    }
    else {
        if (isMilestone && settings.notificationMilestonesEnabled === false)
            return;
        if (!isMilestone && !settings.notificationRewardsEnabled)
            return;
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
    const alerts = [];
    const pEmail = (0, crypto_1.decryptField)(studentData.parentEmail);
    const pPhone = (0, crypto_1.decryptField)(studentData.parentPhone);
    const sEmail = (0, crypto_1.decryptField)(studentData.studentEmail);
    const sPhone = (0, crypto_1.decryptField)(studentData.studentPhone);
    const schoolName = ((_b = schoolSnap.data()) === null || _b === void 0 ? void 0 : _b.name) || "School";
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
            const tEmail = (0, crypto_1.decryptField)(tData === null || tData === void 0 ? void 0 : tData.email);
            const tPhone = (0, crypto_1.decryptField)(tData === null || tData === void 0 ? void 0 : tData.phone);
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
exports.onPrizeUpdated = functions.firestore
    .document("schools/{schoolId}/prizes/{prizeId}")
    .onUpdate(async (change, context) => {
    var _a, _b;
    const { schoolId } = context.params;
    const before = change.before.data();
    const after = change.after.data();
    if (!after)
        return;
    const db = admin.firestore();
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const settings = (_a = schoolSnap.data()) === null || _a === void 0 ? void 0 : _a.appSettings;
    if (!(settings === null || settings === void 0 ? void 0 : settings.enableNotifications))
        return;
    if (!(settings === null || settings === void 0 ? void 0 : settings.notificationStaffAlertsEnabled))
        return;
    if (!(settings === null || settings === void 0 ? void 0 : settings.notificationPrizeInventoryEnabled))
        return;
    const schoolName = ((_b = schoolSnap.data()) === null || _b === void 0 ? void 0 : _b.name) || "School";
    const fromEmail = `"${schoolName} Alerts" <alerts@levelup-edu.com>`;
    const whatsappEnabled = !!settings.notificationWhatsAppEnabled;
    const afterCount = numericOrNull(after.stockCount);
    const beforeCount = numericOrNull(before === null || before === void 0 ? void 0 : before.stockCount);
    const thresholdRaw = numericOrNull(settings.notificationPrizeLowStockThreshold);
    const threshold = thresholdRaw === null ? 5 : Math.max(0, Math.floor(thresholdRaw));
    const name = String(after.name || "Prize").trim() || "Prize";
    const inStock = after.inStock !== false;
    const alertsToSend = [];
    // Low stock / out of stock: only when a finite count exists and crosses into threshold.
    if (afterCount !== null && inStock) {
        const crossedIntoLow = afterCount <= threshold &&
            (beforeCount === null || beforeCount > threshold) &&
            (beforeCount === null || beforeCount !== afterCount);
        const crossedIntoZero = afterCount === 0 && (beforeCount === null || beforeCount > 0) && (beforeCount === null || beforeCount !== afterCount);
        if (crossedIntoLow || crossedIntoZero) {
            const subject = crossedIntoZero ? `Inventory alert: Out of stock (${name})` : `Inventory alert: Low stock (${name})`;
            const message = crossedIntoZero
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
            alertsToSend.push(queueStaffInventoryAlerts({
                db,
                schoolId,
                subject,
                message,
                html,
                fromEmail,
                whatsappEnabled,
            }));
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
            const prizes = snap.docs.map((d) => d.data());
            const available = prizes.some((p) => {
                const listed = (p === null || p === void 0 ? void 0 : p.inStock) !== false;
                const c = numericOrNull(p === null || p === void 0 ? void 0 : p.stockCount);
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
                alertsToSend.push(queueStaffInventoryAlerts({
                    db,
                    schoolId,
                    subject,
                    message,
                    html,
                    fromEmail,
                    whatsappEnabled,
                }));
                await db.collection("schools").doc(schoolId).set({ appSettings: { inventoryLastEmptyShopAlertAt: now } }, { merge: true });
            }
        }
    }
    await Promise.all(alertsToSend);
});
/** Triggered when a student signs in via the attendance kiosk. */
exports.onAttendanceLogCreated = functions.firestore
    .document("schools/{schoolId}/attendanceLog/{logId}")
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    const { schoolId } = context.params;
    const logData = snapshot.data();
    if (!logData)
        return;
    const db = admin.firestore();
    // Check school settings
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const settings = (_a = schoolSnap.data()) === null || _a === void 0 ? void 0 : _a.appSettings;
    if (!(settings === null || settings === void 0 ? void 0 : settings.enableNotifications) || !(settings === null || settings === void 0 ? void 0 : settings.notificationAttendanceEnabled)) {
        return;
    }
    const studentId = logData.studentId;
    const studentSnap = await db.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
    const studentData = studentSnap.data();
    if (!studentData)
        return;
    const prefs = studentData.notificationPrefs && typeof studentData.notificationPrefs === "object"
        ? studentData.notificationPrefs
        : {};
    const parentNotifEnabled = prefs.parentEnabled !== false;
    const studentNotifEnabled = prefs.studentEnabled !== false;
    const studentName = logData.studentName || "A student";
    const status = logData.onTime ? "on time" : "signed in";
    const period = logData.periodLabel ? ` for ${logData.periodLabel}` : "";
    const message = `${studentName} ${status}${period} at ${new Date(logData.signedInAt).toLocaleTimeString()}.`;
    const alerts = [];
    const pEmail = (0, crypto_1.decryptField)(studentData.parentEmail);
    const pPhone = (0, crypto_1.decryptField)(studentData.parentPhone);
    const sEmail = (0, crypto_1.decryptField)(studentData.studentEmail);
    const sPhone = (0, crypto_1.decryptField)(studentData.studentPhone);
    const schoolName = ((_b = schoolSnap.data()) === null || _b === void 0 ? void 0 : _b.name) || "School";
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
exports.adminListMailQueue = functions.https.onCall(async (data, context) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    const schoolId = String(data.schoolId).trim().toLowerCase();
    if (!(await isDeveloper(context))) {
        await requireSchoolAdmin(schoolId, context);
    }
    const limitRaw = data.limit;
    const limitN = typeof limitRaw === "number" && limitRaw > 0 && limitRaw <= 100
        ? Math.floor(limitRaw)
        : 40;
    const db = admin.firestore();
    const snap = await db.collection("mail").where("schoolId", "==", schoolId).limit(limitN).get();
    const items = snap.docs.map((d) => {
        const v = d.data();
        const message = v.message;
        const delivery = v.delivery;
        const subj = (message === null || message === void 0 ? void 0 : message.subject) != null ? String(message.subject) : "";
        const deliveryState = (delivery === null || delivery === void 0 ? void 0 : delivery.state) != null
            ? String(delivery.state)
            : typeof v.state === "string"
                ? v.state
                : "";
        const deliveryError = (delivery === null || delivery === void 0 ? void 0 : delivery.error) != null
            ? String(delivery.error)
            : typeof v.error === "string"
                ? v.error
                : "";
        const deliveryMessage = (delivery === null || delivery === void 0 ? void 0 : delivery.message) != null
            ? String(delivery.message)
            : typeof v.deliveryMessage === "string"
                ? v.deliveryMessage
                : "";
        const deliveryAttempts = typeof (delivery === null || delivery === void 0 ? void 0 : delivery.attempts) === "number" && Number.isFinite(delivery.attempts)
            ? Math.max(0, Math.floor(delivery.attempts))
            : null;
        const toMillisMaybe = (ts) => {
            if (!ts)
                return null;
            if (typeof ts === "number" && Number.isFinite(ts))
                return Math.floor(ts);
            if (typeof ts === "object" && ts) {
                const anyTs = ts;
                if (typeof anyTs.toMillis === "function")
                    return Number(anyTs.toMillis());
                const seconds = typeof anyTs.seconds === "number" ? anyTs.seconds : null;
                const nanos = typeof anyTs.nanoseconds === "number" ? anyTs.nanoseconds : 0;
                if (seconds != null && Number.isFinite(seconds) && Number.isFinite(nanos)) {
                    return Math.floor(seconds * 1000 + nanos / 1000000);
                }
            }
            return null;
        };
        const deliveryStartTimeMs = toMillisMaybe(delivery === null || delivery === void 0 ? void 0 : delivery.startTime);
        const deliveryEndTimeMs = toMillisMaybe(delivery === null || delivery === void 0 ? void 0 : delivery.endTime);
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
exports.adminPreviewTestNotification = functions.https.onCall(async (data, context) => {
    var _a, _b;
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
    const studentName = [studentData.firstName, studentData.lastName].filter(Boolean).join(" ") || studentData.nickname || "A student";
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
    }
    else if (template === "points_award") {
        subject = `Point Award Alert: ${studentName}`;
        subtitle = "Points earned";
        message = `${studentName} just earned 5 points for: Test activity.`;
        accent = "#16a34a";
        icon = "+";
        showArtwork = false;
    }
    else if (template === "milestone") {
        subject = `Milestone Unlocked: ${studentName}`;
        subtitle = "Milestone reached";
        message = `${studentName} unlocked Monthly Champion and earned 25 bonus points.`;
        accent = "#2563eb";
        icon = "T";
        showArtwork = true;
    }
    else if (template === "attendance") {
        subject = `Attendance Alert: ${studentName}`;
        subtitle = "Class sign-in";
        message = `${studentName} signed in for Period 1 at ${new Date().toLocaleTimeString()}.`;
        accent = "#10b981";
        icon = "OK";
        showArtwork = false;
    }
    else if (template === "library_checkout") {
        subject = `Library Checkout Alert: ${studentName}`;
        subtitle = "Library checkout";
        message = `${studentName} checked out: Test book.`;
        accent = "#4f46e5";
        icon = "B";
        showArtwork = false;
    }
    else if (template === "library_return") {
        subject = `Library Return Alert: ${studentName}`;
        subtitle = "Library return";
        message = `${studentName} returned: Test book.`;
        accent = "#4f46e5";
        icon = "B";
        showArtwork = false;
    }
    else {
        throw new functions.https.HttpsError("invalid-argument", "Unknown template");
    }
    const settings = ((_a = schoolSnap.data()) === null || _a === void 0 ? void 0 : _a.appSettings) || {};
    const schoolName = ((_b = schoolSnap.data()) === null || _b === void 0 ? void 0 : _b.name) || "School";
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
    const toParent = (0, crypto_1.decryptField)(studentData.parentEmail) || "";
    const toStudent = (0, crypto_1.decryptField)(studentData.studentEmail) || "";
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
exports.adminSendTestNotification = functions.https.onCall(async (data, context) => {
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
    const preview = await exports.adminPreviewTestNotification(Object.assign(Object.assign({}, data), { schoolId, studentId }), context);
    const db = admin.firestore();
    const studentSnap = await db.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
    const studentData = studentSnap.data() || {};
    const toEmail = recipient === "student" ? (0, crypto_1.decryptField)(studentData.studentEmail) : (0, crypto_1.decryptField)(studentData.parentEmail);
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { mailDocId: docRef.id };
});
// Note: onStudentActivityCreated and onAttendanceLogCreated are exported via
// `export const` above (ES module syntax). No duplicate CommonJS assignment needed.
//# sourceMappingURL=index.js.map