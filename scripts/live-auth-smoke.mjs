import { chromium } from '@playwright/test';
import {
  createAnonymousIdToken,
  liveAuthConfig,
  verifySchoolAccessApiRoute,
} from './live-auth-checks.mjs';

const { baseUrl, schoolId, passcode, firebaseApiKey } = liveAuthConfig();

function fail(message, detail = '') {
  console.error(`[live-auth-smoke] ${message}`);
  if (detail) console.error(detail.slice(0, 1500));
  process.exit(1);
}

async function readBody(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function verifyRedirectTarget(location) {
  const target = new URL(location, baseUrl).toString();
  const response = await fetch(target, { redirect: 'follow' });
  if (!response.ok) {
    fail(`Portal canonical redirect target failed. HTTP ${response.status}`, target);
  }
  console.log(`[live-auth-smoke] Portal canonical redirect target returned ${response.status}: ${target}`);
}

function resolveRequireSessionCookieFlag() {
  if (process.env.LIVE_AUTH_REQUIRE_SESSION_COOKIE === '1') return true;
  if (process.env.LIVE_AUTH_REQUIRE_SESSION_COOKIE === '0') return false;
  return null;
}

/** Infer strict edge mode from live portal behavior when not explicitly configured. */
async function detectEdgeEnforcement() {
  const explicit = resolveRequireSessionCookieFlag();
  if (explicit !== null) return explicit;

  const response = await fetch(`${baseUrl}/${schoolId}/portal`, { redirect: 'manual' });
  const location = response.headers.get('location') || '';
  const strict =
    response.status >= 300 && response.status < 400 && location.toLowerCase().includes('/login');
  console.log(
    `[live-auth-smoke] Auto-detected edge enforcement: ${strict ? 'strict (portal redirects)' : 'relaxed (portal open)'}.`,
  );
  return strict;
}

async function verifySchoolAccessApi(idToken) {
  const { response, body } = await verifySchoolAccessApiRoute({
    baseUrl,
    schoolId,
    passcode,
    idToken,
  });
  if (!response.ok) {
    fail(
      `/api/auth/verify-school-access returned HTTP ${response.status}. Schools would rely on callable fallback only.`,
      body,
    );
  }
  console.log(`[live-auth-smoke] /api/auth/verify-school-access returned ${response.status}.`);
}

async function verifyCallablePasscode(idToken) {
  const response = await fetch(
    'https://us-central1-studio-1273073612-71183.cloudfunctions.net/verifySchoolAccessPasscode',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { schoolId, passcode } }),
    },
  );
  const body = await readBody(response);
  if (!response.ok || !body.includes('"success":true')) {
    fail(`School passcode callable failed. HTTP ${response.status}`, body);
  }
  console.log(`[live-auth-smoke] Callable accepted ${schoolId} access passcode.`);
}

async function verifySessionCookieEndpoint(idToken, requireSessionCookie) {
  const response = await fetch(`${baseUrl}/api/auth/session`, {
    method: 'POST',
    headers: {
      Origin: baseUrl,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });
  const body = await readBody(response);

  if (requireSessionCookie && !response.ok) {
    fail(`/api/auth/session is required but returned HTTP ${response.status}.`, body);
  }

  if (response.ok) {
    const parsed = JSON.parse(body || '{}');
    if (parsed.skipped) {
      console.log('[live-auth-smoke] Session cookie endpoint skipped (edge enforcement disabled).');
    } else {
      console.log('[live-auth-smoke] Session cookie endpoint returned OK.');
    }
  } else {
    console.warn(
      `[live-auth-smoke] Session cookie endpoint returned HTTP ${response.status}; tolerated because edge enforcement is disabled.`,
    );
  }
}

async function verifyDirectPortalHttp(requireSessionCookie) {
  const response = await fetch(`${baseUrl}/${schoolId}/portal`, { redirect: 'manual' });
  const location = response.headers.get('location') || '';

  if (requireSessionCookie) {
    if (!(response.status >= 300 && response.status < 400) || !location.includes('/login')) {
      fail(
        `Strict edge mode should redirect an unauthenticated portal request to /login. HTTP ${response.status}`,
        location,
      );
    }
    console.log(`[live-auth-smoke] Strict edge mode redirected unauthenticated portal request to ${location}.`);
    return;
  }

  if (response.status >= 300 && response.status < 400) {
    if (location.toLowerCase().includes('/login')) {
      fail(`Portal request redirected to login while edge enforcement is disabled. HTTP ${response.status}`, location);
    }
    await verifyRedirectTarget(location);
    return;
  }
  if (!response.ok) {
    fail(`Direct portal request failed. HTTP ${response.status}`, await readBody(response));
  }
  console.log(`[live-auth-smoke] Direct portal request returned ${response.status}.`);
}

async function verifyBrowserLogin() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  try {
    await page.goto(
      `${baseUrl}/login?school=${encodeURIComponent(schoolId)}&next=${encodeURIComponent(`/${schoolId}/portal`)}`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.locator('#passcode').waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('#passcode').fill(passcode);
    await page.getByRole('button', { name: 'Sign in to school' }).click();
    await page.waitForURL((url) => url.pathname === `/${schoolId}/portal`, { timeout: 30_000 });
    await page.getByRole('heading', { name: 'Where to?' }).waitFor({ state: 'visible', timeout: 20_000 });
    console.log(`[live-auth-smoke] Browser login reached /${schoolId}/portal.`);
  } catch (error) {
    const screenshotPath = `live-auth-smoke-${schoolId}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    fail(
      `Browser login smoke failed. Saved ${screenshotPath}. Current URL: ${page.url()}`,
      `${error instanceof Error ? error.stack || error.message : String(error)}\n${consoleErrors.join('\n')}`,
    );
  } finally {
    await browser.close();
  }
}

console.log(`[live-auth-smoke] Testing ${baseUrl} for school "${schoolId}".`);
const requireSessionCookie = await detectEdgeEnforcement();
const idToken = await createAnonymousIdToken(firebaseApiKey);
await verifyCallablePasscode(idToken);
await verifySchoolAccessApi(idToken);
await verifySessionCookieEndpoint(idToken, requireSessionCookie);
await verifyDirectPortalHttp(requireSessionCookie);
await verifyBrowserLogin();
console.log('[live-auth-smoke] Auth smoke passed.');
