import { chromium } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DEMO_SCHOOL_ID = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
const DEMO_SCHOOL_PASSCODE = (
  process.env.DEMO_SCHOOL_PASSCODE || process.env.DEV_PASSCODE || '1234'
).trim();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPermissionDeniedMessage(text) {
  if (!text) return false;
  return (
    text.includes('Missing or insufficient permissions') ||
    text.includes('permission-denied') ||
    text.includes('Firestore Security Rules')
  );
}

(async () => {
  const hits = [];
  console.log('Starting Playwright...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    console.log('PAGE LOG:', text);
    if (isPermissionDeniedMessage(text)) {
      hits.push({ type: 'console', text });
    }
  });

  page.on('pageerror', (err) => {
    console.log('PAGE ERROR:', err.message);
    if (isPermissionDeniedMessage(err.message)) {
      hits.push({ type: 'pageerror', text: err.message });
    }
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const text = `REQUEST FAILED: ${request.url()} ${failure?.errorText || ''}`.trim();
    console.log(text);
  });

  try {
    const publicPaths = ['/', '/login'];

    for (const path of publicPaths) {
      console.log(`Navigating to ${path}...`);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await sleep(2500);
    }

    console.log('Logging into demo School ABC...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    await page.locator('#schoolId').waitFor({ timeout: 20000 });
    await page.locator('#schoolId').fill(DEMO_SCHOOL_ID);
    await page.locator('#passcode').fill(DEMO_SCHOOL_PASSCODE);
    await page.getByRole('button', { name: /Sign in to school/i }).click({ timeout: 20000 });

    await page.waitForFunction(() => window.location.pathname.endsWith('/portal'), { timeout: 30000 });
    const schoolId = DEMO_SCHOOL_ID;

    const authenticatedPaths = [
      `/${schoolId}/portal`,
      `/${schoolId}/admin`,
      `/${schoolId}/bulletin-board`,
    ];

    for (const path of authenticatedPaths) {
      console.log(`Navigating to ${path}...`);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await sleep(3000);
    }

    if (hits.length > 0) {
      console.error('\nDetected Firestore permission errors in browser console:\n');
      for (const h of hits) {
        console.error(`- [${h.type}] ${h.text}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('\nOK: no Firestore permission errors detected.');
  } catch (err) {
    console.error('SCRIPT ERROR:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

