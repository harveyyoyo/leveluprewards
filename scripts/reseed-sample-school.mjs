/**
 * Reseed a built-in demo school (schoolabc | yeshiva) from src/lib/*Data.ts into Firestore,
 * then refresh School Office demo data from the new roster.
 *
 * Usage:
 *   node scripts/reseed-sample-school.mjs yeshiva
 *   node scripts/reseed-sample-school.mjs schoolabc
 *   node scripts/reseed-sample-school.mjs yeshiva --dry-run
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY (JSON) or Application Default Credentials.
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, '.env.local'), override: true });

const DEMO_SCHOOLS = ['schoolabc', 'yeshiva'];
const SUBCOLLECTIONS = ['students', 'classes', 'teachers', 'categories', 'prizes', 'coupons'];
const BATCH_LIMIT = 450;
const PASSCODE = '1234';
const PUBLIC_FIELD_KEYS = ['name', 'logoUrl', 'plan', 'featureOverrides', 'featureSettingsDefaults', 'appSettings'];

/** Mirror of mainSchoolDocToPublicPayload without pulling firebase/firestore into the bundle. */
function mainSchoolDocToPublicPayload(data) {
  const out = {
    active: true,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  };
  for (const key of PUBLIC_FIELD_KEYS) {
    if (key in data) out[key] = data[key];
  }
  return out;
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

async function bundleModule(exportLines) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'sample-school-reseed-'));
  const outfile = path.join(tempDir, 'bundle.mjs');
  const entry = path.join(tempDir, 'entry.ts');
  const srcRoot = path.resolve('src');

  await writeFile(entry, exportLines);

  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    plugins: [
      {
        name: 'workspace-alias',
        setup(builder) {
          builder.onResolve({ filter: /^@\// }, (args) => {
            const basePath = path.join(srcRoot, args.path.slice(2));
            const candidates = [
              basePath,
              `${basePath}.ts`,
              `${basePath}.tsx`,
              `${basePath}.js`,
              `${basePath}.mjs`,
              path.join(basePath, 'index.ts'),
              path.join(basePath, 'index.tsx'),
              path.join(basePath, 'index.js'),
            ];
            return { path: candidates.find((candidate) => existsSync(candidate)) ?? basePath };
          });
        },
      },
    ],
  });

  const mod = await import(pathToFileURL(outfile).href);
  return { mod, cleanup: () => rm(tempDir, { recursive: true, force: true }) };
}

async function clearCollection(schoolRef, collectionName) {
  const snap = await schoolRef.collection(collectionName).get();
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = admin.firestore().batch();
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
  return snap.size;
}

