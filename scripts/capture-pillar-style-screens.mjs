/**
 * Capture the six fresh School ABC product views used by the quick promo samples.
 * Uses the existing demo auth state and overwrites only the six marketing screenshots.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const base = (process.env.CAPTURE_BASE_URL || 'https://portal.leveluprewards.app').replace(/\/+$/, '');
const schoolId = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
const passcode = (process.env.DEMO_ADMIN_PASSCODE || process.env.DEMO_SCHOOL_PASSCODE || '1234').trim();
const authDir = path.resolve(process.env.CAPTURE_AUTH_DIR || path.join(root, 'promo-video', 'public', '.capture-auth'));
const outputDir = path.resolve(process.env.CAPTURE_SCREENSHOT_DIR || path.join(root, 'promo-video', 'public', 'marketing', 'screenshots'));
const viewport = { width: 1600, height: 900 };
const authPaths = {
  school: path.join(authDir, 'school.json'),
  admin: path.join(authDir, 'admin.json'),
  teacher: path.join(authDir, 'teacher.json'),
};

fs.mkdirSync(outputDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function firstExisting(paths) {
  return paths.find((file) => fs.existsSync(file));
}

async function settle(page, ms = 3500) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.evaluate(async () => {
    await document.fonts?.ready;
  }).catch(() => {});
  await page.addStyleTag({
    content: '::-webkit-scrollbar{width:0!important;height:0!important}html{scrollbar-width:none!important}',
  }).catch(() => {});
  await sleep(ms);
}

async function bodyHas(page, pattern) {
  return pattern.test((await page.locator('body').innerText().catch(() => '')) || '');
}

async function waitForText(page, pattern, timeout = 60000) {
  await page.waitForFunction(
    (source) => new RegExp(source, 'i').test(document.body?.innerText || ''),
    pattern.source,
    { timeout, polling: 350 },
  );
}

async function capture(page, filename) {
  await settle(page);
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: false,
    animations: 'disabled',
  });
  console.log(`captured ${filename}`);
}

async function passGateIfPresent(page) {
  const enterDashboard = page.getByRole('button', { name: /Enter Dashboard/i });
  if (await enterDashboard.isVisible({ timeout: 2500 }).catch(() => false)) {
    const input = page.locator('input[name="adminPasscode"], input[type="password"]').first();
    await input.fill(passcode);
    await enterDashboard.click();
    await sleep(2500);
  }
}

async function openAdmin(page) {
  await page.goto(`${base}/${schoolId}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await passGateIfPresent(page);
  if (page.url().includes('admin-sign-in')) {
    await page.locator('input[type="password"]').first().fill(passcode);
    await page.locator('form').getByRole('button').first().click();
    await sleep(3000);
    await page.goto(`${base}/${schoolId}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await passGateIfPresent(page);
  }
  await waitForText(page, /Add Student|Manage students|Admin portal|Welcome/i, 90000);
}

async function clickAdminTab(page, label) {
  await openAdmin(page);
  const tablist = page.getByRole('tablist', { name: /Admin portal main tabs/i });
  if (await tablist.isVisible({ timeout: 8000 }).catch(() => false)) {
    let tab = tablist.getByRole('tab', { name: new RegExp(label, 'i') }).first();
    if (!(await tab.isVisible({ timeout: 5000 }).catch(() => false))) {
      const addMore = page.getByRole('button', { name: /^Add more$/i }).first();
      if (await addMore.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addMore.click();
        const item = page.getByRole('menuitemcheckbox', { name: new RegExp(label, 'i') }).first();
        if (await item.isVisible({ timeout: 5000 }).catch(() => false)) {
          if ((await item.getAttribute('aria-checked')) !== 'true') await item.click();
        }
        await page.keyboard.press('Escape');
        await sleep(900);
      }
      tab = page.getByRole('tab', { name: new RegExp(label, 'i') }).first();
    }
    await tab.waitFor({ state: 'visible', timeout: 30000 });
    await tab.click();
  } else {
    const picker = page.getByLabel(/Admin portal section/i);
    await picker.click();
    await page.getByRole('option', { name: new RegExp(label, 'i') }).first().click();
  }
  await sleep(2500);
}

async function openAdminSession(page) {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const schoolInput = page.locator('#schoolId');
  if (page.url().includes('/login')) {
    await schoolInput.waitFor({ state: 'visible', timeout: 20000 });
    await schoolInput.fill(schoolId);
    await page.locator('#passcode').fill(passcode);
    await page.getByRole('button', { name: /Sign in to school/i }).click();
    await page.waitForURL((url) => url.pathname.includes('/portal'), { timeout: 60000 });
  }
  await page.goto(`${base}/${schoolId}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
}

async function openOffice(page, destination = '') {
  await page.goto(`${base}/${schoolId}/office`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const officePass = page.locator('#office-passcode');
  if (await officePass.isVisible({ timeout: 10000 }).catch(() => false)) {
    const officeStaff = page.getByRole('button', { name: /Office staff/i });
    if (await officeStaff.isVisible({ timeout: 3000 }).catch(() => false)) {
      await officeStaff.click();
      await page.locator('#office-username').fill('office');
    }
    await officePass.fill(passcode);
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await waitForText(page, /How can I help\?|Jump to|Still owed|Grades done/i, 45000);
    await sleep(1200);
  }
  await waitForText(page, /How can I help\?|Jump to|Still owed|Grades done/i, 45000);
  if (destination) {
    const target = page
      .getByRole('link', { name: new RegExp(`^${destination}$`, 'i') })
      .first()
      .or(page.getByRole('button', { name: new RegExp(`^${destination}$`, 'i') }).first());
    if (await target.isVisible({ timeout: 5000 }).catch(() => false)) {
      await target.click();
      await sleep(1800);
    } else {
      await page.goto(`${base}/${schoolId}/office/${destination}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
    }
  }
}

async function signInStudent(page) {
  await page.goto(`${base}/${schoolId}/student`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForText(page, /Please scan your card|System Ready|Enter your Student ID|Identify Student|LEVEL UP/i, 90000);
  const typeTab = page.getByRole('tab', { name: /^Type$/i });
  if (await typeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await typeTab.click();
    await page.getByText(/Enter your Student ID/i).waitFor({ state: 'visible', timeout: 10000 });
  }
  const sample = page.getByRole('button', { name: /Try sample:/i });
  if (await sample.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sample.click();
  } else {
    const manual = page.locator('input[placeholder="----"]');
    const input = (await manual.isVisible({ timeout: 3000 }).catch(() => false))
      ? manual
      : page.getByRole('textbox').first();
    await input.fill('100100');
  }
  const identify = page.getByRole('button', { name: /Identify Student/i });
  if (await identify.isVisible({ timeout: 3000 }).catch(() => false)) {
    await identify.click();
  } else {
    await input.press('Enter');
  }
  await waitForText(page, /Rewards|Wallet|Gift|WELCOME BACK|Balance|Eligible Rewards|Student found/i, 90000);
  const letsGo = page.getByRole('button', { name: /Let'?s Go!/i });
  if (await letsGo.isVisible({ timeout: 2500 }).catch(() => false)) await letsGo.click();
  await sleep(1800);
}

const browser = await chromium.launch({ headless: true });
const schoolAuth = firstExisting([authPaths.school]);

async function withPage(auth, task) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    ...(auth ? { storageState: auth } : {}),
  });
  const page = await context.newPage();
  try {
    await task(page);
  } finally {
    await context.close();
  }
}

try {
  await withPage(schoolAuth, async (page) => {
    await signInStudent(page);
    await waitForText(page, /WELCOME BACK|Eligible Rewards|Redeem|Spendable/i, 90000);
    await capture(page, 'kiosk-rewards-shop.png');
  });

  await withPage(null, async (page) => {
    await openAdminSession(page);
    await openOffice(page, 'attendance');
    await waitForText(page, /Daily Headcount|Today's Board|Attendance|Bell Schedule|Period|Check In Student/i, 90000);
    await capture(page, 'attendance-full.png');
  });

  await withPage(null, async (page) => {
    await openAdminSession(page);
    await page.goto(`${base}/${schoolId}/library`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForText(page, /Which library do you want to open\?|Welcome to School Library/i, 60000);
    const mainLibrary = page.getByRole('button', { name: /School Library/i }).first();
    if (await mainLibrary.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mainLibrary.click();
    }
    await waitForText(page, /Welcome to School Library|Librarian|Catalog|Student Station|Self-Checkout/i, 90000);
    await capture(page, 'library-full.png');
  });

  await withPage(null, async (page) => {
    await openAdminSession(page);
    await page.goto(`${base}/${schoolId}/classroom`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForText(page, /Hall: All Clear|Teacher desk|Class Awards|pts|Shortcuts|Projector/i, 90000);
    await capture(page, 'classroom-seating.png');
  });

  await withPage(null, async (page) => {
    await openAdminSession(page);
    await openOffice(page);
    await waitForText(page, /How can I help\?|Jump to|School Office|Still owed|Grades done/i, 90000);
    await capture(page, 'office-dashboard.png');
  });

  await withPage(null, async (page) => {
    await openAdminSession(page);
    await page.goto(`${base}/${schoolId}/houses`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForText(page, /House Standings|Current Leader|HOUSE TEAMS|HOUSES/i, 90000);
    await capture(page, 'houses-realm.png');
  });
} finally {
  await browser.close();
}
