/**
 * Patches demo school appSettings for marketing captures (raffle, houses, etc.).
 */
import admin from 'firebase-admin';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'studio-1273073612-71183';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

export const DEMO_MARKETING_APP_SETTINGS_PATCH = {
  /** Student kiosk, prize shop, coupon redemption (Level 1 rewards pillar). */
  payRewards: true,
  enableWeeklyRaffle: true,
  enableHouses: true,
  housesRollupPoints: true,
  showHouseOnStudentKiosk: true,
  enableStudentPortal: true,
  enableNotifications: true,
  enableAttendance: true,
  payAttendance: true,
  enableClassSignIn: true,
  payLibrary: true,
  enableAchievements: true,
  enableBadges: true,
  enableClassLeaderboard: true,
  bulletinEnabled: true,
  /** Kiosk promo captures — welcome overlay + balance count-up on sign-in */
  enableStudentWelcomeBackScreen: true,
  studentWelcomeBackDurationSec: 5,
  /** Faster coupon redeem clips (no AI compliment wait) */
  enableCouponRedeemCompliments: false,
  /** All students in raffle pool (0 = general raffle) */
  rafflePointsPerTicket: 0,
  raffleDeductPoints: false,
  raffleDisplayMode: 'jackpot',
  enableGoals: true,
  enablePrizeAiSurprise: true,
  kioskCouponRedemptionManualEnabled: true,
  kioskCouponRedemptionCameraEnabled: false,
  /** Marketing capture: demo student can sign in with DEMO_STUDENT_PORTAL_PASSCODE. */
  studentPortalRequirePasscode: true,
  /** Make teacher raffle tab visible + enabled in capture sessions. */
  teacherPinnedAddOnTabs: ['raffle'],
  teacherHiddenAddOnTabs: [],
};

function hashPortalPasscode(passcode, salt) {
  return crypto.createHash('sha256').update(`${salt}:${passcode.trim()}`, 'utf8').digest('hex');
}

async function lookupStudentIdByBadge(db, schoolId, badgeId) {
  const studentsRef = db.collection('schools').doc(schoolId).collection('students');
  const byDoc = await studentsRef.doc(badgeId).get();
  if (byDoc.exists) return byDoc.id;
  const byStr = await studentsRef.where('nfcId', '==', badgeId).limit(1).get();
  if (!byStr.empty) return byStr.docs[0].id;
  if (/^\d+$/.test(badgeId)) {
    const asNum = Number(badgeId);
    const byNum = await studentsRef.where('nfcId', '==', asNum).limit(1).get();
    if (!byNum.empty) return byNum.docs[0].id;
  }
  return null;
}

/** Fixed 6-digit code for kiosk “+PTS” redeem captures (reset before each capture). */
export const CAPTURE_PROMO_COUPON_CODE = (
  process.env.CAPTURE_DEMO_COUPON_CODE || '888777'
).trim();

/**
 * One kiosk redeem clip per row: different demo student (badge 100100–100109) + your coupon code.
 * Coupon codes must exist on the demo school; capture resets `used` when Firebase admin is available.
 */
export const CAPTURE_COUPON_REDEEM_SCENES = [
  { couponCode: '132403', studentBadgeId: '100100' },
  { couponCode: '230260', studentBadgeId: '100101' },
  { couponCode: '336111', studentBadgeId: '100102' },
  { couponCode: '508131', studentBadgeId: '100103' },
  { couponCode: '598970', studentBadgeId: '100104' },
  { couponCode: '666400', studentBadgeId: '100105' },
  { couponCode: '685335', studentBadgeId: '100106' },
  { couponCode: '738732', studentBadgeId: '100107' },
  { couponCode: '775872', studentBadgeId: '100108' },
  { couponCode: '844901', studentBadgeId: '100109' },
];

export function loadEnvLocal() {
  dotenv.config({ path: path.join(ROOT, '.env') });
  dotenv.config({ path: path.join(ROOT, '.env.local'), override: true });
}

