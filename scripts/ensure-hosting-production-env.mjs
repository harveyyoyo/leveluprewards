/**
 * Ensures `.env` contains production SSR secrets before Firebase Hosting deploy.
 * Copies FIREBASE_SERVICE_ACCOUNT_KEY from `.env.local` when missing from `.env`.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, '.env');
const ENV_LOCAL = path.join(ROOT, '.env.local');
const KEY = 'FIREBASE_SERVICE_ACCOUNT_KEY';

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

function upsertDotenvKey(filePath, key, value) {
  const assignment = `${key}=${JSON.stringify(value)}`;
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').split(/\r?\n/) : [];
  const out = [];
  let replaced = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`)) {
      if (!replaced) {
        out.push(assignment);
        replaced = true;
      }
      continue;
    }
    out.push(line);
  }

  if (!replaced) {
    if (out.length && out[out.length - 1].trim() !== '') out.push('');
    out.push('# Firebase Admin for SSR API routes (hosting backend)');
    out.push(assignment);
  }

  fs.writeFileSync(filePath, out.join('\n').replace(/\n*$/, '') + '\n', 'utf8');
}

const existing = readDotenvKey(ENV_FILE, KEY);
if (existing) {
  console.log(`[hosting-env] ${KEY} already present in .env`);
  process.exit(0);
}

const fromLocal = readDotenvKey(ENV_LOCAL, KEY);
if (!fromLocal) {
  console.warn(
    `[hosting-env] ${KEY} missing from .env and .env.local — SSR auth routes may return 503 in production.`,
  );
  process.exit(0);
}

upsertDotenvKey(ENV_FILE, KEY, fromLocal);
console.log(`[hosting-env] Copied ${KEY} from .env.local into .env for hosting deploy.`);
