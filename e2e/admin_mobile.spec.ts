import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { SAMPLE_SCHOOL_ACCESS_PASSCODE } from '../src/lib/sampleSchools';

const ARTIFACT_DIR = process.env.WALKTHROUGH_ARTIFACT_DIR || 'test-results/admin-mobile';
mkdirSync(ARTIFACT_DIR, { recursive: true });

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test('admin stays available on a phone-sized screen', async ({ page }) => {
  test.setTimeout(120000);

  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  const demoPasscode = process.env.DEMO_SCHOOL_PASSCODE || SAMPLE_SCHOOL_ACCESS_PASSCODE;

  await page.goto(`${baseUrl}/login`);

  const demoDetails = page.locator('summary:has-text("Try a demo school")');
  await demoDetails.waitFor({ state: 'visible', timeout: 30000 });
  await demoDetails.click();

  const schoolAbcBtn = page.locator('button:has-text("School ABC")');
  await schoolAbcBtn.waitFor({ state: 'visible', timeout: 30000 });
  await schoolAbcBtn.click();

  await page.locator('#passcode').fill(String(demoPasscode));
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/portal'), { timeout: 30000 });

  await expect(page.getByText(/Admin needs a larger screen/i)).toHaveCount(0);
  const adminCard = page.getByRole('link', { name: /Admin/i }).first();
  await expect(adminCard).toBeVisible({ timeout: 15000 });
  await page.screenshot({
    path: `${ARTIFACT_DIR}/admin_mobile_portal.png`,
    fullPage: true,
  });

  await adminCard.click();

  const passcodeModalInput = page.locator('#admin-passcode');
  await passcodeModalInput.waitFor({ state: 'visible', timeout: 30000 });
  await passcodeModalInput.fill(String(demoPasscode));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/admin'), { timeout: 30000 });

  await expect(page.getByText(/Admin needs a larger screen/i)).toHaveCount(0);
  await expect(page.getByText(/needs a larger screen/i)).toHaveCount(0);

  const sectionPicker = page.locator('#admin-portal-section');
  await expect(sectionPicker).toBeVisible({ timeout: 30000 });
  await expect(sectionPicker).toContainText(/./);

  await page.screenshot({
    path: `${ARTIFACT_DIR}/admin_mobile_open.png`,
    fullPage: true,
  });
});
