/**
 * Expose local dev (port 3000) over HTTPS and register the hostname in Firebase Auth.
 *
 * By default this uses ngrok. For Cloudflare Quick Tunnels, run:
 *   TUNNEL_PROVIDER=cloudflare npm run dev:tunnel
 *
 * The public URL mirrors the localhost of the machine running this script.
 * Run it on your workstation if you want the URL to match your local browser.
 *
 * Set your free ngrok dev domain in `.env.local` as `NGROK_DOMAIN=yourname.ngrok-free.dev`
 * (claim at https://dashboard.ngrok.com/domains), or pass it in the shell for one run.
 *
 * Requires: ngrok authtoken in %LOCALAPPDATA%\ngrok\ngrok.yml, or npm/npx for
 * Cloudflare Quick Tunnels, plus npm run dev on :3000.
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
const TUNNEL_PROVIDER = (process.env.TUNNEL_PROVIDER || 'ngrok').trim().toLowerCase();
const CLOUDFLARED_BIN = (process.env.CLOUDFLARED_BIN || '').trim();

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

function waitForCloudflaredUrl(cloudflared) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('cloudflared did not publish a trycloudflare.com URL in time'));
    }, 30000);

    const handleOutput = (chunk, stream) => {
      const text = chunk.toString();
      stream.write(chunk);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve(match[0]);
      }
    };

    cloudflared.stdout?.on('data', (chunk) => handleOutput(chunk, process.stdout));
    cloudflared.stderr?.on('data', (chunk) => handleOutput(chunk, process.stderr));
    cloudflared.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    cloudflared.once('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`cloudflared exited before publishing a URL (code ${code ?? 'unknown'})`));
    });
  });
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

function startCloudflared() {
  const targetUrl = `http://127.0.0.1:${PORT}`;
  const command = CLOUDFLARED_BIN || 'npx';
  const args = CLOUDFLARED_BIN
    ? ['tunnel', '--url', targetUrl]
    : ['--yes', 'cloudflared', 'tunnel', '--url', targetUrl];

  return spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
}

console.log('[dev-public-tunnel] Waiting for dev server…');
await waitForDev();

let tunnel;
let url;

if (TUNNEL_PROVIDER === 'cloudflare' || TUNNEL_PROVIDER === 'cloudflared') {
  console.log('[dev-public-tunnel] Starting Cloudflare Quick Tunnel…');
  tunnel = startCloudflared();
  url = await waitForCloudflaredUrl(tunnel);
} else if (TUNNEL_PROVIDER === 'ngrok') {
  if (NGROK_DOMAIN) {
    console.log(`[dev-public-tunnel] Using reserved dev domain: ${NGROK_DOMAIN}`);
  } else {
    console.warn(
      '[dev-public-tunnel] No NGROK_DOMAIN — ngrok will assign a random URL. Add NGROK_DOMAIN to .env.local (see .env.example).',
    );
  }

  console.log('[dev-public-tunnel] Starting ngrok…');
  tunnel = startNgrok();
  url = await getNgrokUrl();
} else {
  throw new Error(`Unsupported TUNNEL_PROVIDER "${TUNNEL_PROVIDER}". Use "ngrok" or "cloudflare".`);
}
const hostname = new URL(url).hostname;

console.log(`\n[dev-public-tunnel] Public URL: ${url}`);
console.log(`[dev-public-tunnel] School login (no Google): ${url}/login`);
console.log(`  Demo: school yeshiva or schoolabc, passcode 1234`);
console.log(`[dev-public-tunnel] Student home portal: ${url}/yeshiva/student-home`);
console.log(`  (replace yeshiva with your school ID; enable in Admin → Student home portal)`);
console.log(`[dev-public-tunnel] Developer (no Google): ${url}/developer`);
console.log(`  Passcode: DEV_DEVELOPER_PASSCODE in .env.local (default local-dev-pass)`);
if (TUNNEL_PROVIDER === 'cloudflare' || TUNNEL_PROVIDER === 'cloudflared') {
  console.log(
    '\n[dev-public-tunnel] Cloudflare Quick Tunnel: keep this terminal open. If you see error 530 on phone, restart dev:tunnel:cloudflare and use the NEW URL printed here.',
  );
}
console.log('');

try {
  await addFirebaseAuthDomain(hostname);
  console.log(`[dev-public-tunnel] Firebase authorized domain added: ${hostname}`);
} catch (e) {
  console.warn('[dev-public-tunnel] Could not update Firebase domains:', e.message);
  console.warn('  Add manually in Firebase Console → Authentication → Authorized domains');
}

if (TUNNEL_PROVIDER === 'ngrok' && !NGROK_DOMAIN) {
  console.log(
    '\nTip: For a shorter stable URL, claim a free static domain at https://dashboard.ngrok.com/domains',
  );
  console.log("Then: $env:NGROK_DOMAIN='yourname.ngrok-free.app'; node scripts/dev-public-tunnel.mjs\n");
}

process.on('SIGINT', () => {
  tunnel.kill();
  process.exit(0);
});
