/**
 * One-shot recovery for a broken local dev server:
 * 1. Stop anything listening on PORT (default 3000)
 * 2. Remove .next
 * 3. Start stable Webpack dev (no background warmup)
 */
const { spawn } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { DEFAULT_PORT } = require('./lib/dev-server-guard.cjs');

const root = path.join(__dirname, '..');
const port = String(process.env.PORT || DEFAULT_PORT).trim() || String(DEFAULT_PORT);
const nextDir = path.join(root, '.next');
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const host = String(process.env.HOST || '127.0.0.1').trim() || '127.0.0.1';

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync wait */
  }
}

function killPortListeners(targetPort) {
  if (process.platform === 'win32') {
    try {
      const out = execSync(`netstat -ano | findstr ":${targetPort}" | findstr LISTENING`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`[dev:recover] Stopped process ${pid} on port ${targetPort}`);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* nothing listening */
    }
    return;
  }

  try {
    execSync(`lsof -ti:${targetPort} | xargs kill -9`, { shell: true, stdio: 'ignore' });
    console.log(`[dev:recover] Stopped process(es) on port ${targetPort}`);
  } catch {
    /* nothing listening */
  }
}

function rmNextWithRetries(dir, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return;
    } catch (e) {
      lastErr = e;
      sleepMs(150 * (i + 1));
    }
  }
  throw lastErr;
}

async function main() {
  console.log(`[dev:recover] Stopping anything on port ${port}…`);
  killPortListeners(port);
  sleepMs(1200);

  console.log('[dev:recover] Removing .next…');
  rmNextWithRetries(nextDir);
  console.log('[dev:recover] Removed .next');

  console.log(`[dev:recover] Starting stable dev at http://${host}:${port}`);
  console.log('[dev:recover] Tip: use npm run dev:fast while coding; avoid npm run build in parallel.\n');

  const child = spawn(process.execPath, [nextCli, 'dev', '-H', host, '-p', port], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(`[dev:recover] ${error.message || error}`);
  process.exit(1);
});
