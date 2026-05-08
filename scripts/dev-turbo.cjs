/**
 * Turbopack + a prior Webpack dev build can leave mixed RSC bindings under `.next`
 * ("Expected to use Turbopack bindings ... but ... Webpack bindings").
 * Cleaning `.next` before `next dev --turbo` avoids that mismatch.
 *
 * Also avoid running `npm run dev` and `npm run dev:turbo` at the same time, or
 * `next build` while a dev server is running — mixed writes to `.next` reproduce the crash.
 *
 * Set SKIP_CLEAN_NEXT=1 to skip the delete (faster restarts; risk of stale cache).
 *
 * Port: defaults to 3000 (`PORT` env overrides). Opening a different host/port than the
 * running dev server serves stale HTML that references chunk hashes the wrong process
 * does not have → 404 on `_next/static/chunks/*.js` and a stuck "Loading levelUp EDU" shell.
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

if (!process.env.SKIP_CLEAN_NEXT) {
  const nextDir = path.join(root, '.next');
  const err = rmNextWithRetries(nextDir);
  if (err === true) {
    console.log('[dev:turbo] Cleaned .next for Turbopack (set SKIP_CLEAN_NEXT=1 to skip).\n');
  } else {
    console.warn('[dev:turbo] Could not remove .next after retries:', (err && err.message) || err);
    console.warn('[dev:turbo] Stop other Next.js processes (npm run dev / build), then retry.\n');
  }
}

const port = String(process.env.PORT || '3000').trim() || '3000';
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
console.log(`[dev:turbo] Listening on http://localhost:${port} — use this URL only.\n`);
const child = spawn(process.execPath, [nextCli, 'dev', '--turbo', '-p', port], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 0));
