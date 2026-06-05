/**
 * Re-captures screenshots that often fail or look wrong (fresh auth).
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { captureMarketingContent } from './marketing-screenshot-content.mjs';
import { patchDemoMarketingSettings } from './lib/demo-marketing-settings.mjs';
import {
  assertPageReady,
  assertValidPng,
  dismissAdminSettingsModal,
  enableAllAdminAddOnTabs,
} from './lib/marketing-capture-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'marketing', 'screenshots');
const AUTH_DIR = path.join(ROOT, 'promo-video', 'public', '.capture-auth');

const BASE =
  process.env.CAPTURE_BASE_URL?.trim()?.replace(/\/+$/, '') ||
  'https://portal.leveluprewards.app';
const SCHOOL = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
const SCHOOL_PASS = process.env.DEMO_SCHOOL_PASSCODE || '1234';
const TEACHER = process.env.DEMO_TEACHER_NAME || 'Mr. Smith';
const TEACHER_PASS = process.env.DEMO_TEACHER_PASSCODE || '1234';
const STUDENT_BADGE = (process.env.DEMO_STUDENT_BADGE_ID || '100100').trim();
const STUDENT_PASS = process.env.DEMO_STUDENT_PORTAL_PASSCODE || '1234';
const VIEWPORT = { width: 1280, height: 720 };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitLoaded(page) {
  await page
    .waitForFunction(
      () => {
        const t = document.body?.innerText ?? '';
        return !/Loading Teacher Portal|Loading LevelUp|Loading kiosk|Signing in|Preparing secure connection/i.test(
          t,
        );
      },
      { timeout: 90000, polling: 250 },
    )
    .catch(() => {});
}

const ADMIN_PASS = process.env.DEMO_ADMIN_PASSCODE || '1234';

async function schoolLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('summary:has-text("Try a demo school")').click();
  await page.locator('button:has-text("School ABC")').click();
  await sleep(300);
  await page.locator('#passcode').fill(SCHOOL_PASS);
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL(/\/portal/, { timeout: 60000 });
  await waitLoaded(page);
}

async function adminLogin(page) {
  await schoolLogin(page);
  await page.goto(`${BASE}/${SCHOOL}/admin-sign-in?redirect=${encodeURIComponent(`/${SCHOOL}/admin`)}`, {
    waitUntil: 'domcontentloaded',
  });
  await waitLoaded(page);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.getByRole('button', { name: /Sign in|Continue|Access|Unlock/i }).first().click();
  await page.waitForURL((url) => url.pathname.includes('/admin') && !url.pathname.includes('admin-sign-in'), {
    timeout: 60000,
  });
  await page
    .waitForURL((url) => url.pathname.includes('/admin') && !url.pathname.includes('admin-sign-in'), {
      timeout: 60000,
    })
    .catch(async () => {
      await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: 'domcontentloaded' });
    });
  await waitLoaded(page);
  await dismissAdminSettingsModal(page);
  await page
    .waitForFunction(
      () => {
        const t = document.body?.innerText ?? '';
        return (
          !/Admin Access|Something went wrong|Missing or insufficient permissions/i.test(t) &&
          (/Students|Insights|Add more|School settings/i.test(t) || /Houses|Library|Attendance/i.test(t))
        );
      },
      { timeout: 90000, polling: 400 },
    )
    .catch(() => {});
  await sleep(1000);
}

async function signInKiosk(page) {
  await page.goto(`${BASE}/${SCHOOL}/student`, { waitUntil: 'domcontentloaded' });
  await waitLoaded(page);
  const typeTab = page.getByRole('tab', { name: /^Type$/i });
  if (await typeTab.isVisible().catch(() => false)) await typeTab.click();
  const manual = page.locator('input[placeholder="----"]');
  if (await manual.isVisible({ timeout: 8000 }).catch(() => false)) {
    await manual.fill(STUDENT_BADGE);
    await page.getByRole('button', { name: /Identify Student/i }).click();
  }
  await page
    .waitForFunction(
      () => /WELCOME BACK|BALANCE|Eligible Rewards|Rewards/i.test(document.body?.innerText ?? ''),
      { timeout: 90000, polling: 300 },
    )
    .catch(() => {});
  await sleep(800);
}

async function teacherLogin(page) {
  await schoolLogin(page);
  await page.getByRole('link', { name: /Teacher Portal/i }).first().click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: TEACHER }).click();
  await page.locator('#teacher-passcode').fill(TEACHER_PASS);
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.waitForURL(/\/teacher/, { timeout: 60000 });
  await waitLoaded(page);
  await sleep(1500);
}

async function adminTab(page, label) {
  await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: 'domcontentloaded' });
  await waitLoaded(page);
  await sleep(800);
  await dismissAdminSettingsModal(page);
  await enableAllAdminAddOnTabs(page);
  const tab = page.getByRole('tab', { name: new RegExp(label, 'i') }).first();
  await tab.scrollIntoViewIfNeeded({ timeout: 15000 });
  await tab.click({ timeout: 20000 });
  await waitLoaded(page);
  await sleep(1500);
}

const SHOT_PREFER = {
  'teacher-raffle': 'tabpanel',
  'hall-of-fame': 'fullscreen',
  'admin-houses': 'tabpanel',
  'admin-library': 'tabpanel',
  'admin-attendance': 'tabpanel',
  'admin-notifications': 'tabpanel',
  'admin-badges': 'tabpanel',
  'admin-stats': 'tabpanel',
  'student-home-portal': 'tabpanel',
};

async function shot(page, name) {
  await assertPageReady(page, name);
  const filePath = path.join(OUT_DIR, `${name}.png`);
  const { mode } = await captureMarketingContent(page, filePath, {
    prefer: SHOT_PREFER[name] ?? 'auto',
  });
  assertValidPng(filePath);
  const bytes = fs.statSync(filePath).size;
  console.log(`${name}.png → ${bytes} bytes (${mode})`);
}


async function runSection(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`[${label}] ${err.message}`);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Patching demo school settings for marketing…');
  const patched = await patchDemoMarketingSettings();
  if (!patched) {
    console.warn('  ⚠ Firebase patch skipped — kiosk may show “Student kiosk is off”.');
  }
  const browser = await chromium.launch({ headless: true });

  await runSection('kiosk+portal', async () => {
  // Kiosk + portal (content-only crops)
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await schoolLogin(page);
    for (const [name, prefer, setup] of [
      [
        'portal-hub',
        'portal',
        async () => {
          await page.goto(`${BASE}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
          await waitLoaded(page);
          await sleep(1200);
        },
      ],
      [
        'kiosk-welcome',
        'kiosk',
        async () => {
          await signInKiosk(page);
        },
      ],
      [
        'kiosk-rewards-shop',
        'kiosk',
        async () => {
          await signInKiosk(page);
          await page.getByText(/CLICK HERE FOR MORE PRIZES|Eligible Rewards/i).first().click({ timeout: 8000 }).catch(() => {});
          await sleep(1000);
        },
      ],
      [
        'kiosk-system-ready',
        'kiosk-idle',
        async () => {
          await page.goto(`${BASE}/${SCHOOL}/student`, { waitUntil: 'domcontentloaded' });
          await waitLoaded(page);
          await sleep(1500);
        },
      ],
      [
        'bulletin-board',
        'fullscreen',
        async () => {
          await page.goto(`${BASE}/${SCHOOL}/bulletin-board`, { waitUntil: 'domcontentloaded' });
          await waitLoaded(page);
          await sleep(1200);
        },
      ],
    ]) {
      await setup();
      await assertPageReady(page, name);
      const filePath = path.join(OUT_DIR, `${name}.png`);
      await captureMarketingContent(page, filePath, { prefer });
      assertValidPng(filePath);
      console.log(`${name}.png (content crop)`);
    }
    await ctx.close();
  }
  });

  await runSection('teacher+hof', async () => {
  // Teacher raffle + hall of fame
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await teacherLogin(page);
    await page.getByRole('tab', { name: /^Raffle$/i }).first().click();
    await sleep(1500);
    await shot(page, 'teacher-raffle');
    await page.goto(`${BASE}/${SCHOOL}/hall-of-fame?fullscreen=1`, { waitUntil: 'domcontentloaded' });
    await waitLoaded(page);
    await page.getByText(/Hall of Fame|Lifetime|Leaderboard/i).first().waitFor({ timeout: 60000 }).catch(() => {});
    await sleep(2000);
    await shot(page, 'hall-of-fame');
    await ctx.close();
  }
  });

  await runSection('admin', async () => {
  // School admin tabs + student home
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await adminLogin(page);

    await adminTab(page, 'Houses');
    await page.getByText(/Houses|House sorting|Spirit/i).first().waitFor({ timeout: 30000 }).catch(() => {});
    await shot(page, 'admin-houses');

    await adminTab(page, 'Library');
    await page.getByText(/Library|Checkout|Books/i).first().waitFor({ timeout: 30000 }).catch(() => {});
    await shot(page, 'admin-library');

    await adminTab(page, 'Attendance');
    await shot(page, 'admin-attendance');

    await adminTab(page, 'Notifications');
    await shot(page, 'admin-notifications');

    await adminTab(page, 'Badges');
    await shot(page, 'admin-badges');

    await adminTab(page, 'Insights');
    await shot(page, 'admin-stats');

    await adminTab(page, 'Student portal');
    await page.getByText(/Student portal|enableStudentPortal|Home portal/i).first().waitFor({ timeout: 30000 }).catch(() => {});
    await shot(page, 'student-home-portal');

    await page.goto(`${BASE}/${SCHOOL}/student-home`, { waitUntil: 'domcontentloaded' });
    await waitLoaded(page);
    const idField = page.locator('#portal-student-id');
    if (await idField.isVisible({ timeout: 8000 }).catch(() => false)) {
      await idField.fill(STUDENT_BADGE);
      await page.getByRole('button', { name: /^Continue$/i }).click();
      const pass = page.getByRole('dialog').locator('input');
      if (await pass.isVisible({ timeout: 8000 }).catch(() => false)) {
        await pass.fill(STUDENT_PASS);
        await page.getByRole('button', { name: /^Sign in$/i }).click();
        await sleep(3000);
      }
    }
    await waitLoaded(page);
    const text = await page.locator('body').innerText();
    if (/balance|Your points|Raffle tickets|WELCOME BACK/i.test(text)) {
      const filePath = path.join(OUT_DIR, 'student-home-portal.png');
      await captureMarketingContent(page, filePath, { prefer: 'clip-main' });
      assertValidPng(filePath);
      console.log('student-home-portal.png (live student home)');
    } else {
      console.warn('  ⚠ student-home login did not reach dashboard — kept admin Student portal tab shot');
    }

    await ctx.close();
  }
  });

  await browser.close();
  console.log('Content shots recaptured.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
