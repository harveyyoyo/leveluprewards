import { chromium } from '@playwright/test';

const DEFAULT_BASE_URL = 'https://levelupenterprises.education';
const DEFAULT_FIREBASE_API_KEY = 'AIzaSyBUH3r37IqZkJ9SmvWaaAJ5HU29Wa_hJLY';

const baseUrl = (process.env.LIVE_AUTH_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
const schoolId = (process.env.LIVE_AUTH_SCHOOL_ID || 'yeshiva').trim().toLowerCase();
const passcode = process.env.LIVE_AUTH_PASSCODE || '1234';
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULT_FIREBASE_API_KEY;
const requireSessionCookie =
  process.env.LIVE_AUTH_REQUIRE_SESSION_COOKIE === '1' ||
  (process.env.AUTH_SESSION_EDGE_ENFORCEMENT === '1' && process.env.DISABLE_AUTH_SESSION_EDGE !== '1');

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

async function createAnonymousIdToken() {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.idToken !== 'string') {
    fail(`Could not create anonymous Firebase test user. HTTP ${response.status}`, JSON.stringify(body));
  }
  return body.idToken;
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

async function verifySessionCookieEndpoint(idToken) {
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
    console.log('[live-auth-smoke] Session cookie endpoint returned OK.');
  } else {
    console.warn(
      `[live-auth-smoke] Session cookie endpoint returned HTTP ${response.status}; tolerated because edge enforcement is disabled.`,
    );
  }
}

async function verifyDirectPortalHttp() {
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
    fail(`Portal request redirected while edge enforcement is disabled. HTTP ${response.status}`, location);
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
const idToken = await createAnonymousIdToken();
await verifyCallablePasscode(idToken);
await verifySessionCookieEndpoint(idToken);
await verifyDirectPortalHttp();
await verifyBrowserLogin();
console.log('[live-auth-smoke] Auth smoke passed.');
