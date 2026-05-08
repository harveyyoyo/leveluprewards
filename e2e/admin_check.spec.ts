
import { test } from '@playwright/test';

test('login to school and then to admin portal', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER MSG: ${msg.text()}`));
    page.on('pageerror', error => console.log(`BROWSER ERROR: ${error.message}`));

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const demoPasscode = process.env.DEMO_SCHOOL_PASSCODE || '911';
    
    // 1. School Login Gate
    console.log(`Navigating to login page at ${baseUrl}/login...`);
    await page.goto(`${baseUrl}/login`);

    console.log("Opening demo schools list...");
    const demoDetails = page.locator('summary:has-text("Try a demo school")');
    await demoDetails.waitFor({ state: 'visible', timeout: 10000 });
    await demoDetails.click();

    console.log("Clicking School ABC demo login...");
    const schoolAbcBtn = page.locator('button:has-text("School ABC")');
    await schoolAbcBtn.waitFor({ state: 'visible', timeout: 10000 });
    await schoolAbcBtn.click();

    await page.locator('#passcode').fill(String(demoPasscode));
    await page.getByRole('button', { name: /continue/i }).click();

    console.log("Waiting for sign-in chooser...");
    try {
        await page.waitForURL(url => url.pathname.endsWith('/sign-in'), { timeout: 15000 });
        console.log("Successfully reached sign-in chooser!");
    } catch (e) {
        await page.screenshot({ path: 'admin_login_failure.png', fullPage: true });
        console.log("Saved admin_login_failure.png");
        throw e;
    }

    // 2. Navigate to admin sign-in and enter passcode
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.waitForURL(url => url.pathname.endsWith('/admin-signin'), { timeout: 15000 });
    await page.locator('input[type="password"]').fill(String(demoPasscode));
    await page.getByRole('button', { name: /sign in|login|continue/i }).click();

    await page.waitForURL(url => url.pathname.endsWith('/admin'), { timeout: 20000 });
    console.log("Successfully reached Admin dashboard!");

    // 2. Verify tabs
    const tabs = page.locator('button[role="tab"]');
    const tabTexts = await tabs.allInnerTexts();
    console.log("Current tabs:", tabTexts);

    await page.screenshot({ path: 'admin_portal_tabs.png', fullPage: true });
    console.log("Saved admin_portal_tabs.png");
});
