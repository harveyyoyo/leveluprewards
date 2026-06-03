/**
 * Default local dev launcher: Next.js dev + background route warmup.
 *
 * Usage:
 *   npm run dev            - Webpack dev + background warmup (default)
 *   npm run dev:fast       - Webpack dev, no warmup (responsive on weak machines)
 *   npm run dev:warm:turbo - Turbopack dev + warmup
 *
 * Disable warmup: DEV_WARMUP=0 npm run dev (or DEV_WARMUP=0 in .env.local)
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  ensureLoopbackPortAvailable,
  warnIfFirebaseAdminCredentialLooksWrong,
} = require('./lib/dev-startup-checks.cjs');

const root = path.join(__dirname, '..');
const port = String(process.env.PORT || '3000').trim() || '3000';
const host = String(process.env.HOST || '127.0.0.1').trim() || '127.0.0.1';
const useTurbo = String(process.env.DEV_WARMUP_BUNDLER || '').trim().toLowerCase() === 'turbo';

function isWarmupEnabled() {
  const flag = String(process.env.DEV_WARMUP ?? '').trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'no' || flag === 'off') return false;
  if (flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on') return true;
  return true;
}

const warmupEnabled = isWarmupEnabled();
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync wait for Windows EPERM retries */
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

async function main() {
  warnIfFirebaseAdminCredentialLooksWrong(root);
  await ensureLoopbackPortAvailable({ host, port });

  if (useTurbo && !process.env.SKIP_CLEAN_NEXT) {
    const err = rmNextWithRetries(path.join(root, '.next'));
    if (err === true) {
      console.log('[dev:warm] Cleaned .next for Turbopack (SKIP_CLEAN_NEXT=1 to skip).\n');
      if (process.platform === 'win32') {
        const ms = Math.min(
          2000,
          Math.max(0, parseInt(process.env.TURBOPACK_POST_CLEAN_WAIT_MS || '400', 10) || 400),
        );
        if (ms > 0) sleepMs(ms);
      }
    } else {
      console.warn('[dev:warm] Could not remove .next:', (err && err.message) || err);
    }
  }

  const nextArgs = useTurbo
    ? ['dev', '--turbo', '-H', host, '-p', port]
    : ['dev', '-H', host, '-p', port];

  console.log(`[dev] http://${host}:${port} (${useTurbo ? 'Turbopack' : 'Webpack'})`);
  console.log('[dev] If pages are blank or you see Cannot find module ./*.js -> npm run dev:reset');
  if (warmupEnabled) {
    console.log('[dev:warmup] Background warmup: low-priority HTTP, then heavy pages only in headless Chrome.');
    console.log('[dev:warmup] App is usable while warmup runs (~2-5 min). Disable: DEV_WARMUP=0 or npm run dev:fast\n');
  } else {
    console.log('[dev] Background warmup off. Re-enable: npm run dev (default) or DEV_WARMUP=1\n');
  }

  const dev = spawn(process.execPath, [nextCli, ...nextArgs], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  let warmupChild = null;

  function startWarmup() {
    if (!warmupEnabled || warmupChild) return;
    warmupChild = spawn(process.execPath, [path.join(__dirname, 'dev-warm-routes.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
      detached: false,
    });
    warmupChild.on('exit', () => {
      warmupChild = null;
    });
  }

  if (warmupEnabled) {
    // Start after Next is up; dev-warm-routes waits for /login then delays before browser pass.
    const warmupStartMs = Math.max(0, parseInt(process.env.DEV_WARMUP_START_DELAY_MS || '3000', 10) || 3000);
    setTimeout(startWarmup, warmupStartMs);
  }

  function shutdown(code) {
    if (warmupChild && !warmupChild.killed) {
      try {
        warmupChild.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
    process.exit(code ?? 0);
  }

  dev.on('exit', (code) => shutdown(code ?? 0));
  process.on('SIGINT', () => {
    try {
      dev.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  });
  process.on('SIGTERM', () => {
    try {
      dev.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  });
}

main().catch((error) => {
  console.error(`[dev] ${error.message || error}`);
  process.exit(1);
});
