
import { test } from '@playwright/test';
import { SAMPLE_SCHOOL_ACCESS_PASSCODE } from '../src/lib/sampleSchools';

test('login to school and then to admin portal', async ({ page }) => {
    test.setTimeout(90000);
    page.on('console', msg => console.log(`BROWSER MSG: ${msg.text()}`));
    page.on('pageerror', error => console.log(`BROWSER ERROR: ${error.message}`));

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const demoPasscode = process.env.DEMO_SCHOOL_PASSCODE || SAMPLE_SCHOOL_ACCESS_PASSCODE;
    
    // 1. School Login Gate
    console.log(`Navigating to login page at ${baseUrl}/login...`);
    await page.goto(`${baseUrl}/login`);

    console.log("Opening demo schools list...");
    const demoDetails = page.locator('summary:has-text("Try a demo school")');
    await demoDetails.waitFor({ state: 'visible', timeout: 30000 });
    await demoDetails.click();

    console.log("Clicking School ABC demo login...");
    const schoolAbcBtn = page.locator('button:has-text("School ABC")');
    await schoolAbcBtn.waitFor({ state: 'visible', timeout: 30000 });
    await schoolAbcBtn.click();

    await page.locator('#passcode').fill(String(demoPasscode));
    await page.getByRole('button', { name: /Sign in to school/i }).click();

    console.log("Waiting for school portal...");
    try {
        await page.waitForURL(url => url.pathname.endsWith('/portal'), { timeout: 30000 });
        console.log("Successfully reached school portal!");
    } catch (e) {
        await page.screenshot({ path: 'admin_login_failure.png', fullPage: true });
        console.log("Saved admin_login_failure.png");
        throw e;
    }

    // 2. Click Admin Portal link, which triggers the admin passcode modal
    console.log("Opening Admin Portal dialog...");
    await page.getByRole('link', { name: 'Admin Portal' }).click();
    
    // Wait for the admin passcode input in the modal dialog to appear
    const passcodeModalInput = page.locator('#admin-passcode');
    await passcodeModalInput.waitFor({ state: 'visible', timeout: 30000 });
    await passcodeModalInput.fill(String(demoPasscode));
    
    console.log("Submitting admin passcode dialog...");
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.waitForURL(url => url.pathname.endsWith('/admin'), { timeout: 30000 });
    console.log("Successfully reached Admin dashboard!");

    // 2. Verify tabs
    const tabs = page.locator('button[role="tab"]');
    const tabTexts = await tabs.allInnerTexts();
    console.log("Current tabs:", tabTexts);

    await page.screenshot({ path: 'admin_portal_tabs.png', fullPage: true });
    console.log("Saved admin_portal_tabs.png");
});
