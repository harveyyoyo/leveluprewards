/**
 * Ensure John Doe (student 100) + reusable coupon 000 + demo settings on a school.
 *
 * Usage:
 *   node scripts/ensure-sample-kiosk-demo.mjs
 *   node scripts/ensure-sample-kiosk-demo.mjs --school schoolabc
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, '.env.local'), override: true });

const SAMPLE_STUDENT_ID = '100';
const SAMPLE_COUPON_CODE = '000';

const SAMPLE_KIOSK_STUDENT_POINTS = 75;
const SAMPLE_KIOSK_CATEGORY_POINTS = {
  Demo: 10,
  'Good Behavior': 10,
  Leadership: 10,
  'Extra Curricular': 6,
  Attendance: 4,
  Creativity: 4,
  Academics: 2,
  'Helping Others': 2,
  'School Spirit': 2,
};

const SAMPLE_KIOSK_STUDENT_THEME = {
  background: '#0f172a',
  text: '#f1f5f9',
  primary: '#22d3ee',
  cardBackground: '#1e293b',
  accent: '#64748b',
  emoji: '⚾',
  fontScale: 1.05,
};

function buildSampleKioskActivitySeeds(now) {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  return [
    { id: 'demo-act-redeem-000', desc: 'Redeemed coupon: 000 (Demo)', amount: 10, date: now - 2 * hour },
    { id: 'demo-act-good-behavior', desc: 'Points from Mrs. Jones: Good Behavior', amount: 10, date: now - 5 * hour },
    { id: 'demo-act-leadership', desc: 'Points from Mr. Jackson: Leadership', amount: 10, date: now - day },
    { id: 'demo-act-academics', desc: 'Points from Mr. Smith: Academics', amount: 5, date: now - day - 3 * hour },
    { id: 'demo-act-spirit', desc: 'Points from Mr. Brown: School Spirit', amount: 5, date: now - 2 * day },
    { id: 'demo-act-attendance', desc: 'Points from Mr. Wilson: Attendance', amount: 4, date: now - 3 * day },
  ];
}

function parseServiceAccountJson(raw) {
  const parsed = JSON.parse(raw);
  if (parsed?.private_key && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

function initializeFirebaseAdmin() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'studio-1273073612-71183';
  const appOptions = { projectId };
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  const keyFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE?.trim();
  if (raw) {
    admin.initializeApp({
      ...appOptions,
      credential: admin.credential.cert(parseServiceAccountJson(raw)),
    });
    return;
  }
  if (keyFile && existsSync(keyFile)) {
    admin.initializeApp({
      ...appOptions,
      credential: admin.credential.cert(parseServiceAccountJson(readFileSync(keyFile, 'utf8'))),
    });
    return;
  }
  admin.initializeApp(appOptions);
}

function parseArgs(argv) {
  const schoolIdx = argv.indexOf('--school');
  const schoolId =
    schoolIdx >= 0 && argv[schoolIdx + 1]
      ? String(argv[schoolIdx + 1]).trim().toLowerCase()
      : (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
  return { schoolId };
}

async function main() {
  const { schoolId } = parseArgs(process.argv.slice(2));
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const now = Date.now();

  const schoolRef = db.collection('schools').doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    console.error(`School not found: ${schoolId}`);
    process.exit(1);
  }

  const prevSettings = schoolSnap.data()?.appSettings || {};
  const appSettings = {
    ...prevSettings,
    enableStudentWelcomeBackScreen: true,
    enableReusableSampleCoupon: true,
    enableSampleKioskStudent: true,
    reusableSampleCouponCode: SAMPLE_COUPON_CODE,
    reusableSampleCouponValue: 10,
    reusableSampleCouponCategory: 'Demo',
  };

  await schoolRef.set({ appSettings, updatedAt: now }, { merge: true });
  await db.collection('schoolPublic').doc(schoolId).set(
    { appSettings, active: true, updatedAt: now },
    { merge: true },
  );

  await schoolRef.collection('students').doc(SAMPLE_STUDENT_ID).set(
    {
      id: SAMPLE_STUDENT_ID,
      firstName: 'John',
      lastName: 'Doe',
      nfcId: SAMPLE_STUDENT_ID,
      points: SAMPLE_KIOSK_STUDENT_POINTS,
      lifetimePoints: SAMPLE_KIOSK_STUDENT_POINTS,
      classId: 'sc1',
      categoryPoints: SAMPLE_KIOSK_CATEGORY_POINTS,
      categoryPointsByPeriod: {},
      earnedAchievements: [],
      earnedBadges: [],
      theme: SAMPLE_KIOSK_STUDENT_THEME,
      updatedAt: now,
    },
    { merge: true },
  );

  const batch = db.batch();
  for (const activity of buildSampleKioskActivitySeeds(now)) {
    const { id, ...payload } = activity;
    batch.set(
      schoolRef.collection('students').doc(SAMPLE_STUDENT_ID).collection('activities').doc(id),
      payload,
      { merge: true },
    );
  }
  await batch.commit();

  await schoolRef.collection('coupons').doc(SAMPLE_COUPON_CODE).set(
    {
      code: SAMPLE_COUPON_CODE,
      value: 10,
      category: 'Demo',
      teacher: 'Demo',
      used: false,
      reusableSample: true,
      redemptionScope: 'school',
      description: 'Reusable demo coupon 000 for John Doe (student 100).',
      createdAt: now,
      usedAt: admin.firestore.FieldValue.delete(),
      usedBy: admin.firestore.FieldValue.delete(),
    },
    { merge: true },
  );

  console.log(`Sample kiosk demo ready on ${schoolId}:`);
  console.log(`  student: John Doe (ID ${SAMPLE_STUDENT_ID}, ${SAMPLE_KIOSK_STUDENT_POINTS} pts)`);
  console.log(`  activity: ${buildSampleKioskActivitySeeds(now).length} recent entries`);
  console.log(`  coupon: ${SAMPLE_COUPON_CODE} (reusable, 10 pts)`);
  console.log('  settings: enableReusableSampleCoupon + enableSampleKioskStudent');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
