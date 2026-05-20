import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'assets');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const passcode = process.env.DEMO_SCHOOL_PASSCODE || '1234';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const saveDebug = async (page, name) => {
  await mkdir(outDir, { recursive: true });
  const p = path.join(outDir, name);
  await page.screenshot({ path: p, fullPage: true });
  console.log('Debug screenshot:', p);
};

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const demoBtn = page.getByRole('button', { name: /sign in to demo school:\s*school abc/i });
  if (await demoBtn.count()) {
    await demoBtn.click();
  } else {
    await page.locator('summary:has-text("Try a demo school")').click();
    await page.locator('button:has-text("School ABC")').click();
    await page.locator('#passcode').fill(passcode);
    await page.getByRole('button', { name: /sign in to school|continue/i }).click();
  }
  await page.waitForURL((url) => url.pathname.endsWith('/sign-in') || url.pathname.includes('/portal'), {
    timeout: 30000,
  });

  if (!page.url().includes('/student')) {
    await page.goto(`${baseUrl}/schoolabc/portal`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const kiosk = page.getByRole('link', { name: /student kiosk/i }).or(page.getByText('Student Kiosk'));
    await kiosk.first().waitFor({ state: 'visible', timeout: 20000 });
    await kiosk.first().click();
    await page.waitForURL((url) => url.pathname.includes('/student'), { timeout: 30000 });
  }
  await page.waitForTimeout(2000);
  const manualTab = page.getByRole('tab', { name: /manual/i });
  if (await manualTab.count()) {
    await manualTab.first().click();
  }
  const idInput = page
    .getByRole('textbox', { name: /student id/i })
    .or(page.locator('input[placeholder="----"]'))
    .or(page.locator('input').filter({ hasNot: page.locator('[type="hidden"]') }).last());
  await idInput.first().waitFor({ state: 'visible', timeout: 20000 });
  await idInput.first().fill('103');
  const identify = page.getByRole('button', { name: /identify student/i });
  if (await identify.count()) {
    await identify.click();
  } else {
    await idInput.first().press('Enter');
  }
  try {
    await page.getByText('Redeem Coupon').waitFor({ state: 'visible', timeout: 30000 });
  } catch {
    await saveDebug(page, 'student-dashboard-debug-before-dashboard.png');
    throw new Error('Dashboard did not load — see debug screenshot in assets/');
  }
  const letsGo = page.getByRole('button', { name: /let'?s go/i });
  if (await letsGo.count()) {
    await letsGo.first().click();
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(800);

  console.log('Screenshot URL:', page.url());
  const hasSideRails = await page.locator('aside').count();
  const hasActivityBtn = await page.getByRole('button', { name: /^Activity$/i }).count();
  console.log('Side rails:', hasSideRails, 'Activity button:', hasActivityBtn);

  await mkdir(outDir, { recursive: true });
  const desktopPath = path.join(outDir, 'student-dashboard-layout-desktop.png');
  await page.screenshot({ path: desktopPath, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const mobilePath = path.join(outDir, 'student-dashboard-layout-mobile.png');
  await page.screenshot({ path: mobilePath, fullPage: false });

  console.log('Saved:', desktopPath);
  console.log('Saved:', mobilePath);
} finally {
  await browser.close();
}
