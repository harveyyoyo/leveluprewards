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
const http = require('http');
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
function killChild(child) {
  if (!child || child.killed) return;
  try {
    child.kill('SIGTERM');
  } catch {}
  // Windows: SIGTERM may be ignored; force kill shortly after.
  setTimeout(() => {
    try {
      if (child.exitCode == null && !child.killed) child.kill('SIGKILL');
    } catch {}
  }, 1500);
}

function httpHealthcheckOnce({ host = '127.0.0.1', port, path = '/', timeoutMs = 8000 }) {
  return new Promise((resolve) => {
    const req = http.request(
      { host, port: Number(port), path, method: 'GET' },
      (res) => {
        // Drain; we only care that the server responded.
        res.resume();
        resolve(res.statusCode && res.statusCode < 600);
      },
    );
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      try {
        req.destroy(new Error('timeout'));
      } catch {}
      resolve(false);
    });
    req.end();
  });
}

function createWatchdog({ port }) {
  const enabled =
    // Default ON for Windows where we’ve observed hangs; opt-out with DEV_TURBO_WATCHDOG=0
    process.env.DEV_TURBO_WATCHDOG !== '0' && process.env.DEV_TURBO_WATCHDOG !== 'false';
  if (!enabled) return { start() {}, stop() {} };

  const intervalMs = Math.min(60000, Math.max(5000, Number(process.env.DEV_TURBO_WATCHDOG_INTERVAL_MS || 15000)));
  const timeoutMs = Math.min(30000, Math.max(1000, Number(process.env.DEV_TURBO_WATCHDOG_TIMEOUT_MS || 8000)));
  const maxConsecutiveFailures = Math.min(
    10,
    Math.max(2, Number(process.env.DEV_TURBO_WATCHDOG_MAX_FAILURES || 3)),
  );
  const maxRestarts = Math.min(10, Math.max(0, Number(process.env.DEV_TURBO_WATCHDOG_MAX_RESTARTS || 3)));
  const restartWindowMs = Math.min(
    60 * 60 * 1000,
    Math.max(60 * 1000, Number(process.env.DEV_TURBO_WATCHDOG_RESTART_WINDOW_MS || 10 * 60 * 1000)),
  );

  let timer = null;
  let consecutiveFailures = 0;
  /** @type {number[]} */
  let restartTimestamps = [];

  function recordRestart() {
    const now = Date.now();
    restartTimestamps = restartTimestamps.filter((t) => now - t < restartWindowMs);
    restartTimestamps.push(now);
  }

  function canRestart() {
    const now = Date.now();
    restartTimestamps = restartTimestamps.filter((t) => now - t < restartWindowMs);
    return restartTimestamps.length < maxRestarts;
  }

  async function tick(getChild, restart) {
    const ok = await httpHealthcheckOnce({ port, timeoutMs });
    if (ok) {
      consecutiveFailures = 0;
      return;
    }

    consecutiveFailures += 1;
    if (consecutiveFailures < maxConsecutiveFailures) return;
    consecutiveFailures = 0;

    if (!canRestart()) {
      console.warn(
        `[dev:turbo] Watchdog: server unresponsive but restart limit reached (${maxRestarts} per ${Math.round(
          restartWindowMs / 60000,
        )}m). Please stop and restart manually.`,
      );
      return;
    }

    console.warn('[dev:turbo] Watchdog: server unresponsive — restarting dev server...');
    recordRestart();
    restart(getChild());
  }

  return {
    start(getChild, restart) {
      if (timer) return;
      // Give Next a moment to boot before we start checking.
      const initialDelayMs = Math.min(120000, Math.max(5000, Number(process.env.DEV_TURBO_WATCHDOG_START_DELAY_MS || 20000)));
      timer = setTimeout(() => {
        timer = setInterval(() => tick(getChild, restart), intervalMs);
      }, initialDelayMs);
      console.log(
        `[dev:turbo] Watchdog enabled (interval=${intervalMs}ms, timeout=${timeoutMs}ms, maxFailures=${maxConsecutiveFailures}).`,
      );
    },
    stop() {
      if (timer) clearTimeout(timer);
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

function startNextDevTurbo() {
  return spawn(process.execPath, [nextCli, 'dev', '--turbo', '-p', port], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
}

let child = startNextDevTurbo();

const watchdog = createWatchdog({ port });
watchdog.start(
  () => child,
  (existingChild) => {
    try {
      watchdog.stop();
    } catch {}

    // Optional: clean .next on watchdog restarts to clear stuck state.
    if (!process.env.SKIP_CLEAN_NEXT_ON_WATCHDOG_RESTART) {
      const nextDir = path.join(root, '.next');
      rmNextWithRetries(nextDir);
    }

    killChild(existingChild);
    child = startNextDevTurbo();

    // Re-arm watchdog for new child.
    watchdog.start(() => child, arguments.callee);
  },
);

child.on('exit', (code) => process.exit(code ?? 0));
