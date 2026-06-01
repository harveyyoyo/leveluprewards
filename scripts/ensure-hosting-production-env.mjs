/**
 * Ensures `.env` contains production SSR secrets before Firebase Hosting deploy.
 * Copies service account JSON from `.env.local` (`FIREBASE_SERVICE_ACCOUNT_KEY`)
 * into `.env` as `SSR_SERVICE_ACCOUNT_JSON` (Firebase reserves the FIREBASE_ prefix).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, '.env');
const ENV_LOCAL = path.join(ROOT, '.env.local');
const LOCAL_KEY = 'FIREBASE_SERVICE_ACCOUNT_KEY';
const HOSTING_KEY = 'SSR_SERVICE_ACCOUNT_JSON';

function parseDotenvValue(raw) {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).replace(/\\n/g, '\n').replace(/\\'/g, "'");
  }
  return trimmed;
}

function readDotenvKey(filePath, key) {
  if (!fs.existsSync(filePath)) return null;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!trimmed.startsWith(`${key}=`)) continue;
    const value = parseDotenvValue(trimmed.slice(key.length + 1));
    return value.trim() ? value : null;
  }
  return null;
}

function upsertHostingServiceAccount(filePath, value) {
  const assignment = `${HOSTING_KEY}=${JSON.stringify(value)}`;
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').split(/\r?\n/) : [];
  const out = [];
  let replaced = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${HOSTING_KEY}=`)) {
      if (!replaced) {
        out.push(assignment);
        replaced = true;
      }
      continue;
    }
    if (trimmed.startsWith(`${LOCAL_KEY}=`)) continue;
    out.push(line);
  }

  if (!replaced) {
    if (out.length && out[out.length - 1].trim() !== '') out.push('');
    out.push('# Firebase Admin for SSR API routes (hosting backend; not FIREBASE_ prefix)');
    out.push(assignment);
  }

  fs.writeFileSync(filePath, out.join('\n').replace(/\n*$/, '') + '\n', 'utf8');
}

const existing = readDotenvKey(ENV_FILE, HOSTING_KEY);
if (existing) {
  console.log(`[hosting-env] ${HOSTING_KEY} already present in .env`);
  process.exit(0);
}

const fromLocal = readDotenvKey(ENV_LOCAL, LOCAL_KEY);
if (!fromLocal) {
  console.warn(
    `[hosting-env] ${LOCAL_KEY} missing from .env.local — SSR auth routes may return 503 (callable-first login still works).`,
  );
  process.exit(0);
}

upsertHostingServiceAccount(ENV_FILE, fromLocal);
console.log(`[hosting-env] Wrote ${HOSTING_KEY} to .env from .env.local ${LOCAL_KEY}.`);
