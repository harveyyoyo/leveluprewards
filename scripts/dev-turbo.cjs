/**
 * Turbopack + a prior Webpack dev build can leave mixed RSC bindings under `.next`
 * ("Expected to use Turbopack bindings ... but ... Webpack bindings").
 * Cleaning `.next` before `next dev --turbo` avoids that mismatch.
 *
 * Also avoid running `npm run dev` and `npm run dev:turbo` at the same time, or
 * `next build` while a dev server is running — mixed writes to `.next` reproduce the crash.
 *
 * Set SKIP_CLEAN_NEXT=1 to skip the delete (faster restarts; risk of stale cache).
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

const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextCli, 'dev', '--turbo'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 0));
