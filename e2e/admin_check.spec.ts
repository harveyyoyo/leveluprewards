
import { test, expect } from '@playwright/test';

test('login to school and then to admin portal', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER MSG: ${msg.text()}`));
    page.on('pageerror', error => console.log(`BROWSER ERROR: ${error.message}`));

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
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

    console.log("Waiting for choice page...");
    await page.waitForURL(url => url.pathname.includes('/sign-in'), { timeout: 15000 });
    console.log("Reached choice page!");

    // 2. Admin Login
    console.log("Clicking Admin option...");
    await page.click('text=Admin');

    console.log("Entering admin passcode...");
    await page.fill('input[type="password"]', '1234');
    await page.click('button:has-text("Sign in")');

    console.log("Waiting for admin portal...");
    try {
        await page.waitForURL(url => url.pathname.endsWith('/portal'), { timeout: 15000 });
        console.log("Successfully reached Admin Portal!");
    } catch (e) {
        await page.screenshot({ path: 'admin_login_failure.png', fullPage: true });
        console.log("Saved admin_login_failure.png");
        throw e;
    }

    // 3. Verify tabs
    const tabs = page.locator('button[role="tab"]');
    const tabTexts = await tabs.allInnerTexts();
    console.log("Current tabs:", tabTexts);

    await page.screenshot({ path: 'admin_portal_tabs.png', fullPage: true });
    console.log("Saved admin_portal_tabs.png");
});
