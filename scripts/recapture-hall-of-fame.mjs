import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { captureMarketingContent } from './marketing-screenshot-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'marketing', 'screenshots', 'hall-of-fame.png');
const BASE = process.env.CAPTURE_BASE_URL?.trim()?.replace(/\/+$/, '') || 'https://portal.leveluprewards.app';
const SCHOOL = 'schoolabc';
const TEACHER = process.env.DEMO_TEACHER_NAME || 'Mr. Smith';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function teacherLogin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('summary:has-text("Try a demo school")').click();
  await page.locator('button:has-text("School ABC")').click();
  await sleep(300);
  await page.locator('#passcode').fill('1234');
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL(/\/portal/, { timeout: 60000 });
  await sleep(800);
  await page.getByRole('link', { name: /Teacher Portal/i }).first().click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: TEACHER }).click();
  await page.locator('#teacher-passcode').fill('1234');
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.waitForURL(/\/teacher/, { timeout: 60000 });
  await sleep(1500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await teacherLogin(page);
  await page.goto(`${BASE}/${SCHOOL}/hall-of-fame?fullscreen=1`, { waitUntil: 'domcontentloaded' });
  await page
    .getByText(/Hall of Fame|Leaderboard|Lifetime|Students|Goals/i)
    .first()
    .waitFor({ timeout: 60000 })
    .catch(() => {});
  await sleep(2000);
  const clip = await page.evaluate(() => {
    const root = document.querySelector('#screen-view');
    if (!root) return null;
    const subtitle = [...root.querySelectorAll('p,span,div')].find(
      (el) =>
        el.children.length === 0 &&
        /ENTIRE SCHOOL/i.test(el.textContent ?? '') &&
        /LIFETIME/i.test(el.textContent ?? ''),
    );
    const r = root.getBoundingClientRect();
    let top = r.top + 60;
    if (subtitle) top = subtitle.getBoundingClientRect().bottom + 12;
    const height = r.bottom - top;
    if (height < 200) return null;
    return { x: r.left + 8, y: top, width: r.width - 16, height: Math.min(height, 620) };
  });
  if (clip) {
    await page.screenshot({ path: OUT, type: 'png', animations: 'disabled', clip });
    console.log('hall-of-fame.png clip');
  } else {
    const { mode } = await captureMarketingContent(page, OUT, { prefer: 'fullscreen' });
    console.log('hall-of-fame.png', mode);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
