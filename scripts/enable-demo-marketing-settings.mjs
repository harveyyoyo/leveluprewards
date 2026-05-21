/**
 * Enables add-on flags on demo school(s) for marketing screenshots.
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in .env.local
 */
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing in .env.local');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

const PATCH = {
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
};

async function main() {
  loadEnvLocal();
  initAdmin();
  const db = admin.firestore();
  const schools = (process.env.DEMO_SCHOOL_ID || 'schoolabc').split(',').map((s) => s.trim());

  for (const schoolId of schools) {
    const ref = db.collection('schools').doc(schoolId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`Skip ${schoolId}: not found`);
      continue;
    }
    const appSettings = { ...(snap.data()?.appSettings || {}), ...PATCH };
    await ref.set({ appSettings }, { merge: true });
    console.log(`Updated appSettings on ${schoolId}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
