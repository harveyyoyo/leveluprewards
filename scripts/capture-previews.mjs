/**
 * Captures clean app screenshots by navigating to each page, waiting for it to settle,
 * then saving just the page content (no browser chrome) to public/.
 * 
 * Usage: node scripts/capture-previews.mjs
 * Requires the dev server to be running on http://localhost:3000
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SCHOOL = 'schoolabc';

async function capture(page, path, outFile, { clip } = {}) {
  console.log(`→ ${BASE}${path}`);
  await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1500);
  const opts = { path: outFile, fullPage: false };
  if (clip) opts.clip = clip;
  await page.screenshot(opts);
  console.log(`  ✓ saved ${outFile}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // --- Student detail view (hero image) ---
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await capture(page, `/${SCHOOL}/student`, './public/user_preview_student_details.png');
    await page.close();
  }

  // --- System Ready / NFC scanner ---
  {
    const page = await browser.newPage();
    // Mobile-ish viewport for kiosk
    await page.setViewportSize({ width: 600, height: 720 });
    await capture(page, `/${SCHOOL}/student`, './public/user_preview_system_ready.png');
    await page.close();
  }

  // --- Welcome back modal ---
  // The welcome modal appears briefly after scanning — capture the student page
  // with a slightly wider viewport so the modal is visible
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 900, height: 720 });
    await capture(page, `/${SCHOOL}/student`, './public/user_preview_welcome.png');
    await page.close();
  }

  // --- Hall of Fame ---
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await capture(page, `/${SCHOOL}/halloffame?fullscreen=1`, './public/user_preview_hall_of_fame.png');
    await page.close();
  }

  // --- Rewards / Prize shop ---
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await capture(page, `/${SCHOOL}/prize?student=100`, './public/user_preview_rewards_shop.png');
    await page.close();
  }

  await browser.close();
  console.log('\n✅ All screenshots captured!');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
