import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'promo-video', 'public');

const BASE = 'http://localhost:3000';
const SCHOOL = 'schoolabc';
const STUDENT_BADGE_ID = '100100';

const VIEWPORT = { width: 1280, height: 720 };

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitNoAppLoading(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText ?? '';
      return !/Loading Teacher Portal|Loading LevelUp|Loading kiosk|Loading your rewards|Signing in|Initializing|Preparing secure connection/i.test(
        t,
      );
    },
    { timeout: 90000, polling: 250 },
  );
}

async function ensureStudentKioskTypeTab(page) {
  const manualHint = page.getByText(/Enter your Student ID/i);
  if (await manualHint.isVisible().catch(() => false)) return;
  const typeTab = page.getByRole('tab', { name: /^Type$/i });
  if (await typeTab.isVisible().catch(() => false)) {
    await typeTab.click();
    await manualHint.waitFor({ state: 'visible', timeout: 30000 });
  }
}

async function waitForStudentKioskReady(page) {
  await page.waitForURL(
    (url) =>
      url.pathname.includes('/student') && !url.pathname.includes('student-home'),
    { timeout: 60000 },
  );
  await waitNoAppLoading(page);
  await page
    .getByText(
      /Please scan your card|System Ready|LEVEL UP|Student Identification|Identify Student/i,
    )
    .first()
    .waitFor({ state: 'visible', timeout: 90000 });
  await ensureStudentKioskTypeTab(page);
  await sleep(400);
}

async function waitForTeacherReady(page) {
  await page.waitForURL((url) => url.pathname.includes('/teacher'), { timeout: 60000 });
  await waitNoAppLoading(page);
  await page
    .getByRole('heading', { name: /Teacher Portal/i })
    .waitFor({ state: 'visible', timeout: 90000 });
  await page.getByRole('tab', { name: /^Students$/i }).waitFor({ state: 'visible', timeout: 90000 });
  await sleep(600);
}

async function waitForPrintCouponsReady(page) {
  await waitForTeacherReady(page);
  await page.getByRole('tab', { name: /^Points$/i }).click();
  await page.getByRole('tab', { name: /Print Coupons/i }).click();
  await page.getByRole('combobox').first().waitFor({ state: 'visible', timeout: 45000 });
  await page.locator('input[type="number"]').first().waitFor({ state: 'visible', timeout: 45000 });
  await waitNoAppLoading(page);
  await sleep(700);
}

async function main() {
  console.log('Starting screenshot captures (single browser context flow)...');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // 1. Login Page Screenshot (before login)
  console.log('Capturing walkthrough-login.png...');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#schoolId').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#schoolId').fill(SCHOOL);
  await page.locator('#passcode').fill('1234');
  await sleep(500);
  await page.screenshot({ path: path.join(OUT_DIR, 'walkthrough-login.png') });

  // Do School Login now
  console.log('Logging in as school...');
  await page.locator('summary:has-text("Try a demo school")').click();
  await page.locator('button:has-text("School ABC")').click();
  await sleep(250);
  await page.locator('#passcode').fill('1234');
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL((url) => url.pathname.includes('/portal'), { timeout: 45000 });
  await waitNoAppLoading(page);
  await sleep(1000);

  // 2. Selector Screenshot (Portal Hub)
  console.log('Capturing walkthrough-selector.png...');
  await page.mouse.move(640, 400); // Hover in center
  await sleep(500);
  await page.screenshot({ path: path.join(OUT_DIR, 'walkthrough-selector.png') });

  // 3. Student Kiosk Screenshot
  console.log('Capturing walkthrough-student-kiosk.png...');
  await page.goto(`${BASE}/${SCHOOL}/student`, { waitUntil: 'domcontentloaded' });
  await waitForStudentKioskReady(page);
  const manualInput = page.locator('input[placeholder="----"]');
  if (await manualInput.isVisible({ timeout: 8000 }).catch(() => false)) {
    await manualInput.fill(STUDENT_BADGE_ID);
    await page.getByRole('button', { name: /Identify Student/i }).click();
  } else {
    const input = page.getByRole('textbox').first();
    await input.click();
    await input.fill(STUDENT_BADGE_ID);
    await input.press('Enter');
  }
  await sleep(2000);
  await page.mouse.move(700, 420);
  await sleep(500);
  await page.screenshot({ path: path.join(OUT_DIR, 'walkthrough-student-kiosk.png') });

  // 4. Student Home Screenshot
  console.log('Capturing walkthrough-student-home.png...');
  await page.goto(`${BASE}/${SCHOOL}/student-home`, { waitUntil: 'domcontentloaded' });
  await waitNoAppLoading(page);
  await page.locator('#portal-student-id').fill(STUDENT_BADGE_ID);
  await page.getByRole('button', { name: /^Continue$/i }).click();
  const passcodeField = page.getByRole('dialog').locator('input');
  if (await passcodeField.isVisible({ timeout: 8000 }).catch(() => false)) {
    await passcodeField.fill('1234');
    await page.getByRole('button', { name: /^Sign in$/i }).click();
  }
  await sleep(2000);
  await page.mouse.move(640, 360);
  await sleep(500);
  await page.screenshot({ path: path.join(OUT_DIR, 'walkthrough-student-home.png') });

  // 5. Dashboard Screenshot (Do teacher login now)
  console.log('Logging in as Mr. Smith...');
  await page.goto(`${BASE}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
  await waitNoAppLoading(page);
  await page.getByRole('link', { name: /Teacher Portal/i }).first().click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Mr. Smith' }).click();
  await page.locator('#teacher-passcode').fill('1234');
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.waitForURL((url) => url.pathname.includes('/teacher'), { timeout: 30000 });
  await waitNoAppLoading(page);
  await sleep(1000);

  console.log('Capturing walkthrough-dashboard.png...');
  await page.getByRole('tab', { name: /^Students$/i }).click();
  await sleep(800);
  await page.screenshot({ path: path.join(OUT_DIR, 'walkthrough-dashboard.png') });

  // 6. Teacher action / coupon generation screenshot
  console.log('Capturing walkthrough-action.png...');
  await waitForPrintCouponsReady(page);
  await page.getByRole('combobox').first().click();
  await page.getByRole('option').nth(1).click();
  await sleep(400);
  const pointField = page.locator('input[type="number"]').first();
  await pointField.click();
  await pointField.fill('25');
  await sleep(500);
  await page.screenshot({ path: path.join(OUT_DIR, 'walkthrough-action.png') });

  await ctx.close();
  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch(console.error);
