/** Repair built-in demo roster links without resetting school data.
 * node scripts/repair-demo-class-assignments.mjs [--apply]
 * Defaults to a read-only plan; saves previous field values locally before applying.
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });
dotenv.config({ path: path.join(root, '.env.local'), override: true, quiet: true });
const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Use --apply or no arguments.');
const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
const credential = key ? JSON.parse(key) : undefined;
const projectId = 'studio-1273073612-71183';
if (credential && credential.project_id !== projectId) throw new Error('Firebase project mismatch.');
if (credential?.private_key) credential.private_key = credential.private_key.replace(/\\n/g, '\n');
admin.initializeApp({ projectId, ...(credential ? { credential: admin.credential.cert(credential) } : {}) });
const db = admin.firestore();

const bundle = await build({
  stdin: { contents: "export { SCHOOL_DATA } from './src/lib/schoolData'; export { YESHIVA_DATA } from './src/lib/yeshivaData';", resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'esm', target: 'node22',
});
const seeds = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

for (const [schoolId, seed] of [['schoolabc', seeds.SCHOOL_DATA], ['yeshiva', seeds.YESHIVA_DATA]]) {
  const schoolRef = db.collection('schools').doc(schoolId);
  const [school, publicSchool, classes, teachers, students] = await Promise.all([
    schoolRef.get(), db.collection('schoolPublic').doc(schoolId).get(),
    schoolRef.collection('classes').get(), schoolRef.collection('teachers').get(), schoolRef.collection('students').get(),
  ]);
  if (!school.exists || !publicSchool.exists) throw new Error(`Missing demo school/public record: ${schoolId}`);
  const teacherIds = new Set(teachers.docs.map((d) => d.id));
  const existingClasses = new Map(classes.docs.map((d) => [d.id, d]));
  const assignments = new Map();
  const patches = [];
  function patch(snapshot, changes) {
    const fields = Object.entries(changes).filter(([field, value]) => JSON.stringify(snapshot.get(field)) !== JSON.stringify(value));
    if (!fields.length) return;
    patches.push({ snapshot, changes: Object.fromEntries(fields), previous: Object.fromEntries(fields.map(([field]) => [field, snapshot.get(field) ?? null])) });
  }
  for (const cls of seed.classes) {
    const current = existingClasses.get(cls.id);
    if (!current || !teacherIds.has(cls.primaryTeacherId)) throw new Error(`Missing seeded class/teacher: ${schoolId}/${cls.id}`);
    const assigned = current.get('primaryTeacherId');
    const teacherId = teacherIds.has(assigned) ? assigned : cls.primaryTeacherId;
    assignments.set(cls.id, teacherId);
    patch(current, { primaryTeacherId: teacherId });
  }
  for (const student of students.docs) {
    const primary = assignments.get(student.get('classId'));
    if (!primary) continue;
    const existing = student.get('teacherIds') ?? [];
    if (!existing.includes(primary)) patch(student, { teacherIds: [...existing, primary] });
  }
  // A minute gives demo visitors time to read while keeping automatic sign-out.
  patch(school, { 'appSettings.kioskSessionTimeoutSec': 60 });
  patch(publicSchool, { 'appSettings.kioskSessionTimeoutSec': 60 });
  console.log(JSON.stringify({ schoolId, mode: apply ? 'apply' : 'plan', writes: patches.length, classes: [...assignments].map(([classId, teacherId]) => ({ classId, teacherId, students: students.docs.filter((s) => s.get('classId') === classId).length })), kioskTimeoutSeconds: 60 }));
  if (!apply || !patches.length) continue;
  const backupDir = await mkdtemp(path.join(tmpdir(), 'levelup-demo-repair-'));
  const backupPath = path.join(backupDir, `${schoolId}.json`);
  await writeFile(backupPath, JSON.stringify(patches.map(({ snapshot, changes, previous }) => ({ path: snapshot.ref.path, previous, changes })), null, 2));
  await db.runTransaction(async (tx) => {
    const fresh = await tx.getAll(...patches.map((p) => p.snapshot.ref));
    for (let i = 0; i < patches.length; i++) {
      if (!fresh[i].updateTime?.isEqual(patches[i].snapshot.updateTime)) throw new Error('Demo data changed during repair; rerun to refresh the plan.');
    }
    for (const { snapshot, changes } of patches) tx.update(snapshot.ref, changes);
  });
  const verified = await db.getAll(...patches.map((p) => p.snapshot.ref));
  verified.forEach((snap, i) => {
    for (const [field, value] of Object.entries(patches[i].changes)) {
      if (JSON.stringify(snap.get(field)) !== JSON.stringify(value)) throw new Error(`Verification failed: ${snap.ref.path}/${field}`);
    }
  });
  console.log(`Verified ${schoolId}. Previous values saved to ${backupPath}`);
}
