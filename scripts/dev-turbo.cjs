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

let cleanedNext = false;
if (!process.env.SKIP_CLEAN_NEXT) {
  const nextDir = path.join(root, '.next');
  const err = rmNextWithRetries(nextDir);
  if (err === true) {
    cleanedNext = true;
    console.log('[dev:turbo] Cleaned .next for Turbopack (set SKIP_CLEAN_NEXT=1 to skip).\n');
  } else {
    console.warn('[dev:turbo] Could not remove .next after retries:', (err && err.message) || err);
    console.warn('[dev:turbo] Stop other Next.js processes (npm run dev / build), then retry.\n');
  }
}

/* Windows + Turbopack: antivirus / FS locks can race — Next reads edge chunks before emit finishes → ENOENT under .next/server/edge/chunks. */
if (cleanedNext && process.platform === 'win32') {
  const ms = Math.min(2000, Math.max(0, parseInt(process.env.TURBOPACK_POST_CLEAN_WAIT_MS || '400', 10) || 400));
  if (ms > 0) {
    console.log(`[dev:turbo] Waiting ${ms}ms after clean (Windows; set TURBOPACK_POST_CLEAN_WAIT_MS=0 to skip).\n`);
    sleepMs(ms);
  }
}

const port = String(process.env.PORT || '3000').trim() || '3000';
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
console.log(`[dev:turbo] Listening on http://localhost:${port} — use this URL only.`);
if (process.platform === 'win32') {
  console.log(
    '[dev:turbo] If you get ENOENT on .next/server/edge/chunks: stop all Next processes, npm run clean:next, retry; or use npm run dev (Webpack, no Turbopack).\n',
  );
} else {
  console.log('');
}
const child = spawn(process.execPath, [nextCli, 'dev', '--turbo', '-p', port], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 0));
