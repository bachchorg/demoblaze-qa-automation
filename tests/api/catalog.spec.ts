import { expect, test } from '../../src/fixtures/test-fixtures';
import { PRODUCTS } from '../../src/data/products';

test.describe('API — catalog', () => {
  test('TC-API-06 @smoke — the phone/notebook catalog contains the products UI tests depend on', async ({ api }) => {
    const items = await api.getEntries();
    expect(items.length).toBeGreaterThan(0);

    const phone = items.find((item) => item.title === PRODUCTS.PHONE);
    expect(phone, `${PRODUCTS.PHONE} should exist in the catalog`).toBeTruthy();
    expect(phone?.price).toBeGreaterThan(0);

    const laptop = items.find((item) => item.title === PRODUCTS.LAPTOP);
    expect(laptop, `${PRODUCTS.LAPTOP} should exist in the catalog`).toBeTruthy();
  });

  test('TC-API-07 — the monitors category contains the monitor product UI tests depend on', async ({ api }) => {
    const monitors = await api.getByCategory('monitor');
    const monitor = monitors.find((item) => item.title === PRODUCTS.MONITOR);
    expect(monitor, `${PRODUCTS.MONITOR} should exist in the monitor category`).toBeTruthy();
  });

  test('TC-API-08 @edge — an unknown category returns no items rather than erroring', async ({ api }) => {
    const items = await api.getByCategory('not-a-real-category');
    expect(Array.isArray(items)).toBe(true);
    expect(items).toHaveLength(0);
  });
});
