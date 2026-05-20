import admin from 'firebase-admin';
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEMO_SCHOOLS = ['schoolabc', 'yeshiva'];
const OFFICE_COLLECTIONS = [
  'officeStudents',
  'officeClasses',
  'officeGradeEntries',
  'officeBillingAccounts',
  'officeInvoices',
];
const BATCH_LIMIT = 450;
const DRY_RUN_FIXTURES = {
  students: [
    { id: '100', firstName: 'Demo', lastName: 'Student', classId: 'demo-class-1' },
    { id: '101', firstName: 'Sample', lastName: 'Family', classId: 'demo-class-1' },
    { id: '102', firstName: 'Office', lastName: 'Family', classId: 'demo-class-2' },
  ],
  classes: [
    { id: 'demo-class-1', name: 'Demo Class 1' },
    { id: 'demo-class-2', name: 'Demo Class 2' },
  ],
  teachers: [
    { id: 'demo-teacher-1', name: 'Demo Teacher', username: 'teacher' },
  ],
};

function initializeFirebaseAdmin() {
  if (admin.apps.length) return;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return;
    } catch {
      throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON.');
    }
  }

  admin.initializeApp();
}

async function loadSeedFactory() {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'demo-office-seed-'));
  const outfile = path.join(tempDir, 'seed-factory.mjs');
  const entry = path.join(tempDir, 'entry.ts');
  const srcRoot = path.resolve('src');

  await writeFile(
    entry,
    `
      import { buildOfficeDemoSeed } from ${JSON.stringify(path.resolve('src/lib/office/officeDemoSeedFactory.ts'))};

      export { buildOfficeDemoSeed };
    `,
  );

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
  return {
    buildOfficeDemoSeed: mod.buildOfficeDemoSeed,
    cleanup: () => rm(tempDir, { recursive: true, force: true }),
  };
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

function collectSeedWrites(schoolRef, payload) {
  const writes = [];

  for (const item of payload.officeClasses) {
    const { id, ...data } = item;
    writes.push({ ref: schoolRef.collection('officeClasses').doc(id), data });
  }
  for (const item of payload.officeStudents) {
    const { id, ...data } = item;
    writes.push({ ref: schoolRef.collection('officeStudents').doc(id), data });
  }
  for (const item of payload.gradeEntries) {
    const { id, ...data } = item;
    writes.push({ ref: schoolRef.collection('officeGradeEntries').doc(id), data });
  }
  for (const item of payload.billingAccounts) {
    const { id, ...data } = item;
    writes.push({ ref: schoolRef.collection('officeBillingAccounts').doc(id), data });
  }
  for (const item of payload.invoices) {
    const { id, ...data } = item;
    writes.push({ ref: schoolRef.collection('officeInvoices').doc(id), data });
  }
  for (const item of payload.staffAccounts) {
    writes.push({ ref: schoolRef.collection('staffAccounts').doc(item.id), data: item });
  }

  return writes;
}

async function commitWrites(writes) {
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = admin.firestore().batch();
    for (const write of writes.slice(i, i + BATCH_LIMIT)) {
      batch.set(write.ref, write.data);
    }
    await batch.commit();
  }
}

