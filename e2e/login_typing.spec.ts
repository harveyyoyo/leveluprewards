import { test, expect } from '@playwright/test';

test('login page allows typing school id normally', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  await page.goto(`${baseUrl}/login`);

  const schoolId = page.locator('#schoolId');
  await expect(schoolId).toBeVisible();

  await schoolId.click();
  await schoolId.type('schoolabc', { delay: 10 });

  await expect(schoolId).toHaveValue('schoolabc');
});

