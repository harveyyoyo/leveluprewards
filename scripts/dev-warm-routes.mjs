/**
 * Pre-compile Next.js dev routes in the background.
 *
 * Phase 1 — HTTP: server render + script chunk URLs
 * Phase 2 — Browser (default): headless Chromium loads each page so webpack
 *           compiles the full client dependency graph (critical for /admin, etc.)
 *
 * Usage:
 *   npm run dev              # starts dev + this automatically
 *   npm run dev:warmup       # dev already running
 *
 * Env:
 *   HOST / PORT
 *   DEMO_SCHOOL_ID              — [schoolId] substitute (default schoolabc)
 *   DEV_WARMUP_CONCURRENCY      — parallel HTTP requests (default 1; raise if idle)
 *   DEV_WARMUP_BROWSER=0        — skip headless browser pass
 *   DEV_WARMUP_BROWSER_ALL=1    — browser-warm every route (default: heavy pages only)
 *   DEV_WARMUP_BROWSER_WAIT_MS  — extra wait on heavy routes (default 1500)
 *   DEV_WARMUP_START_DELAY_MS   — wait after dev ready before warmup starts (launcher only; default 3000)
 *   DEV_WARMUP_ROUTE_GAP_MS     — pause between routes so browsing stays responsive (default 400)
 *   DEV_WARMUP_SKIP             — comma-separated path prefixes to skip
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src', 'app');

const host = String(process.env.HOST || '127.0.0.1').trim() || '127.0.0.1';
const port = String(process.env.PORT || '3000').trim() || '3000';
const base = `http://${host}:${port}`;
const schoolId = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
const concurrency = Math.max(1, parseInt(process.env.DEV_WARMUP_CONCURRENCY || '1', 10) || 1);
const browserEnabled = process.env.DEV_WARMUP_BROWSER !== '0';
const browserAllRoutes = process.env.DEV_WARMUP_BROWSER_ALL === '1';
const routeGapMs = Math.max(
  0,
  parseInt(process.env.DEV_WARMUP_ROUTE_GAP_MS || '400', 10) || 400,
);
const browserExtraWaitMs = Math.max(
  0,
  parseInt(process.env.DEV_WARMUP_BROWSER_WAIT_MS || '1500', 10) || 1500,
);
const waitMs = Math.max(5000, parseInt(process.env.DEV_WARMUP_WAIT_MS || '180000', 10) || 180000);
const skipPrefixes = (process.env.DEV_WARMUP_SKIP || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const HEAVY_ROUTES = new Set([
  `/${schoolId}/admin`,
  `/${schoolId}/teacher`,
  `/${schoolId}/portal`,
  `/${schoolId}/student`,
  `/${schoolId}/prize`,
  `/${schoolId}/office`,
  `/${schoolId}/classroom`,
  `/${schoolId}/librarian`,
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function discoverRoutes(dir, urlParts = []) {
  /** @type {string[]} */
  const routes = [];

  if (!fs.existsSync(dir)) return routes;

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('_') || ent.name === 'api') continue;

    const full = path.join(dir, ent.name);

    if (ent.isDirectory()) {
      let segment = ent.name;
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const param = segment.slice(1, -1);
        if (param === 'schoolId') segment = schoolId;
        else continue;
      }
      routes.push(...discoverRoutes(full, [...urlParts, segment]));
      continue;
    }

    if (/^page\.(tsx|ts|jsx|js)$/.test(ent.name)) {
      routes.push(urlParts.length === 0 ? '/' : `/${urlParts.join('/')}`);
    }
  }

  return routes;
}

function orderRoutes(routes) {
  const heavy = routes.filter((r) => HEAVY_ROUTES.has(r));
  const rest = routes.filter((r) => !HEAVY_ROUTES.has(r));
  return [...heavy, ...rest];
}

async function waitForDevReady() {
  const deadline = Date.now() + waitMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    try {
      const res = await fetch(`${base}/login`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return true;
    } catch {
      /* still booting */
    }
    if (attempt === 1) console.log(`[dev:warmup] Waiting for ${base} …`);
    await sleep(1000);
  }

  return false;
}

function assetUrlsFromHtml(html) {
  const found = new Set();
  for (const match of html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)) {
    if (match[1].startsWith('/_next/')) found.add(match[1]);
  }
  for (const match of html.matchAll(/<link[^>]*\shref=["']([^"']+)["']/gi)) {
    if (match[1].startsWith('/_next/')) found.add(match[1]);
  }
  return [...found];
}

