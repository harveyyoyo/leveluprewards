/**
 * One-off: grant roles_admin at a school for a Firebase UID (Admin SDK).
 * Usage: node scripts/provision-office-admin-role.mjs schoolabc <uid>
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const schoolId = (process.argv[2] || 'schoolabc').trim().toLowerCase();
const uid = (process.argv[3] || '').trim();
if (!uid) {
  console.error('Usage: node scripts/provision-office-admin-role.mjs <schoolId> <firebaseUid>');
  process.exit(1);
}

const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY missing in .env.local');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(key)) });

await admin
  .firestore()
  .doc(`schools/${schoolId}/roles_admin/${uid}`)
  .set({ role: 'admin' }, { merge: true });

console.log(`OK: schools/${schoolId}/roles_admin/${uid}`);
