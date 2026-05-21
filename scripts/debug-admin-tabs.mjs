import { chromium } from '@playwright/test';

const BASE = 'https://portal.leveluprewards.app';
const SCHOOL = 'schoolabc';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${BASE}/login`);
await page.locator('summary:has-text("Try a demo school")').click();
await page.locator('button:has-text("School ABC")').click();
await sleep(300);
await page.locator('#passcode').fill('1234');
await page.getByRole('button', { name: /Sign in to school/i }).click();
await page.waitForURL(/portal/, { timeout: 60000 });
await sleep(1000);
await page.goto(`${BASE}/${SCHOOL}/admin-sign-in?redirect=${encodeURIComponent(`/${SCHOOL}/admin`)}`);
await sleep(1000);
await page.locator('input[type="password"]').first().fill('1234');
const buttons = await page.getByRole('button').allTextContents();
console.log('buttons:', buttons.filter(Boolean).slice(0, 20).join(' | '));
await page.getByRole('button', { name: /Sign in|Continue|Access|Unlock/i }).first().click();
await sleep(6000);
console.log('url:', page.url());
const cancel = page.getByRole('button', { name: /^Cancel$/i }).first();
if (await cancel.isVisible().catch(() => false)) await cancel.click();
await sleep(800);
const addMore = page.getByRole('button', { name: /^Add more$/i }).first();
if (await addMore.isVisible().catch(() => false)) {
  await addMore.click();
  await sleep(600);
  const allOn = page.getByRole('button', { name: /All on/i }).first();
  console.log('all on visible:', await allOn.isVisible().catch(() => false));
  await allOn.click().catch((e) => console.log('all on click fail', e.message));
  await sleep(2500);
  await page.keyboard.press('Escape');
  await sleep(500);
}
const tabs = await page.getByRole('tab').allTextContents();
console.log('tabs:', tabs.join(' | ') || '(none)');
const housesBtn = page.locator('button', { hasText: /^Houses$/ });
console.log('houses visible:', await housesBtn.isVisible().catch(() => false));
const body = await page.locator('body').innerText();
console.log('snippet:', body.slice(0, 500).replace(/\s+/g, ' '));
await page.screenshot({ path: 'public/marketing/screenshots/debug-admin.png' });
await browser.close();
