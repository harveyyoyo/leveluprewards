/**
 * Ensure every school has the sample test coupon (code 100) for kiosk testing.
 *
 * Usage:
 *   node scripts/ensure-sample-test-coupon.mjs
 *   node scripts/ensure-sample-test-coupon.mjs --dry-run
 *   node scripts/ensure-sample-test-coupon.mjs --school myschool
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY (JSON) or Application Default Credentials.
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, '.env.local'), override: true });

const SAMPLE_TEST_COUPON_CODE = '100';

function buildSampleTestCoupon(createdAt) {
  return {
    code: SAMPLE_TEST_COUPON_CODE,
    value: 10,
    category: 'Test',
    teacher: 'Teacher',
    used: false,
    createdAt,
    redemptionScope: 'school',
    description: 'Sample coupon for testing',
  };
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
  const dryRun = argv.includes('--dry-run');
  const schoolIdx = argv.indexOf('--school');
  const schoolId =
    schoolIdx >= 0 && argv[schoolIdx + 1] ? String(argv[schoolIdx + 1]).trim().toLowerCase() : '';
  return { dryRun, schoolId };
}

async function ensureTestCouponForSchool(db, schoolId, dryRun) {
  const ref = db.collection('schools').doc(schoolId).collection('coupons').doc(SAMPLE_TEST_COUPON_CODE);
  const snap = await ref.get();
  if (snap.exists) {
    return 'skipped';
  }
  if (dryRun) {
    return 'would-create';
  }
  await ref.set(buildSampleTestCoupon(Date.now()));
  return 'created';
}

async function main() {
  const { dryRun, schoolId } = parseArgs(process.argv.slice(2));
  initializeFirebaseAdmin();
  const db = admin.firestore();

  const schoolIds = schoolId
    ? [schoolId]
    : (await db.collection('schools').select().get()).docs.map((d) => d.id);

  let created = 0;
  let skipped = 0;
  let wouldCreate = 0;

  for (const id of schoolIds) {
    const result = await ensureTestCouponForSchool(db, id, dryRun);
    if (result === 'created') {
      created += 1;
      console.log(`  + ${id}: created coupon ${SAMPLE_TEST_COUPON_CODE}`);
    } else if (result === 'would-create') {
      wouldCreate += 1;
      console.log(`  ~ ${id}: would create coupon ${SAMPLE_TEST_COUPON_CODE}`);
    } else {
      skipped += 1;
    }
  }

  const prefix = dryRun ? '[dry-run] ' : '';
  console.log(
    `${prefix}Done: ${created || wouldCreate} ${dryRun ? 'would create' : 'created'}, ${skipped} already had coupon ${SAMPLE_TEST_COUPON_CODE} (${schoolIds.length} schools checked).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