async function clearStudentActivities(schoolRef) {
  const studentsSnap = await schoolRef.collection('students').get();
  let removed = 0;
  for (const studentDoc of studentsSnap.docs) {
    const activitiesSnap = await studentDoc.ref.collection('activities').get();
    if (activitiesSnap.empty) continue;
    for (let i = 0; i < activitiesSnap.docs.length; i += BATCH_LIMIT) {
      const batch = admin.firestore().batch();
      activitiesSnap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    removed += activitiesSnap.size;
  }
  return removed;
}

function enrichStudent(item) {
  return {
    ...item,
    points: item.points || 0,
    lifetimePoints: item.lifetimePoints || item.points || 0,
    categoryPoints: item.categoryPoints || {},
    categoryPointsByPeriod: item.categoryPointsByPeriod || {},
    earnedAchievements: item.earnedAchievements || [],
    earnedBadges: item.earnedBadges || [],
  };
}

async function reseedSchool(db, schoolId, sampleData, helpers) {
  const schoolRef = db.collection('schools').doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    throw new Error(`School "${schoolId}" does not exist in Firestore. Create it first.`);
  }

  const cleared = {};
  cleared.activities = await clearStudentActivities(schoolRef);
  for (const sub of SUBCOLLECTIONS) {
    cleared[sub] = await clearCollection(schoolRef, sub);
  }

  const { students, classes, teachers, categories, prizes, coupons, ...schoolDocData } = sampleData;
  const passcode = PASSCODE;
  const finalSchoolDocData = {
    ...schoolDocData,
    passcode,
    schoolAccessPasscode: passcode,
    adminPasscode: passcode,
    hasMigratedStudents: true,
    hasMigratedClasses: true,
    hasMigratedTeachers: true,
    hasMigratedPrizes: true,
    hasMigratedCoupons: true,
    hasMigratedCategories: true,
    updatedAt: Date.now(),
  };

  const writes = [];
  const pushList = (list, collectionName, transform) => {
    if (!list) return;
    for (const item of list) {
      const data = transform ? transform(item) : item;
      writes.push({
        ref: schoolRef.collection(collectionName).doc(item.id),
        data,
      });
    }
  };

  pushList(students, 'students', enrichStudent);
  pushList(classes, 'classes');
  pushList(teachers, 'teachers');
  pushList(categories, 'categories');
  pushList(prizes, 'prizes');
  pushList(coupons, 'coupons');

  const publicPayload = mainSchoolDocToPublicPayload(finalSchoolDocData);

  const firstBatch = db.batch();
  firstBatch.set(schoolRef, finalSchoolDocData);
  firstBatch.set(db.collection('schoolPublic').doc(schoolId), publicPayload);
  await firstBatch.commit();

  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const write of writes.slice(i, i + BATCH_LIMIT)) {
      batch.set(write.ref, write.data);
    }
    await batch.commit();
  }

  const officePayload = helpers.buildOfficeDemoSeed({
    variant: schoolId,
    students: students ?? [],
    classes: classes ?? [],
  });

  const officeCollections = [
    'officeStudents',
    'officeClasses',
    'officeGradeEntries',
    'officeBillingAccounts',
    'officeInvoices',
  ];
  const officeCleared = {};
  for (const name of officeCollections) {
    officeCleared[name] = await clearCollection(schoolRef, name);
  }

  const officeWrites = [];
  const pushOffice = (list, collectionName) => {
    for (const item of list ?? []) {
      const { id, ...data } = item;
      officeWrites.push({ ref: schoolRef.collection(collectionName).doc(id), data });
    }
  };
  pushOffice(officePayload.officeClasses, 'officeClasses');
  pushOffice(officePayload.officeStudents, 'officeStudents');
  pushOffice(officePayload.gradeEntries, 'officeGradeEntries');
  pushOffice(officePayload.billingAccounts, 'officeBillingAccounts');
  pushOffice(officePayload.invoices, 'officeInvoices');
  for (const account of officePayload.staffAccounts ?? []) {
    officeWrites.push({ ref: schoolRef.collection('staffAccounts').doc(account.id), data: account });
  }

  for (let i = 0; i < officeWrites.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const write of officeWrites.slice(i, i + BATCH_LIMIT)) {
      batch.set(write.ref, write.data);
    }
    await batch.commit();
  }

  const existingAppSettings = schoolSnap.data()?.appSettings ?? {};
  const appSettings = { ...existingAppSettings, payOffice: true };
  const now = Date.now();
  await schoolRef.set({ appSettings, updatedAt: now }, { merge: true });
  await db.collection('schoolPublic').doc(schoolId).set(
    { active: true, appSettings, updatedAt: now },
    { merge: true },
  );

  const verifyStudents = await schoolRef.collection('students').get();
  const verifyClasses = await schoolRef.collection('classes').get();

  return {
    cleared,
    officeCleared,
    students: verifyStudents.size,
    classes: verifyClasses.size,
    officeStudents: officePayload.officeStudents.length,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const schoolId = args.find((a) => a !== '--dry-run')?.trim().toLowerCase();

  if (!schoolId || !DEMO_SCHOOLS.includes(schoolId)) {
    throw new Error(`Usage: node scripts/reseed-sample-school.mjs <${DEMO_SCHOOLS.join('|')}> [--dry-run]`);
  }

  const dataExport =
    schoolId === 'yeshiva'
      ? `import { YESHIVA_DATA } from ${JSON.stringify(path.resolve('src/lib/yeshivaData.ts'))};
         export const sampleData = YESHIVA_DATA;`
      : `import { SCHOOL_DATA } from ${JSON.stringify(path.resolve('src/lib/schoolData.ts'))};
         export const sampleData = SCHOOL_DATA;`;

  const helpersExport = `
    import { buildOfficeDemoSeed } from ${JSON.stringify(path.resolve('src/lib/office/officeDemoSeedFactory.ts'))};
    export { buildOfficeDemoSeed };
  `;

  const dataBundle = await bundleModule(dataExport);
  const helpersBundle = await bundleModule(helpersExport);

  try {
    const { sampleData } = dataBundle.mod;
    const students = sampleData.students ?? [];
    const classes = sampleData.classes ?? [];
    const counts = {};
    for (const s of students) {
      counts[s.classId] = (counts[s.classId] ?? 0) + 1;
    }

    console.log(
      [
        dryRun ? `[dry run] ${schoolId}` : `Reseeding ${schoolId}`,
        `${students.length} students`,
        `${classes.length} classes`,
        `per-class: ${JSON.stringify(counts)}`,
      ].join(' — '),
    );

    if (dryRun) return;

    initializeFirebaseAdmin();
    const db = admin.firestore();
    const result = await reseedSchool(db, schoolId, sampleData, helpersBundle.mod);
    console.log(
      `Done. Firestore now has ${result.students} students, ${result.classes} classes, ${result.officeStudents} office students.`,
    );
    console.log('Cleared:', JSON.stringify({ rewards: result.cleared, office: result.officeCleared }));
  } finally {
    await dataBundle.cleanup();
    await helpersBundle.cleanup();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
