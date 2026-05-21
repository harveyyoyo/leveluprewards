/**
 * Captures admin ID card preview + branding/theme designer for marketing flyers.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { captureMarketingContent } from './marketing-screenshot-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'marketing', 'screenshots');
const BASE =
  process.env.CAPTURE_BASE_URL?.trim()?.replace(/\/+$/, '') || 'https://portal.leveluprewards.app';
const SCHOOL = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
const ADMIN_PASS = process.env.DEMO_ADMIN_PASSCODE || '1234';
const VIEWPORT = { width: 1280, height: 720 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitLoaded(page) {
  await page
    .waitForFunction(
      () => {
        const t = document.body?.innerText ?? '';
        return !/Loading Teacher Portal|Loading LevelUp|Signing in|Preparing secure connection/i.test(t);
      },
      { timeout: 90000, polling: 250 },
    )
    .catch(() => {});
}

async function adminLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('summary:has-text("Try a demo school")').click();
  await page.locator('button:has-text("School ABC")').click();
  await sleep(300);
  await page.locator('#passcode').fill('1234');
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL(/\/portal/, { timeout: 60000 });
  await sleep(800);
  await page.goto(`${BASE}/${SCHOOL}/admin-sign-in?redirect=${encodeURIComponent(`/${SCHOOL}/admin`)}`, {
    waitUntil: 'domcontentloaded',
  });
  await waitLoaded(page);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('form').getByRole('button').first().click();
  await sleep(4000);
  if (!page.url().includes(`/${SCHOOL}/admin`) || page.url().includes('admin-sign-in')) {
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: 'domcontentloaded' });
  }
  await waitLoaded(page);
  const cancel = page.getByRole('button', { name: /^Cancel$/i }).first();
  if (await cancel.isVisible({ timeout: 3000 }).catch(() => false)) await cancel.click();
  await sleep(600);
}

async function openAddOnTabs(page) {
  const addMore = page.getByRole('button', { name: /^Add more$/i }).first();
  if (await addMore.isVisible({ timeout: 8000 }).catch(() => false)) {
    await addMore.click();
    await sleep(500);
    for (const label of ['Branding']) {
      const item = page.getByRole('menuitemcheckbox', { name: new RegExp(label, 'i') }).first();
      if (await item.isVisible({ timeout: 2000 }).catch(() => false)) {
        if ((await item.getAttribute('aria-checked')) !== 'true') await item.click();
        await sleep(300);
      }
    }
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(400);
  }
}

async function adminTab(page, label) {
  await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: 'domcontentloaded' });
  await waitLoaded(page);
  await openAddOnTabs(page);
  const tab = page.getByRole('tab', { name: new RegExp(label, 'i') }).first();
  await tab.scrollIntoViewIfNeeded({ timeout: 15000 });
  await tab.click({ timeout: 20000 });
  await waitLoaded(page);
  await sleep(1500);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  await adminLogin(page);

  // ID card preview (Students tab)
  await adminTab(page, 'Students');
  const idBtn = page.getByTitle('Preview ID Card').first();
  if (await idBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await idBtn.click();
    await page.getByRole('dialog', { name: /ID Card Preview/i }).waitFor({ timeout: 20000 });
    await sleep(1200);
    const card = page.locator('.print-id-card').first();
    if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
      await card.screenshot({ path: path.join(OUT_DIR, 'admin-id-card.png'), type: 'png' });
      console.log('admin-id-card.png (card element)');
    } else {
      await page.locator('[role="dialog"]').screenshot({
        path: path.join(OUT_DIR, 'admin-id-card.png'),
        type: 'png',
      });
      console.log('admin-id-card.png (dialog)');
    }
    await page.keyboard.press('Escape');
    await sleep(500);
  } else {
    console.warn('ID card preview button not found');
  }

  // Theme designer (Branding → ID Card Theme)
  await adminTab(page, 'Branding');
  const themeNav = page.getByRole('tab', { name: /^ID Card Theme$/i }).first();
  if (await themeNav.isVisible({ timeout: 10000 }).catch(() => false)) {
    await themeNav.click();
    await sleep(1200);
  }
  const themeBtn = page.getByRole('button', { name: /Configure Brand Theme|Customize Theme/i }).first();
  if (await themeBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await themeBtn.click();
    await sleep(2000);
    const modal = page.getByRole('dialog').filter({ hasText: /Theme|Palette|Background|Font/i }).last();
    if (await modal.isVisible({ timeout: 12000 }).catch(() => false)) {
      const preview = modal.locator('.print-id-card, [class*="theme"], .overflow-y-auto').first();
      const target = (await preview.isVisible().catch(() => false)) ? preview : modal;
      await target.screenshot({ path: path.join(OUT_DIR, 'admin-theme-designer.png'), type: 'png' });
      console.log('admin-theme-designer.png (theme modal)');
    } else {
      const section = page.getByText(/Interactive Theme Designer/i).locator('xpath=ancestor::div[contains(@class,"Card")][1]');
      if (await section.isVisible({ timeout: 5000 }).catch(() => false)) {
        await section.screenshot({ path: path.join(OUT_DIR, 'admin-theme-designer.png'), type: 'png' });
        console.log('admin-theme-designer.png (theme section)');
      } else {
        await captureMarketingContent(page, path.join(OUT_DIR, 'admin-theme-designer.png'), {
          prefer: 'tabpanel',
        });
        console.log('admin-theme-designer.png (branding tab)');
      }
    }
  } else {
    const section = page.locator('[role="tabpanel"][data-state="active"]').getByText(/Default Student ID Card Theme/i).locator('xpath=ancestor::div[contains(@class,"Card")][1]');
    if (await section.isVisible({ timeout: 8000 }).catch(() => false)) {
      await section.screenshot({ path: path.join(OUT_DIR, 'admin-theme-designer.png'), type: 'png' });
      console.log('admin-theme-designer.png (id card theme card)');
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