async function readCollectionWithIds(schoolRef, collectionName) {
  const snap = await schoolRef.collection(collectionName).get();
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

function normalizePortalKeyPart(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
}

function buildStaffDirectory(teachers, staffAccounts) {
  const rows = new Map();
  const now = Date.now();
  const portalRoles = new Set(['secretary', 'prizeClerk', 'reports', 'librarian', 'office']);

  for (const teacher of teachers ?? []) {
    const name = String(teacher.name || '').trim();
    const username = String(teacher.username || teacher.id || '').trim();
    if (!name || !username) continue;
    const id = `teacher:${normalizePortalKeyPart(username) || teacher.id}`;
    rows.set(id, {
      id,
      sourceId: teacher.id,
      type: 'teacher',
      label: name,
      username,
      updatedAt: now,
    });
  }

  for (const account of staffAccounts ?? []) {
    const username = String(account.username || '').trim().toLowerCase();
    const label = String(account.displayName || '').trim();
    if (!username || !label) continue;

    const roles = Array.isArray(account.roles) && account.roles.length ? account.roles : [account.role];
    for (const role of roles) {
      if (!portalRoles.has(role)) continue;
      const id = `${role}:${account.id}`;
      rows.set(id, {
        id,
        sourceId: account.id,
        type: role,
        label,
        username,
        updatedAt: now,
      });
    }
  }

  return Array.from(rows.values());
}

async function seedSchool(db, schoolId, factory) {
  const schoolRef = db.collection('schools').doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) {
    throw new Error(`School "${schoolId}" does not exist. Create/reset the sample school first.`);
  }

  const [students, classes, teachers] = await Promise.all([
    readCollectionWithIds(schoolRef, 'students'),
    readCollectionWithIds(schoolRef, 'classes'),
    readCollectionWithIds(schoolRef, 'teachers'),
  ]);
  const payload = factory.buildOfficeDemoSeed({
    variant: schoolId,
    students,
    classes,
  });
  const removed = {};
  for (const collectionName of OFFICE_COLLECTIONS) {
    removed[collectionName] = await clearCollection(schoolRef, collectionName);
  }

  await commitWrites(collectSeedWrites(schoolRef, payload));

  const existingAppSettings = schoolSnap.data()?.appSettings ?? {};
  const appSettings = { ...existingAppSettings, payOffice: true };
  const now = Date.now();
  await schoolRef.set({ appSettings, updatedAt: now }, { merge: true });

  const currentStaffAccounts = await readCollectionWithIds(schoolRef, 'staffAccounts');
  const staffDirectory = buildStaffDirectory(
    teachers,
    currentStaffAccounts,
  );

  await db.collection('schoolPublic').doc(schoolId).set(
    {
      active: true,
      appSettings,
      staffDirectory,
      staffDirectoryUpdatedAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  return { payload, removed, staffDirectoryCount: staffDirectory.length };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const requestedSchools = args
    .filter((arg) => arg !== '--dry-run')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const schools = requestedSchools.length ? requestedSchools : DEMO_SCHOOLS;
  const invalid = schools.filter((schoolId) => !DEMO_SCHOOLS.includes(schoolId));
  if (invalid.length) {
    throw new Error(`Unsupported demo school(s): ${invalid.join(', ')}. Use ${DEMO_SCHOOLS.join(', ')}.`);
  }

  const factory = await loadSeedFactory();

  try {
    if (dryRun) {
      for (const schoolId of schools) {
        const payload = factory.buildOfficeDemoSeed({
          variant: schoolId,
          students: DRY_RUN_FIXTURES.students,
          classes: DRY_RUN_FIXTURES.classes,
        });
        console.log(
          [
            `Dry run ${schoolId}:`,
            `${payload.officeStudents.length} office students`,
            `${payload.officeClasses.length} classes`,
            `${payload.gradeEntries.length} grades`,
            `${payload.billingAccounts.length} billing accounts`,
            `${payload.invoices.length} invoices`,
            `${payload.staffAccounts.length} office staff login`,
            `${DRY_RUN_FIXTURES.teachers.length} teachers for staff directory sync`,
          ].join(' '),
        );
      }
      return;
    }

    initializeFirebaseAdmin();
    const db = admin.firestore();
    for (const schoolId of schools) {
      const result = await seedSchool(db, schoolId, factory);
      console.log(
        [
          `Seeded ${schoolId}:`,
          `${result.payload.officeStudents.length} office students`,
          `${result.payload.officeClasses.length} classes`,
          `${result.payload.gradeEntries.length} grades`,
          `${result.payload.billingAccounts.length} billing accounts`,
          `${result.payload.invoices.length} invoices`,
          `${result.payload.staffAccounts.length} office staff login`,
          `${result.staffDirectoryCount} public staff options`,
        ].join(' '),
      );
    }
  } finally {
    await factory.cleanup();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