function parseServiceAccountJson(raw) {
  const parsed = JSON.parse(raw);
  if (parsed?.private_key && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  const keyFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE?.trim();
  const appOptions = { projectId: FIREBASE_PROJECT_ID };
  if (raw) {
    admin.initializeApp({
      ...appOptions,
      credential: admin.credential.cert(parseServiceAccountJson(raw)),
    });
    return;
  }
  if (keyFile && fs.existsSync(keyFile)) {
    const json = fs.readFileSync(keyFile, 'utf8');
    admin.initializeApp({
      ...appOptions,
      credential: admin.credential.cert(parseServiceAccountJson(json)),
    });
    return;
  }
  // gcloud ADC or GOOGLE_APPLICATION_CREDENTIALS
  admin.initializeApp(appOptions);
}

/**
 * @returns {Promise<boolean>} true when patch applied
 */
export async function patchDemoMarketingSettings() {
  loadEnvLocal();
  try {
    initAdmin();
  } catch {
    return false;
  }
  const db = admin.firestore();
  const schools = (process.env.DEMO_SCHOOL_ID || 'schoolabc')
    .split(',')
    .map((s) => s.trim());

  for (const schoolId of schools) {
    const ref = db.collection('schools').doc(schoolId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`  demo settings: skip ${schoolId} (not found)`);
      continue;
    }
    const prev = snap.data()?.appSettings || {};
    const appSettings = {
      ...prev,
      ...DEMO_MARKETING_APP_SETTINGS_PATCH,
      teacherFeatures: {
        ...(prev.teacherFeatures || {}),
        students: true,
        classes: true,
        points: true,
        raffle: true,
        printer: true,
      },
    };
    await ref.set({ appSettings }, { merge: true });
    const publicRef = db.collection('schoolPublic').doc(schoolId);
    await publicRef.set(
      { appSettings, active: true, updatedAt: Date.now() },
      { merge: true },
    );
    console.log(
      `  demo settings: patched appSettings on ${schoolId} (+ schoolPublic mirror, payRewards=${appSettings.payRewards})`,
    );
  }
  return true;
}

/**
 * Sets portal passcode for the demo capture student (badge 100 by default).
 * @returns {Promise<boolean>}
 */
export async function ensureDemoStudentPortalPasscode() {
  loadEnvLocal();
  try {
    initAdmin();
  } catch {
    return false;
  }
  const db = admin.firestore();
  const schoolId = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
  const badgeId = (process.env.DEMO_STUDENT_BADGE_ID || '100100').trim();
  const passcode = (process.env.DEMO_STUDENT_PORTAL_PASSCODE || '1234').trim();
  const studentId = await lookupStudentIdByBadge(db, schoolId, badgeId);
  if (!studentId) {
    console.warn(`  demo student portal: no student for badge ${badgeId} on ${schoolId}`);
    return false;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const portalPasscodeHash = hashPortalPasscode(passcode, salt);
  await db
    .collection('schools')
    .doc(schoolId)
    .collection('secrets')
    .doc(`portal_${studentId}`)
    .set({ portalPasscodeHash, portalPasscodeSalt: salt }, { merge: true });
  await db
    .collection('schools')
    .doc(schoolId)
    .collection('students')
    .doc(studentId)
    .set(
      {
        portalPasscodeSet: true,
        portalLocked: false,
        portalFailedAttempts: 0,
      },
      { merge: true },
    );
  console.log(
    `  demo student portal: passcode set for ${studentId} (badge ${badgeId}) on ${schoolId}`,
  );
  return true;
}

/**
 * Seeds an unused demo coupon for kiosk redeem captures.
 * @returns {Promise<boolean>}
 */
export async function ensureCapturePromoCoupon() {
  loadEnvLocal();
  try {
    initAdmin();
  } catch {
    return false;
  }
  const db = admin.firestore();
  const schoolId = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
  const code = CAPTURE_PROMO_COUPON_CODE.toUpperCase();
  const ref = db.collection('schools').doc(schoolId).collection('coupons').doc(code);
  await ref.set({
    code,
    value: 25,
    category: 'Good Behavior',
    used: false,
    redemptionScope: 'school',
    createdAt: Date.now(),
  });
  console.log(`  demo coupon: ${code} (25 pts, unused) on ${schoolId}`);
  return true;
}

/**
 * Marks listed coupons unused so kiosk redeem captures can run (requires admin credentials).
 * @param {string[]} codes
 * @returns {Promise<boolean>}
 */
export async function ensureCaptureCouponsUnused(codes) {
  loadEnvLocal();
  try {
    initAdmin();
  } catch {
    return false;
  }
  const db = admin.firestore();
  const schoolId = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
  let reset = 0;
  for (const raw of codes) {
    const code = String(raw).trim().toUpperCase();
    if (!code) continue;
    const ref = db.collection('schools').doc(schoolId).collection('coupons').doc(code);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`  demo coupon: ${code} not found on ${schoolId} — create it before capture`);
      continue;
    }
    await ref.set(
      {
        used: false,
        usedAt: admin.firestore.FieldValue.delete(),
        usedBy: admin.firestore.FieldValue.delete(),
      },
      { merge: true },
    );
    reset += 1;
  }
  console.log(`  demo coupons: reset ${reset}/${codes.length} to unused on ${schoolId}`);
  return reset > 0;
}
