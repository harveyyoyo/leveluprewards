import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { SAMPLE_SCHOOL_ACCESS_PASSCODE } from '../src/lib/sampleSchools';

const ARTIFACT_DIR = process.env.WALKTHROUGH_ARTIFACT_DIR || 'test-results/face-state-lock';
mkdirSync(ARTIFACT_DIR, { recursive: true });

test('school settings show a state picker that can lock Face', async ({ page }) => {
  test.setTimeout(120000);
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
  const demoPasscode = process.env.DEMO_SCHOOL_PASSCODE || SAMPLE_SCHOOL_ACCESS_PASSCODE;

  await page.goto(`${baseUrl}/login`);
  await page.locator('summary:has-text("Try a demo school")').click();
  await page.locator('button:has-text("School ABC")').click();
  await page.locator('#passcode').fill(String(demoPasscode));
  await page.getByRole('button', { name: /Sign in to school/i }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/portal'), { timeout: 30000 });

  await page.getByRole('link', { name: /Admin/i }).first().click();
  await page.locator('#admin-passcode').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#admin-passcode').fill(String(demoPasscode));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/admin'), { timeout: 30000 });

  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /School settings|General/i }).first().click();
  await page.getByRole('button', { name: 'Kiosk' }).click();
  const schoolState = page.getByText('School state');
  await expect(schoolState).toBeVisible({ timeout: 15000 });
  await schoolState.scrollIntoViewIfNeeded();
  await expect(page.getByText(/Face sign-in turns off in states that do not allow it/i)).toBeVisible();
  await expect(page.getByText('Face', { exact: true })).toBeVisible();

  await page.screenshot({
    path: `${ARTIFACT_DIR}/face_state_lock_kiosk.png`,
    fullPage: false,
  });
});
