import { chromium } from '@playwright/test';

const BASE = process.env.CAPTURE_BASE_URL?.trim()?.replace(/\/+$/, '') || 'http://127.0.0.1:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function schoolLogin(page, schoolLabel = 'Yeshiva Demo') {
  await page.goto(`${BASE}/login?school=yeshiva`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('summary:has-text("Try a demo school")').click();
  await page.locator(`button:has-text("${schoolLabel}")`).click();
  await sleep(400);
  await page.locator('#passcode').fill('1234');
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL(/\/portal/, { timeout: 60000 });
}

async function teacherLogin(page) {
  await schoolLogin(page);
  await page.getByRole('link', { name: /Teacher Portal/i }).first().click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: /Mr\.|Morah|Rebbe|Teacher/i }).first().click();
  await page.locator('#teacher-passcode').fill('1234');
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.waitForURL(/\/teacher/, { timeout: 60000 });
  await sleep(1500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await teacherLogin(page);
  const url = `${BASE}/yeshiva/hall-of-fame?fullscreen=1&rankType=houses&sortBy=lifetimePoints&limit=50&podiumSize=1&autoScroll=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);

  const text = await page.locator('body').innerText();
  console.log('URL:', page.url());
  console.log('BODY LENGTH:', text.length);
  console.log('PREVIEW:', text.slice(0, 800).replace(/\s+/g, ' ').trim());
  console.log('HAS HOF:', /Hall of Fame|House Hall|members|pts|\d{2,}/i.test(text));

  await page.screenshot({ path: 'hall-of-fame-test.png', fullPage: true });
  console.log('Screenshot: hall-of-fame-test.png');

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
