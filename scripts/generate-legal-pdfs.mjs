import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import net from 'net';
import path from 'path';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getFlag(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function isPortFree(p) {
  return await new Promise((resolve) => {
    const srv = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        srv.close(() => resolve(true));
      })
      .listen(p, '127.0.0.1');
  });
}

async function findFreePort(startPort) {
  for (let p = startPort; p < startPort + 50; p += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + 49}`);
}

const requestedPortRaw = getFlag('--port') || process.env.PORT;
const requestedPort = requestedPortRaw ? Number(requestedPortRaw) : undefined;
const port = Number.isFinite(requestedPort) ? requestedPort : await findFreePort(3100);
const baseUrl = getFlag('--baseUrl') || `http://127.0.0.1:${port}`;
const outDir = getFlag('--outDir') || path.join(process.cwd(), 'public');

const outputs = [
  {
    url: `${baseUrl}/terms?print=1`,
    file: path.join(outDir, 'terms', 'LevelUp-EdTech-Enterprises-LLC-Terms-of-Service-2026.pdf'),
    waitForSelector: 'h1:has-text("Terms of Service")',
  },
  {
    url: `${baseUrl}/privacy?print=1`,
    file: path.join(outDir, 'privacy', 'LevelUp-EdTech-Enterprises-LLC-Data-Privacy-Agreement-DPSA-2026.pdf'),
    waitForSelector: 'h1:has-text("Privacy Policy")',
  },
];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function startNextServer() {
  const isWin = process.platform === 'win32';
  const shell = isWin ? 'cmd.exe' : 'sh';
  const shellArgs = isWin
    ? ['/c', `npm run dev -- -p ${port}`]
    : ['-lc', `npm run dev -- -p ${port}`];

  const child = spawn(shell, shellArgs, {
    stdio: 'pipe',
    env: { ...process.env, PORT: String(port), NEXT_TELEMETRY_DISABLED: '1' },
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => {
    stdout += d.toString();
    if (stdout.length > 20000) stdout = stdout.slice(-20000);
  });
  child.stderr.on('data', (d) => {
    stderr += d.toString();
    if (stderr.length > 20000) stderr = stderr.slice(-20000);
  });

  const stop = () => {
    if (child.killed) return;
    if (isWin) {
      // Ensure we kill the whole process tree (Next dev spawns child node processes).
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    }
    child.kill('SIGTERM');
  };

  return { child, stop, getLogs: () => ({ stdout, stderr }) };
}

async function waitForServerReady(maxWaitMs = 90_000) {
  const deadline = Date.now() + maxWaitMs;
  // Try a simple fetch loop; node 22 has global fetch.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(`${baseUrl}/terms`, { redirect: 'follow' });
      if (res.ok) return;
    } catch {
      // ignore
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for Next dev server at ${baseUrl}`);
    }
    await sleep(750);
  }
}

async function main() {
  console.log(`Starting Next dev server on ${baseUrl}...`);
  const server = startNextServer();
  try {
    await waitForServerReady();

    console.log('Launching Chromium to generate PDFs...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 2,
    });

    for (const out of outputs) {
      ensureDir(out.file);
      const page = await context.newPage();
      page.setDefaultTimeout(120_000);
      await page.goto(out.url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      // Next dev keeps a websocket open; don't require full network idle to print.
      await page.waitForLoadState('load', { timeout: 120_000 });
      if (out.waitForSelector) {
        await page.waitForSelector(out.waitForSelector, { timeout: 120_000 });
      }
      await page.emulateMedia({ media: 'screen' });
      await page.pdf({
        path: out.file,
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.6in', bottom: '0.6in', left: '0.6in', right: '0.6in' },
      });
      await page.close();
      console.log(`Wrote ${path.relative(process.cwd(), out.file)}`);
    }

    await context.close();
    await browser.close();
  } finally {
    server.stop();
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

