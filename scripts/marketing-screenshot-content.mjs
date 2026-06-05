/**
 * Screenshots feature content only (no app header / tab bar / portal chrome).
 */

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ prefer?: 'auto' | 'tabpanel' | 'portal' | 'kiosk' | 'kiosk-idle' | 'fullscreen' | 'clip-main' }} [options]
 * @returns {Promise<import('@playwright/test').Locator | null>}
 */
export async function resolveMarketingContentLocator(page, options = {}) {
  const prefer = options.prefer ?? 'auto';

  const ok = async (locator, minH = 100) => {
    const loc = locator.first();
    if (!(await loc.count())) return null;
    const box = await loc.boundingBox().catch(() => null);
    if (!box || box.width < 180 || box.height < minH) return null;
    return loc;
  };

  if (prefer === 'tabpanel' || prefer === 'auto') {
    const count = await page.locator('[role="tabpanel"][data-state="active"]').count();
    if (count > 0) {
      const tabpanel = page.locator('[role="tabpanel"][data-state="active"]').nth(count - 1);
      const belowTabs = tabpanel
        .locator('div')
        .filter({ hasNot: page.locator('[role="tablist"]') })
        .filter({ has: page.locator('table, [class*="Card"], .card, h2, h3') })
        .first();
      const belowFound = await ok(belowTabs, 120);
      if (belowFound) return belowFound;
      const found = await ok(tabpanel, 120);
      if (found) return found;
    }
  }

  if (prefer === 'portal' || (prefer === 'auto' && /\/portal\/?$/.test(new URL(page.url()).pathname))) {
    const ready = await page
      .getByText(/Admin Portal|Teacher Portal|Student Kiosk|Where to/i)
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    if (ready) {
      const links = page.locator('#screen-view').getByRole('link', {
        name: /Admin Portal|Teacher Portal|Student Kiosk/i,
      });
      const found = await ok(links.first().locator('xpath=ancestor::div[1]/..'), 200);
      if (found) return found;
      const cards = page
        .locator('#screen-view')
        .locator('div')
        .filter({ has: links });
      const cardsFound = await ok(cards.last(), 220);
      if (cardsFound) return cardsFound;
    }
  }

  if (prefer === 'fullscreen' || prefer === 'auto') {
    const onHof = page.url().includes('hall-of-fame');
    const onBulletin = page.url().includes('bulletin-board');
    if (onHof) {
      const grid = page.locator('#screen-view div.grid').first();
      const gridFound = await ok(grid, 180);
      if (gridFound) return gridFound;
    }
    if (onBulletin) {
      const board = page.locator('#screen-view').locator('div').filter({ hasText: /Bulletin|WOW|Incentives/i }).first();
      const boardFound = await ok(board, 200);
      if (boardFound) return boardFound;
      const podium = page.locator('#screen-view').getByText(/Hall of Fame|Leaderboard|Lifetime/i).first();
      if (await podium.isVisible({ timeout: 5000 }).catch(() => false)) {
        const block = podium.locator('xpath=ancestor::div[contains(@class,"min-h")][1]');
        const blockFound = await ok(block, 200);
        if (blockFound) return blockFound;
      }
    }
    const inner = page.locator('#screen-view > div').first();
    const innerFound = await ok(inner, 220);
    if (innerFound) return innerFound;
  }

  if (prefer === 'kiosk' || prefer === 'kiosk-idle') {
    const marker =
      prefer === 'kiosk-idle'
        ? /System Ready|Identify Student|Please scan|Type your badge/i
        : /WELCOME BACK|Welcome back|YOUR BALANCE|Eligible prizes|More prizes|Eligible Rewards/i;
    const hit = page.locator('#screen-view').getByText(marker).first();
    if (await hit.isVisible({ timeout: 5000 }).catch(() => false)) {
      const card = hit.locator('xpath=ancestor::*[contains(@class,"Card") or contains(@class,"card")][1]');
      const cardFound = await ok(card, 140);
      if (cardFound) return cardFound;
    }
  }

  return null;
}

async function clipActiveTabpanel(page) {
  return page.evaluate(() => {
    const panels = [...document.querySelectorAll('[role="tabpanel"][data-state="active"]')];
    const panel = panels[panels.length - 1];
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    const tablist = panel.querySelector('[role="tablist"]');
    let top = r.top + 4;
    if (tablist) top = Math.max(top, tablist.getBoundingClientRect().bottom + 6);
    const height = r.bottom - top;
    if (height < 120) return null;
    return {
      x: Math.max(0, r.left + 2),
      y: Math.max(0, top),
      width: Math.max(200, r.width - 4),
      height: Math.min(height, 660),
    };
  });
}

async function clipMainContent(page) {
  return page.evaluate(() => {
    const main = document.querySelector('#screen-view');
    if (!main) return null;
    const m = main.getBoundingClientRect();
    const header = document.querySelector('header');
    const tablist = main.querySelector('[role="tablist"]');
    let top = m.top + 4;
    if (header) top = Math.max(top, header.getBoundingClientRect().bottom + 4);
    if (tablist) top = Math.max(top, tablist.getBoundingClientRect().bottom + 6);
    const adminHeading = [...main.querySelectorAll('h1,h2')].find((el) =>
      /^(Admin|Teacher Portal)$/i.test((el.textContent ?? '').trim()),
    );
    if (adminHeading) {
      const h = adminHeading.getBoundingClientRect();
      top = Math.max(top, h.bottom + 8);
    }
    const height = Math.min(m.bottom - top, 660);
    if (height < 120) return null;
    return {
      x: Math.max(0, m.left + 2),
      y: Math.max(0, top),
      width: Math.max(200, m.width - 4),
      height,
    };
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} filePath
 * @param {{ prefer?: string }} [options]
 */
export async function captureMarketingContent(page, filePath, options = {}) {
  const prefer = options.prefer ?? 'auto';

  if (prefer === 'tabpanel' || prefer === 'auto') {
    const tabClip = await clipActiveTabpanel(page);
    if (tabClip) {
      await page.screenshot({ path: filePath, type: 'png', animations: 'disabled', clip: tabClip });
      return { mode: 'tabpanel-clip' };
    }
  }

  const loc = await resolveMarketingContentLocator(page, { prefer });
  if (loc) {
    await loc.screenshot({ path: filePath, type: 'png', animations: 'disabled' });
    return { mode: 'element' };
  }

  if (prefer === 'clip-main' || prefer === 'auto' || prefer === 'kiosk' || prefer === 'kiosk-idle') {
    const clip = await clipMainContent(page);
    if (clip) {
      await page.screenshot({ path: filePath, type: 'png', animations: 'disabled', clip });
      return { mode: 'clip' };
    }
  }

  await page.screenshot({ path: filePath, type: 'png', animations: 'disabled' });
  return { mode: 'fullpage-fallback' };
}
