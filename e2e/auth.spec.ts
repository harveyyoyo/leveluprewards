import { test, expect } from '@playwright/test';
import { SAMPLE_SCHOOL_ACCESS_PASSCODE } from '../src/lib/sampleSchools';

test('login and navigate to portal and student pages', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER MSG: ${msg.text()}`));
    page.on('pageerror', error => console.log(`BROWSER ERROR: ${error.message}`));

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const demoPasscode = process.env.DEMO_SCHOOL_PASSCODE || SAMPLE_SCHOOL_ACCESS_PASSCODE;
    // Go to login page
    console.log(`Navigating to login page at ${baseUrl}/login...`);
    await page.goto(`${baseUrl}/login`);

    // Open demo schools details
    console.log("Opening demo schools list...");
    const demoDetails = page.locator('summary:has-text("Try a demo school")');
    await demoDetails.waitFor({ state: 'visible', timeout: 10000 });
    await demoDetails.click();

    // Wait for and click School ABC
    console.log("Clicking School ABC demo login...");
    const schoolAbcBtn = page.locator('button:has-text("School ABC")');
    await schoolAbcBtn.waitFor({ state: 'visible', timeout: 10000 });
    await schoolAbcBtn.click();

    // Demo schools should log in like any other school (passcode required).
    await page.locator('#passcode').fill(String(demoPasscode));
    await page.getByRole('button', { name: /continue/i }).click();

    console.log("Waiting for sign-in chooser...");
    try {
        await page.waitForURL(url => url.pathname.endsWith('/sign-in'), { timeout: 15000 });
    } catch (e) {
        await page.screenshot({ path: 'auth_test_failure.png', fullPage: true });
        console.log("Saved auth_test_failure.png");
        throw e;
    }

    console.log("Navigating to portal...");
    await page.goto(`${baseUrl}/schoolabc/portal`);

    console.log("Successfully reached Portal page!");

    // Verify it doesn't get kicked out
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/portal');

    // Click on Student Portal
    console.log("Clicking Student Kiosk...");
    const studentPortalBtn = page.locator('text=Student Kiosk').first();
    await studentPortalBtn.waitFor({ state: 'visible', timeout: 10000 });
    await studentPortalBtn.click();

    // Verify it goes to student and stays there
    console.log("Waiting for student page...");
    try {
        await page.waitForSelector('text=Current Balance', { timeout: 15000 });
    } catch (e) {
        await page.screenshot({ path: 'student_page_failure.png', fullPage: true });
        console.log("Saved student_page_failure.png");
        throw e;
    }
    console.log("Successfully reached Student Portal page!");

    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/student');

    console.log("Test passed!");
});
