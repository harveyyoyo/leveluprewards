import fs from 'fs';

/** Kiosk UI after a student is identified (copy changes over time — keep broad). */
export const KIOSK_SIGNED_IN_RE =
  /WELCOME BACK|Welcome back|\bBALANCE\b|YOUR BALANCE|Eligible prizes|More prizes|MORE PRIZES|Eligible Rewards/i;

/** Student home portal dashboard (post sign-in). */
/** Post-login dashboard only (login screen also says “Student home”). */
export const STUDENT_HOME_DASHBOARD_RE =
  /Points balance|Redeem prizes at school on the kiosk|\bLifetime:\s*\d/i;

export async function assertPageReady(page, shotName) {
  const url = page.url();
  const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 8000);
  const onLoginRoute = /\/(login|admin-sign-in|teacher-sign-in)(?:\?|$)/i.test(url);
  const loginCopy =
    /Sign in to school|School passcode|Admin Access|Enter your passcode|Try a demo school/i.test(text) &&
    !/Insights|Houses|Library|Attendance|Notifications|Raffle|More prizes|Hall of Fame|Welcome back|WELCOME BACK|Points balance/i.test(
      text,
    );
  const errorCopy =
    /Something went wrong|Missing or insufficient permissions|Student kiosk is off/i.test(text);
  if (onLoginRoute || loginCopy) {
    throw new Error(`${shotName}: hit a login or passcode gate`);
  }
  if (errorCopy) {
    throw new Error(`${shotName}: page shows an error state (${text.slice(0, 120)}…)`);
  }
}

export function assertValidPng(filePath, { minBytes = 12_000 } = {}) {
  const buf = fs.readFileSync(filePath);
  const sig = buf.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') {
    throw new Error(`${filePath}: invalid PNG signature (${sig})`);
  }
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (!w || !h || w > 10000 || h > 10000) {
    throw new Error(`${filePath}: invalid PNG dimensions ${w}x${h}`);
  }
  if (buf.length < minBytes) {
    throw new Error(`${filePath}: PNG too small (${buf.length} bytes, min ${minBytes})`);
  }
}

export async function dismissAdminSettingsModal(page) {
  const cancel = page.getByRole('button', { name: /^Cancel$/i }).first();
  if (await cancel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancel.click();
    await page.waitForTimeout(500);
    return;
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
}

export async function enableAllAdminAddOnTabs(page) {
  await dismissAdminSettingsModal(page);
  const addMore = page.getByRole('button', { name: /^Add more$/i }).first();
  if (!(await addMore.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await addMore.click();
  await page.waitForTimeout(500);
  const allOn = page.getByText(/^All on$/i).first();
  if (await allOn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await allOn.click();
  } else {
    for (const label of ['Houses', 'Attendance', 'Notifications', 'Badges', 'Library']) {
      const item = page.getByRole('menuitemcheckbox', { name: new RegExp(label, 'i') }).first();
      if (await item.isVisible({ timeout: 1500 }).catch(() => false)) {
        if ((await item.getAttribute('aria-checked')) !== 'true') await item.click();
        await page.waitForTimeout(300);
      }
    }
  }
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
}