async function fetchAsset(assetPath) {
  try {
    await fetch(`${base}${assetPath}`, { signal: AbortSignal.timeout(120000) });
  } catch {
    /* dev graph may churn while warming */
  }
}

async function warmRouteHttp(routePath) {
  const url = `${base}${routePath}`;
  const started = Date.now();

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(180000),
      headers: { Accept: 'text/html' },
      redirect: 'follow',
    });
    const html = await res.text();
    const assets = assetUrlsFromHtml(html);
    await Promise.all(assets.map(fetchAsset));

    const ms = Date.now() - started;
    const tag = res.ok ? 'ok' : `HTTP ${res.status}`;
    console.log(
      `[dev:warmup:http] ${tag} ${routePath} (${ms}ms${assets.length ? `, ${assets.length} assets` : ''})`,
    );
    return res.status < 500;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[dev:warmup:http] fail ${routePath} — ${msg}`);
    return false;
  }
}

async function runPool(items, worker) {
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (index < items.length) {
        const i = index++;
        await worker(items[i]);
        if (routeGapMs > 0) await sleep(routeGapMs);
      }
    }),
  );
}

async function warmRoutesInBrowser(routes) {
  if (!browserEnabled) {
    console.log('[dev:warmup] Browser pass skipped (DEV_WARMUP_BROWSER=0)');
    return;
  }

  let chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    console.log('[dev:warmup] Playwright missing — browser pass skipped');
    return;
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[dev:warmup] Chromium unavailable (${msg})`);
    console.log('[dev:warmup] Install once: npx playwright install chromium');
    return;
  }

  console.log(`[dev:warmup:browser] Loading ${routes.length} routes in headless Chrome …`);

  const page = await browser.newPage();
  let okCount = 0;

  for (const routePath of routes) {
    const started = Date.now();
    const heavy = HEAVY_ROUTES.has(routePath);
    const timeout = heavy ? 180000 : 120000;

    if (routeGapMs > 0) await sleep(routeGapMs);

    try {
      await page.goto(`${base}${routePath}`, {
        waitUntil: heavy ? 'load' : 'domcontentloaded',
        timeout,
      });
      if (heavy && browserExtraWaitMs > 0) {
        await page.waitForTimeout(browserExtraWaitMs);
      }
      okCount += 1;
      console.log(`[dev:warmup:browser] ok ${routePath} (${Date.now() - started}ms)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[dev:warmup:browser] partial ${routePath} — ${msg.slice(0, 100)}`);
      try {
        await page.goto(`${base}${routePath}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        okCount += 1;
      } catch {
        /* best effort */
      }
    }
  }

  await browser.close();
  console.log(`[dev:warmup:browser] Finished — ${okCount}/${routes.length} routes visited`);
}

const allRoutes = orderRoutes(
  [...new Set(discoverRoutes(APP_DIR))].filter(
    (route) => !skipPrefixes.some((prefix) => route.startsWith(prefix)),
  ),
);

const browserRoutes = browserAllRoutes
  ? allRoutes
  : allRoutes.filter((route) => HEAVY_ROUTES.has(route));

if (allRoutes.length === 0) {
  console.log('[dev:warmup] No routes found under src/app');
  process.exit(1);
}

console.log(
  `[dev:warmup] ${allRoutes.length} routes @ ${base} (school=${schoolId}, http×${concurrency}, browser=${browserEnabled ? 'on' : 'off'})`,
);

const ready = await waitForDevReady();
if (!ready) {
  console.error(`[dev:warmup] Dev server not ready at ${base} after ${waitMs}ms`);
  process.exit(1);
}

const t0 = Date.now();
let httpOk = 0;

if (browserEnabled && browserRoutes.length > 0) {
  console.log(
    `[dev:warmup] Phase 1/2 — browser pre-compile (${browserRoutes.length} heavy route${browserRoutes.length === 1 ? '' : 's'}) …`,
  );
  await warmRoutesInBrowser(browserRoutes);
}

console.log('[dev:warmup] Phase 2/2 — HTTP + script assets …');
await runPool(allRoutes, async (route) => {
  if (await warmRouteHttp(route)) httpOk += 1;
});
console.log(`[dev:warmup] Phase 2 done — ${httpOk}/${allRoutes.length} routes (${Math.round((Date.now() - t0) / 1000)}s)`);

const elapsed = Math.round((Date.now() - t0) / 1000);
console.log(`[dev:warmup] All done in ${elapsed}s`);
console.log('[dev:warmup] Heavy pages (admin, teacher, portal) should load much faster now.');
