/**
 * Re-captures marketing PNGs that were still bad after a partial weak run.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { captureMarketingContent } from './marketing-screenshot-content.mjs';
import {
  ensureDemoStudentPortalPasscode,
  patchDemoMarketingSettings,
} from './lib/demo-marketing-settings.mjs';
import {
  assertPageReady,
  assertValidPng,
  dismissAdminSettingsModal,
  enableAllAdminAddOnTabs,
  KIOSK_SIGNED_IN_RE,
  STUDENT_HOME_DASHBOARD_RE,
} from './lib/marketing-capture-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'marketing', 'screenshots');
const SCHOOL_AUTH = path.join(ROOT, 'promo-video', 'public', '.capture-auth', 'school.json');

const BASE =
  process.env.CAPTURE_BASE_URL?.trim()?.replace(/\/+$/, '') ||
  'https://portal.leveluprewards.app';
const SCHOOL = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
const SCHOOL_PASS = process.env.DEMO_SCHOOL_PASSCODE || '1234';
const ADMIN_PASS = process.env.DEMO_ADMIN_PASSCODE || '1234';
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
  await page.getByRole('button', { name: /Sign in|Continue|Access|Unlock|Enter Dashboard/i }).first().click();
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
  await page.getByText(/System Ready|Identify Student/i).first().waitFor({ timeout: 60000 }).catch(() => {});
  await sleep(2000);
  await page
    .waitForFunction(
      () => !/Connecting…|registering with the school/i.test(document.body?.innerText ?? ''),
      { timeout: 120000, polling: 400 },
    )
    .catch(() => {});
  const typeTab = page.getByRole('tab', { name: /^Type$/i });
  if (await typeTab.isVisible().catch(() => false)) await typeTab.click();
  await sleep(500);
  const manual = page.locator('input[placeholder="----"]');
  if (await manual.isVisible({ timeout: 8000 }).catch(() => false)) {
    await manual.fill(STUDENT_BADGE);
    await page.getByRole('button', { name: /Identify Student/i }).click();
  } else {
    const nfcInput = page.locator('input[type="text"].absolute').first();
    await nfcInput.focus({ timeout: 15000 });
    await nfcInput.fill(STUDENT_BADGE);
    await nfcInput.press('Enter');
  }
  await page.waitForFunction(
    (pattern) => new RegExp(pattern, 'i').test(document.body?.innerText ?? ''),
    KIOSK_SIGNED_IN_RE.source,
    { timeout: 120000, polling: 300 },
  );
  await sleep(1200);
}

const SHOT_PREFER = {
  'admin-attendance': 'tabpanel',
  'admin-notifications': 'tabpanel',
  'admin-badges': 'tabpanel',
  'admin-stats': 'tabpanel',
  'kiosk-welcome': 'clip-main',
  'kiosk-rewards-shop': 'clip-main',
  'kiosk-system-ready': 'kiosk-idle',
  'student-home-portal': 'clip-main',
};

async function shot(page, name) {
  await assertPageReady(page, name);
  const filePath = path.join(OUT_DIR, `${name}.png`);
  const { mode } = await captureMarketingContent(page, filePath, {
    prefer: SHOT_PREFER[name] ?? 'auto',
  });
  assertValidPng(filePath);
  console.log(`✓ ${name}.png (${Math.round(fs.statSync(filePath).size / 1024)}kb, ${mode})`);
}

async function adminTab(page, label) {
  await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: 'domcontentloaded' });
  await waitLoaded(page);
  await sleep(800);
  await dismissAdminSettingsModal(page);
  await enableAllAdminAddOnTabs(page);
  const tab = page.getByRole('tab', { name: new RegExp(label, 'i') }).first();
  await tab.scrollIntoViewIfNeeded({ timeout: 20000 });
  await tab.click({ timeout: 20000 });
  await waitLoaded(page);
  await sleep(1500);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]?.trim();
  const wantKiosk = !only || /kiosk/i.test(only);
  const wantAdmin = !only || /admin/i.test(only);
  const wantStudentHome = !only || /student/i.test(only);

  if (wantKiosk || wantStudentHome) {
    await patchDemoMarketingSettings();
  }
  if (wantStudentHome) {
    await ensureDemoStudentPortalPasscode();
  }
  const browser = await chromium.launch({ headless: true });

  if (wantKiosk) {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    page.setDefaultTimeout(120000);
    await schoolLogin(page);
    for (const [name, setup, prefer] of [
      ['kiosk-welcome', signInKiosk, 'clip-main'],
      [
        'kiosk-rewards-shop',
        async () => {
          await signInKiosk(page);
          await page.getByText(/More prizes|Eligible prizes/i).first().click({ timeout: 12000 }).catch(() => {});
          await sleep(1000);
        },
        'clip-main',
      ],
      [
        'kiosk-system-ready',
        async () => {
          await page.goto(`${BASE}/${SCHOOL}/student`, { waitUntil: 'domcontentloaded' });
          await waitLoaded(page);
          await sleep(1500);
        },
        'kiosk-idle',
      ],
    ]) {
      try {
        await setup(page);
        await assertPageReady(page, name);
        const filePath = path.join(OUT_DIR, `${name}.png`);
        await captureMarketingContent(page, filePath, { prefer });
        assertValidPng(filePath);
        console.log(`✓ ${name}.png`);
      } catch (e) {
        console.error(`✗ ${name}: ${e.message}`);
      }
    }
    await ctx.close();
  }

  if (wantAdmin) {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    page.setDefaultTimeout(120000);
    await adminLogin(page);
    for (const tab of [
      ['admin-attendance', 'Attendance'],
      ['admin-notifications', 'Notifications'],
      ['admin-badges', 'Badges'],
      ['admin-stats', 'Insights'],
    ]) {
      try {
        await adminTab(page, tab[1]);
        await shot(page, tab[0]);
      } catch (e) {
        console.error(`✗ ${tab[0]}: ${e.message}`);
      }
    }
    await ctx.close();
  }

  if (wantStudentHome) {
    const authState = fs.existsSync(SCHOOL_AUTH) ? SCHOOL_AUTH : undefined;
    const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: authState });
    const page = await ctx.newPage();
    page.setDefaultTimeout(120000);
    if (!authState) {
      await schoolLogin(page);
      await sleep(2000);
    }
    await page.goto(`${BASE}/${SCHOOL}/student-home`, { waitUntil: 'domcontentloaded' });
    await waitLoaded(page);
    await page
      .waitForFunction(
        () => !/Preparing secure connection/i.test(document.body?.innerText ?? ''),
        { timeout: 120000, polling: 400 },
      )
      .catch(() => {});
    const idField = page.locator('#portal-student-id');
    if (await idField.isVisible({ timeout: 60000 }).catch(() => false)) {
      await idField.fill(STUDENT_BADGE);
      await page.locator('form').first().evaluate((f) => f.requestSubmit());
      const pass = page.getByRole('dialog').locator('input[type="password"], input[inputmode="numeric"]');
      await pass.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
      if (await pass.isVisible().catch(() => false)) {
        await pass.fill(STUDENT_PASS);
        await page.getByRole('button', { name: /^Sign in$/i }).click();
      }
      await page.waitForFunction(
        (pattern) => new RegExp(pattern, 'i').test(document.body?.innerText ?? ''),
        STUDENT_HOME_DASHBOARD_RE.source,
        { timeout: 120000, polling: 400 },
      );
      await sleep(1500);
    }
    await waitLoaded(page);
    const body = await page.locator('body').innerText().catch(() => '');
    if (!STUDENT_HOME_DASHBOARD_RE.test(body)) {
      console.warn(
        '  ⚠ student-home login unavailable (portal lookup API) — fallback: kiosk signed-in balance UI',
      );
      try {
        await signInKiosk(page);
        await shot(page, 'student-home-portal');
      } catch (e) {
        console.error(`✗ student-home-portal: ${e.message}`);
      }
    } else {
      try {
        await shot(page, 'student-home-portal');
      } catch (e) {
        console.error(`✗ student-home-portal: ${e.message}`);
      }
    }
    await ctx.close();
  }

  await browser.close();
  console.log('Remaining shots done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
