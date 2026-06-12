#!/usr/bin/env node
/**
 * Copies School Office code + minimal infra into apps/office.
 * Run once after pulling; safe to re-run (overwrites copies).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const officeRoot = path.join(root, 'apps', 'office');
const officeSrc = path.join(officeRoot, 'src');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(rel) {
  const src = path.join(root, rel);
  const dest = path.join(officeRoot, rel.replace(/^src\//, 'src/'));
  if (!fs.existsSync(src)) {
    console.warn(`skip missing: ${rel}`);
    return;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`copied ${rel}`);
}

function copyDir(rel) {
  const src = path.join(root, rel);
  const dest = path.join(officeRoot, rel);
  if (!fs.existsSync(src)) {
    console.warn(`skip missing dir: ${rel}`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true });
  console.log(`copied dir ${rel}`);
}

ensureDir(officeSrc);

// Office product code (will be removed from rewards root after split)
const officeDirs = [
  'src/app/[schoolId]/office',
  'src/app/office-bootstrap',
  'src/components/office',
  'src/lib/office',
];

const officeFiles = [
  'src/lib/officeRouting.ts',
  'src/lib/officePublicUrl.ts',
  'src/lib/officeRouting.test.ts',
  'src/lib/officePublicUrl.test.ts',
];

// Shared infra (independent copy for isolation)
const infraDirs = [
  'src/firebase',
  'src/components/ui',
  'src/lib/auth',
  'src/lib/middleware',
  'src/lib/server',
  'src/lib/google',
];

const infraHookFiles = [
  'src/hooks/use-toast.ts',
  'src/hooks/use-mobile.tsx',
  'src/hooks/useSchoolMetadataDocRef.ts',
];

const infraFiles = [
  'src/lib/utils.ts',
  'src/lib/schoolPublic.ts',
  'src/lib/productPillars.ts',
  'src/lib/loginResult.ts',
  'src/lib/errorMessage.ts',
  'src/lib/staffDeskLogin.ts',
  'src/lib/adminPasscodeLogin.ts',
  'src/lib/authFetch.ts',
  'src/lib/sampleSchools.ts',
  'src/lib/appBranding.ts',
  'src/lib/portalRouting.ts',
  'src/lib/apiAuth.ts',
  'src/lib/aiModelPreference.ts',
  'src/lib/syncSchoolStaffDirectory.ts',
  'src/lib/adminGoogleAccess.ts',
  'src/lib/developerAccess.ts',
  'src/lib/siteContact.ts',
  'src/lib/yeshivaData.ts',
  'src/lib/schoolData.ts',
  'src/lib/types.ts',
  'src/lib/db/staffAccounts.ts',
  'src/lib/db/helpers.ts',
  'src/app/globals.css',
];

const apiDirs = [
  'src/app/api/auth/office-handoff/complete',
  'src/app/api/auth/office-handoff/verify',
  'src/app/api/auth/verify-staff-passcode',
  'src/app/api/auth/verify-admin-passcode',
  'src/app/api/auth/session',
  'src/app/api/auth/school-gate',
  'src/app/api/parse-office-import',
  'src/app/api/extract-document',
];

for (const d of officeDirs) copyDir(d);
for (const f of officeFiles) copyFile(f);
for (const d of infraDirs) copyDir(d);
for (const f of infraFiles) copyFile(f);
for (const f of infraHookFiles) copyFile(f);
for (const d of apiDirs) copyDir(d);

// Root config copies
for (const f of ['tailwind.config.ts', 'postcss.config.mjs', 'components.json']) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(officeRoot, f));
    console.log(`copied ${f}`);
  }
}

console.log('\nOffice scaffold copy complete.');
