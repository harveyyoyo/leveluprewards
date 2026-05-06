import admin from 'firebase-admin';
import crypto from 'crypto';
import { existsSync } from 'fs';
import path from 'path';

const DEFAULT_BUCKET = 'studio-1273073612-71183.firebasestorage.app';

function requireArg(name, value) {
  if (typeof value !== 'string' || !value.trim()) {
    console.error(`Usage: node scripts/upload-privacy-pdf.mjs --file "C:\\path\\to\\file.pdf" [--dest "Privacy/file.pdf"] [--bucket "${DEFAULT_BUCKET}"]`);
    process.exit(1);
  }
  return value.trim();
}

function getFlag(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const filePath = requireArg('--file', getFlag('--file'));
if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const bucketName = (getFlag('--bucket') || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET).trim();
const dest =
  (getFlag('--dest') || `Privacy/${path.basename(filePath)}`).replace(/^\/+/, '');

let app;
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName,
    });
  } catch {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY (must be JSON).');
    process.exit(1);
  }
} else {
  app = admin.initializeApp({ storageBucket: bucketName });
}

const bucket = admin.storage().bucket();

const downloadToken = crypto.randomUUID();
await bucket.upload(filePath, {
  destination: dest,
  metadata: {
    contentType: 'application/pdf',
    cacheControl: 'public, max-age=3600',
    metadata: {
      firebaseStorageDownloadTokens: downloadToken,
      uploadedBy: 'upload-privacy-pdf.mjs',
      uploadedAt: new Date().toISOString(),
    },
  },
});

const encodedPath = encodeURIComponent(dest).replace(/%2F/g, '%2F');
const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

console.log('Uploaded OK.');
console.log(`Bucket: ${bucketName}`);
console.log(`Path:   ${dest}`);
console.log(`URL:    ${downloadUrl}`);

