/**
 * Patches demo school appSettings for marketing captures (raffle, houses, etc.).
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'studio-1273073612-71183';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

export const DEMO_MARKETING_APP_SETTINGS_PATCH = {
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

export function loadEnvLocal() {
  dotenv.config({ path: path.join(ROOT, '.env') });
  dotenv.config({ path: path.join(ROOT, '.env.local'), override: true });
}

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  const keyFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE?.trim();
  const appOptions = { projectId: FIREBASE_PROJECT_ID };
  if (raw) {
    admin.initializeApp({
      ...appOptions,
      credential: admin.credential.cert(JSON.parse(raw)),
    });
    return;
  }
  if (keyFile && fs.existsSync(keyFile)) {
    const json = fs.readFileSync(keyFile, 'utf8');
    admin.initializeApp({
      ...appOptions,
      credential: admin.credential.cert(JSON.parse(json)),
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
    const appSettings = {
      ...(snap.data()?.appSettings || {}),
      ...DEMO_MARKETING_APP_SETTINGS_PATCH,
    };
    await ref.set({ appSettings }, { merge: true });
    console.log(`  demo settings: patched appSettings on ${schoolId}`);
  }
  return true;
}
