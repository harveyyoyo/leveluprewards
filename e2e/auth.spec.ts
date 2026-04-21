import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const SAMPLE_SCHOOL_ID = 'schoolabc';

test('demo login lands on the portal and navigates to the student kiosk', async ({ page }) => {
    page.on('console', (msg) => console.log(`BROWSER MSG: ${msg.text()}`));
    page.on('pageerror', (error) => console.log(`BROWSER ERROR: ${error.message}`));

    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/`);

    // The sample login buttons were renamed to "Demo: School ABC" / "Demo: Yeshiva"
    // and authed school sessions now route under `/<schoolId>/portal`.
    console.log('Clicking Demo: School ABC...');
    const demoButton = page.getByRole('button', { name: /demo: school abc/i });
    await demoButton.waitFor({ state: 'visible', timeout: 10_000 });
    await demoButton.click();

    console.log('Waiting for portal...');
    try {
        await page.waitForURL(`${BASE_URL}/${SAMPLE_SCHOOL_ID}/portal`, { timeout: 15_000 });
    } catch (e) {
        await page.screenshot({ path: 'auth_test_failure.png', fullPage: true });
        console.log('Saved auth_test_failure.png');
        throw e;
    }

    console.log('Reached portal — verifying it stays there.');
    await page.waitForTimeout(1_500);
    expect(page.url()).toBe(`${BASE_URL}/${SAMPLE_SCHOOL_ID}/portal`);

    console.log('Clicking Student Kiosk tile...');
    const kioskTile = page.getByRole('link', { name: /student kiosk/i }).first();
    await kioskTile.waitFor({ state: 'visible', timeout: 10_000 });
    await kioskTile.click();

    console.log('Waiting for student page...');
    await page.waitForURL(`${BASE_URL}/${SAMPLE_SCHOOL_ID}/student`, { timeout: 10_000 });
    expect(page.url()).toBe(`${BASE_URL}/${SAMPLE_SCHOOL_ID}/student`);

    console.log('Test passed!');
});
