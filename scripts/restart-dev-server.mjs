/**
 * Restart (or start) the local Next.js dev server in the background.
 * Used after local Firebase deploys, which often stop node processes or break node_modules.
 *
 * Opt out: NO_RESTART_DEV_AFTER_DEPLOY=1
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = String(process.env.PORT || '3000').trim() || '3000';
const host = String(process.env.HOST || '127.0.0.1').trim() || '127.0.0.1';

function nextBinExists() {
  const winShim = path.join(root, 'node_modules', '.bin', 'next.cmd');
  const unixShim = path.join(root, 'node_modules', '.bin', 'next');
  const cli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  return fs.existsSync(winShim) || fs.existsSync(unixShim) || fs.existsSync(cli);
}

async function devLooksHealthy() {
  const bases = [`http://${host}:${port}`, `http://127.0.0.1:${port}`, `http://localhost:${port}`];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/login`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (/School Login|LevelUp|School Rewards System/i.test(text)) {
        console.log(`[restart-dev] Dev server already running at ${base}`);
        return true;
      }
    } catch {
      /* try next host */
    }
  }
  return false;
}

function runSync(command, args) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status ?? 1}`);
  }
}

function startDevDetached() {
  const child = spawn('npm', ['run', 'dev'], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: process.env,
  });
  child.unref();
  console.log(`[restart-dev] Started npm run dev in background (http://${host}:${port})`);
}

async function main() {
  if (process.env.NO_RESTART_DEV_AFTER_DEPLOY === '1') {
    console.log('[restart-dev] Skipped (NO_RESTART_DEV_AFTER_DEPLOY=1)');
    return;
  }

  if (await devLooksHealthy()) return;

  if (!nextBinExists()) {
    console.log('[restart-dev] next binary missing — running npm ci to repair node_modules...');
    runSync('npm', ['ci']);
  }

  if (!nextBinExists()) {
    console.error('[restart-dev] next still missing after npm ci. Run npm run dev:reset manually.');
    process.exit(1);
  }

  startDevDetached();

  // Best-effort readiness check (do not fail deploy if this times out).
  for (let attempt = 1; attempt <= 12; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    if (await devLooksHealthy()) {
      console.log('[restart-dev] Dev server is responding.');
      return;
    }
    console.log(`[restart-dev] Waiting for dev server... (${attempt}/12)`);
  }

  console.warn(
    '[restart-dev] Dev process started but /login is not ready yet. Check the terminal or run npm run dev manually.',
  );
}

main().catch((error) => {
  console.error(`[restart-dev] ${error.message || error}`);
  process.exit(1);
});
