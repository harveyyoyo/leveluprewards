import { expect, test } from '@playwright/test';

const RESPONSIVE_WIDTHS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
];

async function seedDemoSchool(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('loginState', 'school');
    localStorage.setItem('schoolId', 'schoolabc');
  });
}

test.describe('responsive design safeguards', () => {
  test('public pages do not scroll sideways at supported widths', async ({ page }) => {
    for (const route of ['/', '/contact', '/marketing/index.html']) {
      for (const viewport of RESPONSIVE_WIDTHS) {
        await page.setViewportSize(viewport);
        await page.goto(`http://127.0.0.1:3001${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 120_000,
        });
        const widths = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(widths.document, `${route} at ${viewport.width}px`).toBeLessThanOrEqual(
          widths.viewport,
        );
      }
    }
  });

  test('the school chooser can reach its final card on small phones', async ({ page }) => {
    await seedDemoSchool(page);
    await page.goto('http://127.0.0.1:3001/schoolabc/portal', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.getByText('Where to?', { exact: true }).waitFor({ state: 'visible', timeout: 120_000 });

    for (const viewport of RESPONSIVE_WIDTHS) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      const result = await page.evaluate(() => {
        const hub = document.querySelector<HTMLElement>('[data-intro-tour="portal-hub"]');
        if (!hub) return null;
        let scroller: HTMLElement | null = hub;
        while (
          scroller &&
          scroller !== document.body &&
          !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)
        ) {
          scroller = scroller.parentElement;
        }
        if (!scroller || scroller === document.body) return null;
        scroller.scrollTop = scroller.scrollHeight;
        const lastCard = Array.from(hub.querySelectorAll<HTMLAnchorElement>('a[href]')).at(-1);
        const cardRect = lastCard?.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        return {
          canScroll: scroller.scrollHeight > scroller.clientHeight,
          lastCardVisible:
            !!cardRect &&
            cardRect.top >= scrollerRect.top - 1 &&
            cardRect.bottom <= scrollerRect.bottom + 1,
        };
      });
      expect(result, `portal at ${viewport.width}px`).not.toBeNull();
      if (viewport.width <= 390) expect(result?.canScroll).toBe(true);
      expect(result?.lastCardVisible, `last portal card at ${viewport.width}px`).toBe(true);
    }
  });

  test('the smallest header keeps the school name readable', async ({ page }) => {
    await seedDemoSchool(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('http://127.0.0.1:3001/schoolabc/portal', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    const schoolLink = page.locator('#levelup-global-app-header a[aria-label="Home"]').filter({
      hasText: 'School ABC',
    });
    await expect(schoolLink).toBeVisible({ timeout: 120_000 });
    const box = await schoolLink.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(60);
  });

  test('classroom theme actions stay inside the screen', async ({ page }) => {
    await seedDemoSchool(page);
    await page.goto('http://127.0.0.1:3001/schoolabc/classroom/themes', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.getByRole('button', { name: /Choose Theme|Hide Themes/ }).waitFor({
      state: 'visible',
      timeout: 120_000,
    });

    for (const viewport of RESPONSIVE_WIDTHS) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      const actions = [
        page.getByRole('button', { name: /Apply to Classroom/ }),
        page.getByRole('link', { name: /Open Classroom/ }),
      ];
      for (const action of actions) {
        await expect(action, `theme action at ${viewport.width}px`).toHaveCount(1);
        const box = await action.boundingBox();
        expect(box, `theme action at ${viewport.width}px`).not.toBeNull();
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);
      }
    }
  });

  test('wide admin records remain reachable by sideways scrolling', async ({ page }) => {
    test.setTimeout(120_000);
    await seedDemoSchool(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('http://127.0.0.1:3001/schoolabc/admin?tab=bonuspoints', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page.getByText('Bonus Points', { exact: true }).first().waitFor({
      state: 'visible',
      timeout: 120_000,
    });
    const scroller = page.locator('ul.overflow-x-auto').first();
    await expect(scroller).toBeVisible();
    const widths = await scroller.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    const moved = await scroller.evaluate((element) => {
      element.scrollLeft = 120;
      return element.scrollLeft;
    });
    expect(moved).toBeGreaterThan(0);
  });
});
