import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = 'C:/Users/Administrator/.gemini/antigravity/brain/07b6c430-ccc5-4542-b85b-33a2f757dbee';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`Saved ${name}.png`);
}

// Login page
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await shot('01_login');

// Try to find a school link or navigate directly
const schoolLink = page.locator('a[href*="/"]').first();
const href = await schoolLink.getAttribute('href').catch(() => null);
console.log('First link href:', href);

// Click settings gear if visible on login page
const gear = page.locator('button:has(svg.lucide-settings), button[aria-label*="settings" i]').first();
if (await gear.isVisible().catch(() => false)) {
  await gear.click();
  await page.waitForTimeout(600);
  await shot('02_settings_modal');
  // Check display mode toggle
  const webBtn = page.locator('button[aria-pressed]').first();
  console.log('Web button aria-pressed:', await webBtn.getAttribute('aria-pressed').catch(() => 'not found'));
  // Close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// Try portal
await page.goto(`${BASE}/demo/portal`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await shot('03_portal');

// Try Hall of Fame
await page.goto(`${BASE}/demo/halloffame`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await shot('04_halloffame');

// Try prize
await page.goto(`${BASE}/demo/prize`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await shot('05_prize');

// Try teacher
await page.goto(`${BASE}/demo/teacher`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await shot('06_teacher');

await browser.close();
console.log('Done!');
