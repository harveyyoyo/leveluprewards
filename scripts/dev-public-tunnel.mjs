/**
 * Expose local dev (port 3000) over HTTPS and register the hostname in Firebase Auth.
 *
 * Set your free ngrok dev domain in `.env.local` as `NGROK_DOMAIN=yourname.ngrok-free.dev`
 * (claim at https://dashboard.ngrok.com/domains), or pass it in the shell for one run.
 *
 * Requires: ngrok authtoken in %LOCALAPPDATA%\ngrok\ngrok.yml, npm run dev on :3000
 */
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Load NGROK_DOMAIN (and other keys) from `.env.local` when not already set in the shell. */
function loadEnvLocal() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const PROJECT_ID = 'studio-1273073612-71183';
const PORT = process.env.PORT || '3000';
const NGROK_DOMAIN = (process.env.NGROK_DOMAIN || '').trim();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForDev() {
  const url = `http://127.0.0.1:${PORT}/login`;
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(2000);
  }
  throw new Error(`Dev server not ready at ${url} — run npm run dev first`);
}

async function getNgrokUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:4040/api/tunnels');
      const data = await res.json();
      const tunnel = data.tunnels?.find((t) => t.proto === 'https');
      if (tunnel?.public_url) return tunnel.public_url;
    } catch {
      /* ngrok API not up yet */
    }
    await sleep(1000);
  }
  throw new Error('ngrok did not start — check authtoken in ngrok.yml');
}

async function addFirebaseAuthDomain(hostname) {
  const ft = `${process.env.APPDATA}/npm/node_modules/firebase-tools`;
  const auth = require(`${ft}/lib/auth`);
  const gcpAuth = require(`${ft}/lib/gcp/auth`);
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error('Run: npx firebase-tools login');
  await auth.getAccessToken(account.tokens.refresh_token, []);
  const domains = await gcpAuth.getAuthDomains(PROJECT_ID);
  if (!domains.includes(hostname)) {
    domains.push(hostname);
    await gcpAuth.updateAuthDomains(PROJECT_ID, domains);
  }
}

function startNgrok() {
  const args = ['http', PORT, '--log=stdout'];
  if (NGROK_DOMAIN) args.push('--domain', NGROK_DOMAIN);
  return spawn('ngrok', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

console.log('[dev-public-tunnel] Waiting for dev server…');
await waitForDev();

if (NGROK_DOMAIN) {
  console.log(`[dev-public-tunnel] Using reserved dev domain: ${NGROK_DOMAIN}`);
} else {
  console.warn(
    '[dev-public-tunnel] No NGROK_DOMAIN — ngrok will assign a random URL. Add NGROK_DOMAIN to .env.local (see .env.example).',
  );
}

console.log('[dev-public-tunnel] Starting ngrok…');
const ngrok = startNgrok();
const url = await getNgrokUrl();
const hostname = new URL(url).hostname;

console.log(`\n[dev-public-tunnel] Public URL: ${url}`);
console.log(`[dev-public-tunnel] School login (no Google): ${url}/login`);
console.log(`  Demo: school yeshiva or schoolabc, passcode 1234`);
console.log(`[dev-public-tunnel] Developer (no Google): ${url}/developer`);
console.log(`  Passcode: DEV_DEVELOPER_PASSCODE in .env.local (default local-dev-pass)\n`);

try {
  await addFirebaseAuthDomain(hostname);
  console.log(`[dev-public-tunnel] Firebase authorized domain added: ${hostname}`);
} catch (e) {
  console.warn('[dev-public-tunnel] Could not update Firebase domains:', e.message);
  console.warn('  Add manually in Firebase Console → Authentication → Authorized domains');
}

if (!NGROK_DOMAIN) {
  console.log(
    '\nTip: For a shorter stable URL, claim a free static domain at https://dashboard.ngrok.com/domains',
  );
  console.log("Then: $env:NGROK_DOMAIN='yourname.ngrok-free.app'; node scripts/dev-public-tunnel.mjs\n");
}

process.on('SIGINT', () => {
  ngrok.kill();
  process.exit(0);
});
