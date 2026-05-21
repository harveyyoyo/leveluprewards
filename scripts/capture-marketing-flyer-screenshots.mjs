/**
 * Captures PNG screenshots for marketing flyers (Playwright).
 *
 * Usage:
 *   node scripts/capture-marketing-flyer-screenshots.mjs
 *   node scripts/capture-marketing-flyer-screenshots.mjs --local
 *   CAPTURE_BASE_URL=https://portal.leveluprewards.app node scripts/capture-marketing-flyer-screenshots.mjs
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { captureMarketingContent } from './marketing-screenshot-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'marketing', 'screenshots');
const AUTH_DIR = path.join(ROOT, 'promo-video', 'public', '.capture-auth');
const SCHOOL_AUTH = path.join(AUTH_DIR, 'school.json');
const TEACHER_AUTH = path.join(AUTH_DIR, 'teacher.json');
const ADMIN_AUTH = path.join(AUTH_DIR, 'admin.json');
const ADMIN_PASSCODE = (process.env.DEMO_ADMIN_PASSCODE || '1234').trim();

const PRODUCTION = 'https://portal.leveluprewards.app';
const LOCAL = 'http://localhost:3000';
const BASE = (() => {
  const explicit = process.env.CAPTURE_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  if (process.argv.includes('--local')) return LOCAL;
  return PRODUCTION;
})();

const SCHOOL = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
const SCHOOL_PASSCODE = (process.env.DEMO_SCHOOL_PASSCODE || '1234').trim();
const TEACHER_NAME = process.env.DEMO_TEACHER_NAME || 'Mr. Smith';
const TEACHER_PASSCODE = process.env.DEMO_TEACHER_PASSCODE || '1234';
const STUDENT_BADGE_ID = (process.env.DEMO_STUDENT_BADGE_ID || '100').trim();
const STUDENT_PORTAL_PASSCODE = (process.env.DEMO_STUDENT_PORTAL_PASSCODE || '1234').trim();

const VIEWPORT = { width: 1280, height: 720 };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function localOrigin() {
  return new URL(BASE).origin;
}

async function waitNoAppLoading(page) {
  await page
    .waitForFunction(
      () => {
        const t = document.body?.innerText ?? '';
        return !/Loading Teacher Portal|Loading LevelUp|Loading kiosk|Loading your rewards|Signing in|Initializing|Preparing secure connection/i.test(
          t,
        );
      },
      { timeout: 90000, polling: 250 },
    )
    .catch(() => {});
}

async function schoolLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('#schoolId').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('summary:has-text("Try a demo school")').click();
  await page.locator('button:has-text("School ABC")').click();
  await sleep(300);
  await page.locator('#passcode').fill(SCHOOL_PASSCODE);
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL((url) => url.pathname.includes('/portal'), { timeout: 60000 });
  await waitNoAppLoading(page);
  await sleep(500);
}

async function ensureSchoolAuth(browser) {
  if (fs.existsSync(SCHOOL_AUTH)) return;
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  await schoolLogin(page);
  await ctx.storageState({ path: SCHOOL_AUTH });
  await ctx.close();
}

async function ensureAdminAuth(browser) {
  if (fs.existsSync(ADMIN_AUTH)) return;
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  const origin = localOrigin();
  await schoolLogin(page);
  await page.goto(`${origin}/${SCHOOL}/admin-sign-in?redirect=${encodeURIComponent(`/${SCHOOL}/admin`)}`, {
    waitUntil: 'domcontentloaded',
  });
  await waitNoAppLoading(page);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSCODE);
  await page.locator('form').getByRole('button').first().click();
  await sleep(4000);
  if (!page.url().includes(`/${SCHOOL}/admin`) || page.url().includes('admin-sign-in')) {
    await page.goto(`${origin}/${SCHOOL}/admin`, { waitUntil: 'domcontentloaded' });
  }
  await waitNoAppLoading(page);
  await dismissAdminSettingsModal(page);
  await sleep(1000);
  await ctx.storageState({ path: ADMIN_AUTH });
  await ctx.close();
}

async function ensureTeacherAuth(browser) {
  if (fs.existsSync(TEACHER_AUTH)) return;
  await ensureSchoolAuth(browser);
  const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: SCHOOL_AUTH });
  const page = await ctx.newPage();
  const origin = localOrigin();
  await page.goto(`${origin}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
  await waitNoAppLoading(page);
  await page.getByRole('link', { name: /Teacher Portal/i }).first().click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: TEACHER_NAME }).click();
  await page.locator('#teacher-passcode').fill(TEACHER_PASSCODE);
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.waitForURL((url) => url.pathname.includes('/teacher'), { timeout: 60000 });
  await waitNoAppLoading(page);
  await sleep(800);
  await ctx.storageState({ path: TEACHER_AUTH });
  await ctx.close();
}

const SHOT_CONTENT_PREFER = {
  'portal-hub': 'portal',
  'kiosk-welcome': 'kiosk',
  'kiosk-rewards-shop': 'kiosk',
  'kiosk-system-ready': 'kiosk-idle',
  'student-home-portal': 'tabpanel',
  'hall-of-fame': 'fullscreen',
  'bulletin-board': 'fullscreen',
  'teacher-raffle': 'tabpanel',
  'admin-houses': 'tabpanel',
  'admin-library': 'tabpanel',
  'admin-attendance': 'tabpanel',
  'admin-notifications': 'tabpanel',
  'admin-stats': 'tabpanel',
  'admin-badges': 'tabpanel',
};

async function capture(page, name) {
  const filePath = path.join(OUT_DIR, `${name}.png`);
  const prefer = SHOT_CONTENT_PREFER[name] ?? 'auto';
  const { mode } = await captureMarketingContent(page, filePath, { prefer });
  const bytes = fs.statSync(filePath).size;
  if (bytes < 15000) {
    console.warn(`  ⚠ ${name}.png is only ${bytes} bytes (${mode})`);
  } else {
    console.log(`  ✓ ${name}.png (${Math.round(bytes / 1024)}kb, ${mode})`);
  }
  return filePath;
}

async function signInKiosk(page, origin) {
  await page.goto(`${origin}/${SCHOOL}/student`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitNoAppLoading(page);
  const typeTab = page.getByRole('tab', { name: /^Type$/i });
  if (await typeTab.isVisible().catch(() => false)) await typeTab.click();
  const manual = page.locator('input[placeholder="----"]');
  if (await manual.isVisible({ timeout: 8000 }).catch(() => false)) {
    await manual.fill(STUDENT_BADGE_ID);
    await page.getByRole('button', { name: /Identify Student/i }).click();
  }
  await page.waitForFunction(
    () => /WELCOME BACK|BALANCE|Eligible Rewards|Rewards/i.test(document.body?.innerText ?? ''),
    { timeout: 90000, polling: 300 },
  );
  await sleep(800);
}

async function signInStudentHome(page, origin) {
  await page.goto(`${origin}/${SCHOOL}/student-home`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitNoAppLoading(page);
  const idField = page.locator('#portal-student-id');
  if (await idField.isVisible({ timeout: 8000 }).catch(() => false)) {
    await idField.fill(STUDENT_BADGE_ID);
    await page.getByRole('button', { name: /^Continue$/i }).click();
    const pass = page.getByRole('dialog').locator('input');
    if (await pass.isVisible({ timeout: 8000 }).catch(() => false)) {
      await pass.fill(STUDENT_PORTAL_PASSCODE);
      await page.getByRole('button', { name: /^Sign in$/i }).click();
    }
    await sleep(2500);
  }
  await waitNoAppLoading(page);
  const body = await page.locator('body').innerText().catch(() => '');
  if (!/balance|points|house|raffle|welcome/i.test(body)) {
    await gotoAdminTab(page, origin, 'Student Portal');
    await sleep(800);
    return;
  }
  await sleep(600);
}

async function dismissAdminSettingsModal(page) {
  const cancel = page.getByRole('button', { name: /^Cancel$/i }).first();
  if (await cancel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancel.click();
    await sleep(500);
    return;
  }
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);
}

async function enableAllAdminAddOnTabs(page) {
  await dismissAdminSettingsModal(page);
  const addMore = page.getByRole('button', { name: /^Add more$/i }).first();
  if (!(await addMore.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await addMore.click();
  await sleep(500);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(400);
}

async function gotoAdminTab(page, origin, tabLabel) {
  await page.goto(`${origin}/${SCHOOL}/admin`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitNoAppLoading(page);
  await sleep(600);
  await dismissAdminSettingsModal(page);
  await enableAllAdminAddOnTabs(page);
  const addMore = page.getByRole('button', { name: /^Add more$/i }).first();
  if (await addMore.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addMore.click();
    await sleep(400);
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(500);
  }
  const tab = page.getByRole('tab', { name: new RegExp(tabLabel, 'i') }).first();
  if (await tab.isVisible({ timeout: 12000 }).catch(() => false)) {
    await tab.scrollIntoViewIfNeeded({ timeout: 15000 });
    await tab.click();
    await waitNoAppLoading(page);
    await sleep(1200);
    return true;
  }
  return false;
}

async function gotoTeacherTab(page, origin, tabLabel) {
  await page.goto(`${origin}/${SCHOOL}/teacher`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitNoAppLoading(page);
  await sleep(500);
  const tab = page.getByRole('tab', { name: new RegExp(`^${tabLabel}$`, 'i') }).first();
  await tab.click({ timeout: 15000 });
  await waitNoAppLoading(page);
  await sleep(900);
}

const SHOTS = [
  {
    name: 'portal-hub',
    auth: SCHOOL_AUTH,
    async run(page, origin) {
      await page.goto(`${origin}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitNoAppLoading(page);
      await sleep(600);
    },
  },
  {
    name: 'kiosk-welcome',
    auth: SCHOOL_AUTH,
    async run(page, origin) {
      await signInKiosk(page, origin);
    },
  },
  {
    name: 'kiosk-rewards-shop',
    auth: SCHOOL_AUTH,
    async run(page, origin) {
      await signInKiosk(page, origin);
      await page.getByText(/CLICK HERE FOR MORE PRIZES|Eligible Rewards/i).first().click({ timeout: 8000 }).catch(() => {});
      await sleep(1000);
      await page.evaluate(() => window.scrollTo(0, 400));
      await sleep(400);
    },
  },
  {
    name: 'kiosk-system-ready',
    auth: SCHOOL_AUTH,
    async run(page, origin) {
      await page.goto(`${origin}/${SCHOOL}/student`, { waitUntil: 'domcontentloaded' });
      await waitNoAppLoading(page);
      await sleep(2000);
    },
  },
  {
    name: 'student-home-portal',
    auth: SCHOOL_AUTH,
    async run(page, origin) {
      await signInStudentHome(page, origin);
    },
  },
  {
    name: 'hall-of-fame',
    auth: TEACHER_AUTH,
    async run(page, origin) {
      await page.goto(`${origin}/${SCHOOL}/hall-of-fame?fullscreen=1`, { waitUntil: 'domcontentloaded' });
      await waitNoAppLoading(page);
      await page.getByText(/Hall of Fame|Leaderboard|Lifetime/i).first().waitFor({ timeout: 60000 }).catch(() => {});
      await sleep(1200);
    },
  },
  {
    name: 'bulletin-board',
    auth: SCHOOL_AUTH,
    async run(page, origin) {
      await page.goto(`${origin}/${SCHOOL}/bulletin-board`, { waitUntil: 'domcontentloaded' });
      await waitNoAppLoading(page);
      await sleep(1200);
    },
  },
  {
    name: 'teacher-raffle',
    auth: TEACHER_AUTH,
    async run(page, origin) {
      await gotoTeacherTab(page, origin, 'Raffle');
    },
  },
  {
    name: 'admin-houses',
    auth: ADMIN_AUTH,
    async run(page, origin) {
      await gotoAdminTab(page, origin, 'Houses');
    },
  },
  {
    name: 'admin-library',
    auth: ADMIN_AUTH,
    async run(page, origin) {
      await gotoAdminTab(page, origin, 'Library');
    },
  },
  {
    name: 'admin-attendance',
    auth: ADMIN_AUTH,
    async run(page, origin) {
      await gotoAdminTab(page, origin, 'Attendance');
    },
  },
  {
    name: 'admin-notifications',
    auth: ADMIN_AUTH,
    async run(page, origin) {
      await gotoAdminTab(page, origin, 'Notifications');
    },
  },
  {
    name: 'admin-stats',
    auth: ADMIN_AUTH,
    async run(page, origin) {
      const ok = await gotoAdminTab(page, origin, 'Insights');
      if (!ok) await gotoAdminTab(page, origin, 'Students');
    },
  },
  {
    name: 'admin-badges',
    auth: ADMIN_AUTH,
    async run(page, origin) {
      await gotoAdminTab(page, origin, 'Badges');
    },
  },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Capturing marketing screenshots → ${OUT_DIR}`);
  console.log(`Base: ${BASE} · School: ${SCHOOL}\n`);

  const browser = await chromium.launch({ headless: true });
  await ensureSchoolAuth(browser);
  await ensureAdminAuth(browser);
  await ensureTeacherAuth(browser);

  const manifest = { capturedAt: new Date().toISOString(), base: BASE, school: SCHOOL, shots: [] };

  for (const shot of SHOTS) {
    console.log(`→ ${shot.name}`);
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      storageState: shot.auth,
    });
    const page = await ctx.newPage();
    try {
      await shot.run(page, localOrigin());
      await capture(page, shot.name);
      manifest.shots.push({ name: shot.name, status: 'ok' });
    } catch (err) {
      console.error(`  ✗ ${shot.name}: ${err.message}`);
      manifest.shots.push({ name: shot.name, status: 'fail', error: err.message });
    }
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
