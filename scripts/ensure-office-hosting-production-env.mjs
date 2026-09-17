/**
 * Writes apps/office/.env for Firebase Hosting (Web Frameworks) office deploy.
 * Reuses root `.env` when present (CI); otherwise copies SSR secrets from `.env.local`.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OFFICE_ENV = path.join(ROOT, 'apps', 'office', '.env');
const ROOT_ENV = path.join(ROOT, '.env');
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

function readDotenvFile(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = parseDotenvValue(trimmed.slice(eq + 1));
    map.set(key, value);
  }
  return map;
}

function officeProductionDefaults() {
  return {
    NEXT_PUBLIC_ENABLE_DEV_LOGIN: 'false',
    DISABLE_AUTH_SESSION_EDGE: '1',
    PORTAL_CANONICAL_HOST: 'portal.leveluprewards.app',
    NEXT_PUBLIC_PORTAL_CANONICAL_HOST: 'portal.leveluprewards.app',
    AUTH_COOKIE_DOMAIN: '.leveluprewards.app',
  };
}

function serializeEnv(map) {
  const lines = ['# Generated for School Office Firebase Hosting deploy'];
  for (const [key, value] of map.entries()) {
    if (value.includes('\n')) {
      lines.push(`${key}=${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

const rootEnv = readDotenvFile(ROOT_ENV);
const localEnv = readDotenvFile(ENV_LOCAL);
const out = new Map(Object.entries(officeProductionDefaults()));

for (const [key, value] of rootEnv.entries()) {
  if (key.startsWith('OPENAI_') || key.startsWith('GEMINI_') || key.startsWith('GOOGLE_BOOKS_')) {
    out.set(key, value);
  }
  if (key === 'AUTH_GATE_SIGNING_SECRET' || key === HOSTING_KEY) {
    out.set(key, value);
  }
}

if (!out.has(HOSTING_KEY)) {
  const fromLocal = localEnv.get(LOCAL_KEY);
  if (fromLocal) {
    out.set(HOSTING_KEY, fromLocal);
  }
}

if (!out.get('AUTH_GATE_SIGNING_SECRET') && localEnv.get('AUTH_GATE_SIGNING_SECRET')) {
  out.set('AUTH_GATE_SIGNING_SECRET', localEnv.get('AUTH_GATE_SIGNING_SECRET'));
}

fs.mkdirSync(path.dirname(OFFICE_ENV), { recursive: true });
fs.writeFileSync(OFFICE_ENV, serializeEnv(out), 'utf8');

if (!out.get(HOSTING_KEY)) {
  console.warn(
    `[office-hosting-env] ${HOSTING_KEY} missing — office SSR auth routes may return 503 (callable-first login still works).`,
  );
} else {
  console.log(`[office-hosting-env] Wrote ${OFFICE_ENV}`);
}
