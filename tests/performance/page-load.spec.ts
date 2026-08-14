import { expect, test } from '../../src/fixtures/test-fixtures';
import { env } from '../../src/config/env';
import { PRODUCTS } from '../../src/data/products';

async function getNavigationTiming(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return {
      domContentLoadedMs: nav.domContentLoadedEventEnd - nav.startTime,
      loadEventMs: nav.loadEventEnd - nav.startTime,
      ttfbMs: nav.responseStart - nav.startTime,
    };
  });
}

test.describe('Performance smoke', () => {
  test('TC-PERF-01 — the home page loads within budget', async ({ page }) => {
    let timing: Awaited<ReturnType<typeof getNavigationTiming>>;

    await test.step('Load the home page', async () => {
      await page.goto('/');
      await expect(page.locator('.card-title').first()).toBeVisible();
      timing = await getNavigationTiming(page);
      console.log('[perf] home page navigation timing:', timing);
    });

    await test.step('Verify load time and TTFB are within budget', async () => {
      expect(timing.loadEventMs).toBeGreaterThan(0);
      expect(timing.loadEventMs).toBeLessThan(env.performanceMaxLoadMs);
      expect(timing.ttfbMs).toBeLessThan(env.performanceMaxTtfbMs);
    });
  });

  test('TC-PERF-02 — a product page loads within budget', async ({ page, homePage, productPage }) => {
    let timing: Awaited<ReturnType<typeof getNavigationTiming>>;

    await test.step('Open a product page', async () => {
      await homePage.goto();
      await homePage.openProduct(PRODUCTS.PHONE);
      await productPage.waitUntilLoaded();
      timing = await getNavigationTiming(page);
      console.log('[perf] product page navigation timing:', timing);
    });

    await test.step('Verify load time is within budget', async () => {
      expect(timing.loadEventMs).toBeGreaterThan(0);
      expect(timing.loadEventMs).toBeLessThan(env.performanceMaxLoadMs);
    });
  });
});
