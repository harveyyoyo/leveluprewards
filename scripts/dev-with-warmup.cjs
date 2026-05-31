/**
 * Start Next.js dev quickly, then warm-compile routes in the background.
 *
 * Usage:
 *   npm run dev:warm       - Webpack dev (default, stable on Windows)
 *   npm run dev:warm:turbo - Turbopack dev + warmup
 *
 * Disable warmup: DEV_WARMUP=0 npm run dev:warm
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
const warmupEnabled = process.env.DEV_WARMUP !== '0';
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

  console.log(`[dev:warm] http://${host}:${port} (${useTurbo ? 'Turbopack' : 'Webpack'})`);
  if (warmupEnabled) {
    console.log('[dev:warmup] Background warmup: HTTP pass, then headless Chrome for full JS bundles.');
    console.log('[dev:warmup] First ~3-8 min after "Ready" - browse while it runs in this terminal.\n');
  } else {
    console.log('[dev:warm] Background warmup disabled (DEV_WARMUP=0).\n');
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
    // Warmup script polls /login until ready; start immediately so it runs in parallel with boot.
    setTimeout(startWarmup, 500);
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
  console.error(`[dev:warm] ${error.message || error}`);
  process.exit(1);
});
