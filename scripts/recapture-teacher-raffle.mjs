import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { captureMarketingContent } from './marketing-screenshot-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'marketing', 'screenshots', 'teacher-raffle.png');
const AUTH_DIR = path.join(ROOT, 'promo-video', 'public', '.capture-auth');
const BASE = process.env.CAPTURE_BASE_URL?.trim()?.replace(/\/+$/, '') || 'https://portal.leveluprewards.app';
const SCHOOL = 'schoolabc';
const SCHOOL_PASS = process.env.DEMO_SCHOOL_PASSCODE || '1234';
const TEACHER = process.env.DEMO_TEACHER_NAME || 'Mr. Smith';
const TEACHER_PASS = process.env.DEMO_TEACHER_PASSCODE || '1234';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('summary:has-text("Try a demo school")').click();
  await page.locator('button:has-text("School ABC")').click();
  await sleep(300);
  await page.locator('#passcode').fill(SCHOOL_PASS);
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL(/\/portal/, { timeout: 60000 });
  await sleep(800);
  await page.getByRole('link', { name: /Teacher Portal/i }).first().click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: TEACHER }).click();
  await page.locator('#teacher-passcode').fill(TEACHER_PASS);
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.waitForURL(/\/teacher/, { timeout: 60000 });
  await sleep(2000);
  const tabs = await page.getByRole('tab').allTextContents();
  console.log('Tabs:', tabs.join(' | '));
  const raffle = page.getByRole('tab', { name: /^Raffle$/i }).first();
  if (await raffle.isVisible().catch(() => false)) {
    await raffle.click();
    await sleep(1500);
  } else {
    await page.getByRole('tab', { name: /^Points$/i }).first().click().catch(() => {});
    await sleep(800);
  }
  const { mode } = await captureMarketingContent(page, OUT, { prefer: 'tabpanel' });
  console.log('capture mode:', mode);
  await ctx.storageState({ path: path.join(AUTH_DIR, 'teacher.json') });
  console.log('Saved', OUT);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
