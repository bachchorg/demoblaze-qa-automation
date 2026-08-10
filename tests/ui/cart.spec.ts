import { expect, test } from '../../src/fixtures/test-fixtures';
import { PRODUCTS } from '../../src/data/products';

/**
 * Known environment characteristic (see README): demoblaze's cart is shared
 * across every visitor to the public demo, not scoped to the session. Most
 * assertions here therefore check "my product is present" rather than "the
 * cart has exactly N items" — the exception is TC-CART-07, which explicitly
 * clears the cart first because a clean total is the point of that case.
 */
test.describe('Cart & Checkout', () => {
  test('TC-CART-01 @smoke — adding a product surfaces a confirmation and lists it in the cart', async ({
    homePage,
    productPage,
    cartPage,
  }) => {
    await homePage.goto();
    await homePage.openProduct(PRODUCTS.PHONE);
    await productPage.waitUntilLoaded();

    const message = await productPage.addToCart();
    expect(message).toMatch(/^Product added\.?$/);

    await cartPage.goto();
    await expect(cartPage.getRowsByProductTitle(PRODUCTS.PHONE).first()).toBeVisible();
  });

  test('TC-CART-02 @smoke @regression — full journey: log in, add to cart, place an order', async ({
    loggedInHomePage,
    productPage,
    cartPage,
  }, testInfo) => {
    // demoblaze's cart isn't scoped per browser/session — it's one shared
    // datastore behind every visitor (see class doc above), so
    // removeAllItems() run from two browser *projects* at the same wall-clock
    // moment race each other for exclusive ownership of that one cart.
    // firefox/webkit/mobile-chrome already prove the UI mechanics work
    // (TC-CART-01/03/04/05/06/08 pass identically on all four); re-running
    // this specific cart-clearing purchase flow concurrently from every
    // engine doesn't add engine-compatibility signal, it just fights itself.
    // Keep the exclusive-ownership flow on a single project.
    test.skip(testInfo.project.name !== 'chromium', 'cart-clearing flow only runs on the primary project — see comment above');

    // 1. Isolate this run's total by clearing whatever the shared demo cart
    // already contained (see class doc above) *before* adding anything.
    await cartPage.goto();
    await cartPage.removeAllItems();

    // 2. Add a product to the cart while logged in. `removeAllItems` left us
    // on cart.html, so navigate back to the catalog first.
    await loggedInHomePage.goto();
    await loggedInHomePage.openProduct(PRODUCTS.PHONE);
    await productPage.waitUntilLoaded();
    const productPrice = await productPage.getPrice();
    const addMessage = await productPage.addToCart();
    expect(addMessage).toMatch(/^Product added\.?$/);

    await cartPage.goto();
    await expect(cartPage.getRowsByProductTitle(PRODUCTS.PHONE)).toHaveCount(1);
    // Auto-retrying assertion, not a one-shot getTotal() read: the row list
    // and total both render off the async /viewcart response with no DOM
    // signal of completion, so a single read can observe the pre-render "0"
    // — see CartPage.goto() doc comment.
    await expect(cartPage.totalLabel).toHaveText(String(productPrice));

    // 3. Place the order.
    await cartPage.openPlaceOrder();
    expect(await cartPage.orderModal.getDisplayedTotal()).toBe(productPrice);

    await cartPage.orderModal.fill({
      name: 'QA Automation',
      country: 'Vietnam',
      city: 'Ho Chi Minh City',
      card: '4111111111111111',
      month: '12',
      year: '2030',
    });
    await cartPage.orderModal.purchase();

    // 4. Verify the confirmation receipt.
    await cartPage.confirmation.waitUntilVisible();
    const receipt = await cartPage.confirmation.getReceipt();
    expect(receipt.orderId).toBeTruthy();
    expect(receipt.amount).toBe(productPrice);
    expect(receipt.name).toBe('QA Automation');

    await cartPage.confirmation.confirm();
  });

  test('TC-CART-03 @edge — adding the same product twice creates two separate line items', async ({
    homePage,
    productPage,
    cartPage,
  }) => {
    await homePage.goto();
    // Monitors aren't in the home page's default view — filter to them first.
    await homePage.filterByCategory('monitor');
    await homePage.openProduct(PRODUCTS.MONITOR);
    await productPage.waitUntilLoaded();
    // Adding to cart just triggers an alert — it doesn't navigate away, so
    // the product page (and its "Add to cart" link) is still right there.
    await productPage.addToCart();
    await productPage.addToCart();

    await cartPage.goto();
    // demoblaze has no quantity/merge concept — two adds is two rows, not
    // one row with qty=2. Documented here rather than assumed.
    //
    // expect.poll, not a one-shot .count(): the row list renders off an
    // async response with no DOM-visible "loading" state, so a single read
    // right after goto() can observe the pre-render count.
    await expect
      .poll(() => cartPage.getRowsByProductTitle(PRODUCTS.MONITOR).count(), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(2);
  });

  test('TC-CART-04 — deleting an item removes it from the cart', async ({
    homePage,
    productPage,
    cartPage,
  }) => {
    await homePage.goto();
    await homePage.openProduct(PRODUCTS.LAPTOP);
    await productPage.waitUntilLoaded();
    await productPage.addToCart();

    await cartPage.goto();
    const row = cartPage.getRowsByProductTitle(PRODUCTS.LAPTOP).first();
    await expect(row).toBeVisible();
    const countBefore = await cartPage.getItemCount();

    await row.locator('text=Delete').click();
    await expect(cartPage.rows).toHaveCount(countBefore - 1, { timeout: 10_000 });
  });

  test('TC-CART-05 — placing an order with Name and Card empty is rejected client-side', async ({
    homePage,
    productPage,
    cartPage,
  }) => {
    await homePage.goto();
    await homePage.openProduct(PRODUCTS.PHONE);
    await productPage.waitUntilLoaded();
    await productPage.addToCart();

    await cartPage.goto();
    await cartPage.openPlaceOrder();
    // Leave Name/Card blank; fill only the optional fields.
    await cartPage.orderModal.fill({ country: 'Vietnam', city: 'Hanoi', month: '1', year: '2030' });

    const message = await cartPage.orderModal.purchaseExpectingValidationError();
    expect(message).toBe('Please fill out Name and Creditcard.');
    // Rejected submission must not produce a confirmation.
    await expect(cartPage.confirmation.root).toBeHidden();
  });

  test('TC-CART-06 @edge — optional address/date fields can be left blank', async ({
    homePage,
    productPage,
    cartPage,
  }) => {
    await homePage.goto();
    await homePage.openProduct(PRODUCTS.PHONE);
    await productPage.waitUntilLoaded();
    await productPage.addToCart();

    await cartPage.goto();
    await cartPage.openPlaceOrder();
    // Only the two fields the app actually validates.
    await cartPage.orderModal.fill({ name: 'Minimal Fields', card: '4111111111111111' });
    await cartPage.orderModal.purchase();

    await cartPage.confirmation.waitUntilVisible();
    const receipt = await cartPage.confirmation.getReceipt();
    expect(receipt.name).toBe('Minimal Fields');
    await cartPage.confirmation.confirm();
  });

  test('TC-CART-07 — the cart total equals the sum of its own line items', async ({
    homePage,
    productPage,
    cartPage,
  }, testInfo) => {
    // Same cross-project race as TC-CART-02 — see that test's comment.
    test.skip(testInfo.project.name !== 'chromium', 'cart-clearing flow only runs on the primary project — see TC-CART-02 comment');

    await cartPage.goto();
    await cartPage.removeAllItems();

    await homePage.goto();
    await homePage.openProduct(PRODUCTS.PHONE);
    await productPage.waitUntilLoaded();
    const price = await productPage.getPrice();
    await productPage.addToCart();

    await cartPage.goto();

    // Auto-retrying assertion — see the TC-CART-02 comment above for why a
    // one-shot getTotal() read is racy here.
    await expect(cartPage.totalLabel).toHaveText(String(price));
  });

  test('TC-CART-08 @edge — the cart is reachable without being logged in', async ({
    page,
    cartPage,
  }) => {
    await page.goto('/cart.html');
    await cartPage.waitForCartToSettle();
    // A guest can view the cart page itself; it just isn't tied to any
    // authenticated identity. The meaningful assertion is that it renders
    // without erroring, not any particular item count.
    await expect(cartPage.totalLabel).toBeVisible();
  });
});
