/**
 * Add a Google email to a school's adminEmails list so that account can
 * open the school (and sign in as admin) without a passcode.
 *
 * node scripts/grant-google-school-access.mjs <schoolId> <email>
 */
import admin from 'firebase-admin';
import { parse as parseDotenv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const envCandidates = [
  path.join(root, '.env.local'),
  path.join(root, '.env'),
  path.join(root, '..', 'leveluprewards', '.env.local'),
];
for (const envPath of envCandidates) {
  if (!fs.existsSync(envPath)) continue;
  const parsed = parseDotenv(fs.readFileSync(envPath));
  for (const [key, value] of Object.entries(parsed)) {
    if (value != null && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

const schoolId = String(process.argv[2] ?? '')
  .trim()
  .toLowerCase();
const email = String(process.argv[3] ?? '')
  .trim()
  .toLowerCase();

if (!schoolId || !email || !email.includes('@')) {
  console.error('Usage: node scripts/grant-google-school-access.mjs <schoolId> <email>');
  process.exit(1);
}

function parseServiceAccountJson(raw) {
  const parsed = JSON.parse(raw);
  if (parsed?.private_key && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
const keyFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE?.trim();
const projectId = process.env.FIREBASE_PROJECT_ID || 'studio-1273073612-71183';
let credential;
if (rawKey) {
  credential = parseServiceAccountJson(rawKey);
} else if (keyFile && fs.existsSync(keyFile)) {
  credential = parseServiceAccountJson(fs.readFileSync(keyFile, 'utf8'));
}

function reportResult(alreadyListed, adminEmails) {
  console.log(JSON.stringify({ schoolId, email, alreadyListed, adminEmails }));
}

function normalizeEmails(values) {
  return values
    .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
    .filter(Boolean);
}

async function grantWithGcloudToken() {
  const token = (process.env.GCLOUD_ACCESS_TOKEN ?? '').trim();
  if (!token) return false;

  const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/schools/${schoolId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const currentRes = await fetch(docUrl, { headers });
  if (currentRes.status === 404) {
    console.error(`School "${schoolId}" was not found.`);
    process.exit(1);
  }
  if (!currentRes.ok) return false;

  const currentDoc = await currentRes.json();
  const current = (currentDoc.fields?.adminEmails?.arrayValue?.values ?? [])
    .map((value) => String(value.stringValue ?? '').trim().toLowerCase())
    .filter(Boolean);
  if (current.includes(email)) {
    reportResult(true, current);
    return true;
  }

  const next = [...current, email];
  const patchRes = await fetch(`${docUrl}?updateMask.fieldPaths=adminEmails`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      fields: {
        adminEmails: {
          arrayValue: {
            values: next.map((value) => ({ stringValue: value })),
          },
        },
      },
    }),
  });
  if (!patchRes.ok) return false;
  const saved = await patchRes.json();
  const written = (saved.fields?.adminEmails?.arrayValue?.values ?? [])
    .map((value) => String(value.stringValue ?? '').trim().toLowerCase())
    .filter(Boolean);
  if (!written.includes(email)) return false;
  reportResult(false, written);
  return true;
}

if (credential) {
  admin.initializeApp({
    projectId,
    credential: admin.credential.cert(credential),
  });

  try {
    const db = admin.firestore();
    const schoolRef = db.collection('schools').doc(schoolId);
    const snap = await schoolRef.get();
    if (!snap.exists) {
      console.error(`School "${schoolId}" was not found.`);
      process.exit(1);
    }

    const current = normalizeEmails(Array.isArray(snap.get('adminEmails')) ? snap.get('adminEmails') : []);
    if (current.includes(email)) {
      reportResult(true, current);
      process.exit(0);
    }

    const next = [...current, email];
    await schoolRef.set({ adminEmails: next }, { merge: true });
    const verified = await schoolRef.get();
    const saved = normalizeEmails(Array.isArray(verified.get('adminEmails')) ? verified.get('adminEmails') : []);
    if (!saved.includes(email)) {
      console.error(`Save failed: ${email} is not on ${schoolId}.adminEmails`);
      process.exit(1);
    }
    reportResult(false, saved);
    process.exit(0);
  } catch {
    // Fall through to the signed-in Cloud login when the saved key is stale.
  }
}

if (await grantWithGcloudToken()) {
  process.exit(0);
}

console.error('Could not update the school list. The saved login key was not accepted.');
process.exit(1);
