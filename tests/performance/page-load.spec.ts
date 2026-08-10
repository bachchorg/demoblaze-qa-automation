import { expect, test } from '../../src/fixtures/test-fixtures';
import { PRODUCTS } from '../../src/data/products';

/**
 * A lightweight page-load smoke check using the browser's own Navigation
 * Timing API — not a substitute for real load/perf testing. For actual
 * throughput/latency-under-load work, layer in a dedicated tool (k6,
 * Artillery, or Lighthouse CI for web-vitals) that hits the app the way
 * production traffic would; this suite exists to catch an obvious
 * regression (a page that used to load in ~1s suddenly taking 10s) as part
 * of the same CI run, not to replace that tooling. See README "Performance
 * testing" for the rationale.
 */
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

const MAX_LOAD_EVENT_MS = 8000;
const MAX_TTFB_MS = 3000;

test.describe('Performance smoke', () => {
  test('TC-PERF-01 — the home page loads within budget', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.card-title').first()).toBeVisible();

    const timing = await getNavigationTiming(page);
    console.log('[perf] home page navigation timing:', timing);
    expect(timing.loadEventMs).toBeLessThan(MAX_LOAD_EVENT_MS);
    expect(timing.ttfbMs).toBeLessThan(MAX_TTFB_MS);
  });

  test('TC-PERF-02 — a product page loads within budget', async ({ page, homePage, productPage }) => {
    await homePage.goto();
    await homePage.openProduct(PRODUCTS.PHONE);
    await productPage.waitUntilLoaded();

    const timing = await getNavigationTiming(page);
    console.log('[perf] product page navigation timing:', timing);
    expect(timing.loadEventMs).toBeLessThan(MAX_LOAD_EVENT_MS);
  });
});
