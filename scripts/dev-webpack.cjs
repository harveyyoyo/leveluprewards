/**
 * Webpack `next dev`: clean `.next` before starting so chunk graphs stay consistent.
 * Prevents intermittent Windows dev errors like `Cannot find module './1682.js'` when
 * `.next/server/webpack-runtime.js` references numbered chunks that no longer exist
 * after HMR, crashed builds, or switching Turbopack ↔ Webpack without a full clean.
 *
 * Set SKIP_CLEAN_NEXT=1 to skip (faster restart; risk of stale/missing chunks).
 *
 * Port: defaults to 3000 (`PORT` overrides).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync wait — keeps launcher simple for Windows EPERM retries */
  }
}

function rmNextWithRetries(dir, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return true;
    } catch (e) {
      lastErr = e;
      sleepMs(150 * (i + 1));
    }
  }
  return lastErr;
}

let cleanedNext = false;
if (!process.env.SKIP_CLEAN_NEXT) {
  const nextDir = path.join(root, '.next');
  const err = rmNextWithRetries(nextDir);
  if (err === true) {
    cleanedNext = true;
    console.log('[dev:webpack] Cleaned .next before dev (set SKIP_CLEAN_NEXT=1 to skip).\n');
  } else {
    console.warn('[dev:webpack] Could not remove .next after retries:', (err && err.message) || err);
    console.warn('[dev:webpack] Stop other Next.js processes, then retry.\n');
  }
}

if (cleanedNext && process.platform === 'win32') {
  const ms = Math.min(2000, Math.max(0, parseInt(process.env.WEBPACK_POST_CLEAN_WAIT_MS || '400', 10) || 400));
  if (ms > 0) {
    console.log(`[dev:webpack] Waiting ${ms}ms after clean (Windows; set WEBPACK_POST_CLEAN_WAIT_MS=0 to skip).\n`);
    sleepMs(ms);
  }
}

const port = String(process.env.PORT || '3000').trim() || '3000';
// On some Windows setups, `localhost` resolves to IPv6 (::1) and can hang while 127.0.0.1 works.
// Default to 127.0.0.1 for a reliable local dev experience; override with HOST=0.0.0.0 for LAN access.
const host = String(process.env.HOST || '127.0.0.1').trim() || '127.0.0.1';
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
console.log(`[dev:webpack] Listening on http://${host}:${port}`);
console.log('[dev:webpack] If you see Cannot find module \'./NNNN.js\': stop dev, run `npm run dev:reset`, use one dev server only.\n');

const child = spawn(process.execPath, [nextCli, 'dev', '-H', host, '-p', port], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 0));
