import { expect, test } from '../../src/fixtures/test-fixtures';
import { PRODUCTS } from '../../src/data/products';
import { CartPage } from '../../src/pages/CartPage';
import { HomePage } from '../../src/pages/HomePage';

test.describe('Cart & Checkout', () => {
  test(
    'TC-CART-01 — adding a product surfaces a confirmation and lists it in the cart',
    { tag: ['@smoke', '@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Open a product and add it to the cart', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();

        const message = await productPage.addToCart();
        expect(message).toMatch(/^Product added\.?$/);
      });

      await test.step('Verify the product is listed in the cart', async () => {
        await cartPage.goto();
        await expect(cartPage.getRowsByProductTitle(PRODUCTS.PHONE)).toHaveCount(1);
      });
    },
  );

  test(
    'TC-CART-02 — full journey: log in, add to cart, place an order',
    { tag: ['@smoke', '@regression', '@e2e'] },
    async ({ loggedInHomePage, productPage, cartPage }) => {
      await test.step('Start with an empty cart', async () => {
        await cartPage.goto();
        await cartPage.removeAllItems();
      });

      let productPrice = 0;
      await test.step('Add a product to the cart', async () => {
        await loggedInHomePage.goto();
        await loggedInHomePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        productPrice = await productPage.getPrice();
        const addMessage = await productPage.addToCart();
        expect(addMessage).toMatch(/^Product added\.?$/);
      });

      await test.step('Verify the cart total', async () => {
        await cartPage.goto();
        await expect(cartPage.getRowsByProductTitle(PRODUCTS.PHONE)).toHaveCount(1);
        await expect(cartPage.totalLabel).toHaveText(String(productPrice));
      });

      await test.step('Fill out and submit the order', async () => {
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
      });

      await test.step('Verify the purchase confirmation', async () => {
        await cartPage.confirmation.waitUntilVisible();
        const receipt = await cartPage.confirmation.getReceipt();
        expect(receipt.orderId).toBeTruthy();
        expect(receipt.amount).toBe(productPrice);
        expect(receipt.name).toBe('QA Automation');

        await cartPage.confirmation.confirm();
      });

      await test.step('Verify the cart is cleared after purchase', async () => {
        await cartPage.goto();
        await expect(cartPage.rows).toHaveCount(0);
      });
    },
  );

  test(
    'TC-CART-03 — adding the same product twice creates two separate line items',
    { tag: ['@edge', '@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Add the same product to the cart twice', async () => {
        await homePage.goto();
        await homePage.filterByCategory('monitor');
        await homePage.openProduct(PRODUCTS.MONITOR);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();
        await productPage.addToCart();
      });

      await test.step('Verify two separate rows exist', async () => {
        await cartPage.goto();
        await expect(cartPage.getRowsByProductTitle(PRODUCTS.MONITOR)).toHaveCount(2);
      });
    },
  );

  test('TC-CART-04 — deleting an item removes it from the cart', { tag: ['@regression'] }, async ({
    homePage,
    productPage,
    cartPage,
  }) => {
    await test.step('Add a product to the cart', async () => {
      await homePage.goto();
      await homePage.openProduct(PRODUCTS.LAPTOP);
      await productPage.waitUntilLoaded();
      await productPage.addToCart();
    });

    let countBefore = 0;
    await test.step('Delete the item', async () => {
      await cartPage.goto();
      const row = cartPage.getRowsByProductTitle(PRODUCTS.LAPTOP).first();
      await expect(row).toBeVisible();
      countBefore = await cartPage.getItemCount();

      await cartPage.deleteFirstItemByTitle(PRODUCTS.LAPTOP);
    });

    await test.step('Verify the row count decreased by one', async () => {
      await expect(cartPage.rows).toHaveCount(countBefore - 1);
    });
  });

  test(
    'TC-CART-05 — placing an order with Name and Card empty is rejected client-side',
    { tag: ['@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Add a product and open Place Order', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await cartPage.openPlaceOrder();
      });

      let message = '';
      await test.step('Submit with Name and Card blank', async () => {
        await cartPage.orderModal.fill({ country: 'Vietnam', city: 'Hanoi', month: '1', year: '2030' });
        message = await cartPage.orderModal.purchaseExpectingValidationError();
      });

      await test.step('Verify client-side validation', async () => {
        expect(message).toBe('Please fill out Name and Creditcard.');
        await expect(cartPage.confirmation.root).toBeHidden();
      });
    },
  );

  test(
    'TC-CART-06 — optional address/date fields can be left blank',
    { tag: ['@edge', '@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Add a product and open Place Order', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await cartPage.openPlaceOrder();
      });

      await test.step('Submit with only Name and Card filled', async () => {
        await cartPage.orderModal.fill({ name: 'Minimal Fields', card: '4111111111111111' });
        await cartPage.orderModal.purchase();
      });

      await test.step('Verify the purchase succeeds', async () => {
        await cartPage.confirmation.waitUntilVisible();
        const receipt = await cartPage.confirmation.getReceipt();
        expect(receipt.name).toBe('Minimal Fields');
        await cartPage.confirmation.confirm();
      });
    },
  );

  test('TC-CART-07 — the cart total equals the sum of its line items', { tag: ['@regression'] }, async ({
    homePage,
    productPage,
    cartPage,
  }) => {
    await test.step('Start with an empty cart', async () => {
      await homePage.goto();
      await cartPage.goto();
      await cartPage.removeAllItems();
    });

    let phonePrice = 0;
    let laptopPrice = 0;
    await test.step('Add two different products', async () => {
      await homePage.goto();
      await homePage.openProduct(PRODUCTS.PHONE);
      await productPage.waitUntilLoaded();
      phonePrice = await productPage.getPrice();
      await productPage.addToCart();

      await homePage.goto();
      await homePage.openProduct(PRODUCTS.LAPTOP);
      await productPage.waitUntilLoaded();
      laptopPrice = await productPage.getPrice();
      await productPage.addToCart();
    });

    await test.step('Verify the total is the sum of both prices', async () => {
      await cartPage.goto();
      await expect(cartPage.rows).toHaveCount(2);
      await expect(cartPage.totalLabel).toHaveText(String(phonePrice + laptopPrice));
    });
  });

  test('TC-CART-08 — the cart is reachable without being logged in', { tag: ['@edge', '@regression'] }, async ({
    page,
    homePage,
    cartPage,
  }) => {
    await test.step('Visit the cart as a guest', async () => {
      await homePage.goto();
      await cartPage.goto();
    });

    await test.step('Verify the cart renders without authentication', async () => {
      await expect(page).toHaveURL(/\/cart\.html$/);
      await expect(cartPage.placeOrderButton).toBeVisible();
      await expect(cartPage.nav.loginLink).toBeVisible();
    });
  });

  test(
    'TC-CART-12 — guest carts are isolated between browser contexts',
    { tag: ['@edge', '@security', '@regression'] },
    async ({ browser, homePage, productPage, cartPage }) => {
      await test.step('Add a product as a guest in the first context', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();
        await cartPage.goto();
        await expect(cartPage.getRowsByProductTitle(PRODUCTS.PHONE)).toHaveCount(1);
      });

      await test.step('Verify a second, independent guest context sees no items', async () => {
        const secondContext = await browser.newContext();
        try {
          const secondPage = await secondContext.newPage();
          const secondHomePage = new HomePage(secondPage);
          const secondCartPage = new CartPage(secondPage);

          await secondHomePage.goto();
          await secondCartPage.goto();
          await expect(secondCartPage.getRowsByProductTitle(PRODUCTS.PHONE)).toHaveCount(0);
        } finally {
          await secondContext.close();
        }
      });
    },
  );

  test(
    'TC-CART-11 — deleting the only remaining item empties the cart total',
    { tag: ['@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Add a single product to the cart', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();
      });

      await test.step('Remove it', async () => {
        await cartPage.goto();
        await cartPage.removeAllItems();
      });

      await test.step('Verify the cart is empty', async () => {
        await expect(cartPage.rows).toHaveCount(0);
        await expect(cartPage.totalLabel).toHaveText('');
      });
    },
  );

  test(
    'TC-CART-14 — opening "Place Order" on an empty cart is not blocked',
    { tag: ['@regression'] },
    async ({ homePage, cartPage }) => {
      await test.step('Clear the cart', async () => {
        await homePage.goto();
        await cartPage.goto();
        await cartPage.removeAllItems();
      });

      await test.step('Open Place Order and verify a zero total', async () => {
        await cartPage.openPlaceOrder();
        expect(await cartPage.orderModal.getDisplayedTotal()).toBe(0);
      });
    },
  );

  test(
    'TC-CART-15 — placing an order with only Name empty is rejected client-side',
    { tag: ['@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Add a product and open Place Order', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await cartPage.openPlaceOrder();
      });

      let message = '';
      await test.step('Submit with only Card filled', async () => {
        await cartPage.orderModal.fill({ card: '4111111111111111' });
        message = await cartPage.orderModal.purchaseExpectingValidationError();
      });

      await test.step('Verify client-side validation', async () => {
        expect(message).toBe('Please fill out Name and Creditcard.');
        await expect(cartPage.confirmation.root).toBeHidden();
      });
    },
  );

  test(
    'TC-CART-16 — placing an order with only Card empty is rejected client-side',
    { tag: ['@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Add a product and open Place Order', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await cartPage.openPlaceOrder();
      });

      let message = '';
      await test.step('Submit with only Name filled', async () => {
        await cartPage.orderModal.fill({ name: 'Card Missing' });
        message = await cartPage.orderModal.purchaseExpectingValidationError();
      });

      await test.step('Verify client-side validation', async () => {
        expect(message).toBe('Please fill out Name and Creditcard.');
        await expect(cartPage.confirmation.root).toBeHidden();
      });
    },
  );

  test(
    'TC-CART-17 — closing "Place Order" via the × button cancels without creating an order',
    { tag: ['@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Add a product and open Place Order', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await expect(cartPage.rows).toHaveCount(1);
        await cartPage.openPlaceOrder();
        await cartPage.orderModal.fill({ name: 'Should Not Purchase', card: '4111111111111111' });
      });

      await test.step('Close the modal instead of purchasing', async () => {
        await cartPage.orderModal.root.locator('.close').click();
      });

      await test.step('Verify no order was created and the cart is unchanged', async () => {
        await expect(cartPage.orderModal.root).toBeHidden();
        await expect(cartPage.confirmation.root).toBeHidden();
        await expect(cartPage.rows).toHaveCount(1);
      });
    },
  );

  test('TC-CART-18 — completing a purchase clears the cart afterward', { tag: ['@regression'] }, async ({
    homePage,
    productPage,
    cartPage,
  }) => {
    await test.step('Add a product and complete the purchase', async () => {
      await homePage.goto();
      await homePage.openProduct(PRODUCTS.PHONE);
      await productPage.waitUntilLoaded();
      await productPage.addToCart();

      await cartPage.goto();
      await expect(cartPage.rows).toHaveCount(1);
      await cartPage.openPlaceOrder();
      await cartPage.orderModal.fill({ name: 'Post Purchase Clear', card: '4111111111111111' });
      await cartPage.orderModal.purchase();
      await cartPage.confirmation.waitUntilVisible();
      await cartPage.confirmation.confirm();
    });

    await test.step('Verify the cart is empty', async () => {
      await cartPage.goto();
      await expect(cartPage.rows).toHaveCount(0);
    });
  });

  test(
    'TC-CART-19 — rapid double submit sends two cart-deletion requests',
    { tag: ['@edge', '@known-issue'] },
    async ({ page, homePage, productPage, cartPage }) => {
      await test.step('Add a product and open Place Order', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await cartPage.openPlaceOrder();
        await cartPage.orderModal.fill({ name: 'Double Submit', card: '4111111111111111' });
      });

      let purchaseRequests = 0;
      await test.step('Click Purchase twice in quick succession', async () => {
        page.on('request', (request) => {
          if (request.url().endsWith('/deletecart') && request.method() === 'POST') {
            purchaseRequests += 1;
          }
        });
        await cartPage.orderModal.purchaseButton.evaluate((button: HTMLButtonElement) => {
          button.click();
          button.click();
        });
        await cartPage.confirmation.waitUntilVisible();
      });

      await test.step('Verify the double-click sent two deletion requests [DBZ-CART-001]', async () => {
        await expect.poll(() => purchaseRequests).toBe(2);
      });

      await cartPage.confirmation.confirm();
    },
  );

  test(
    'TC-CART-20 — the purchase receipt displays the card number unmasked',
    { tag: ['@security'] },
    async ({ homePage, productPage, cartPage }) => {
      const pan = '4111111111111111';
      await test.step('Add a product and complete the purchase', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await cartPage.openPlaceOrder();
        await cartPage.orderModal.fill({ name: 'PAN Masking', card: pan });
        await cartPage.orderModal.purchase();
        await cartPage.confirmation.waitUntilVisible();
      });

      await test.step('Verify the card number is not masked', async () => {
        const receipt = await cartPage.confirmation.getReceipt();
        expect(receipt.cardNumber).toBe(pan);
      });

      await cartPage.confirmation.confirm();
    },
  );

  test(
    'TC-CART-21 — a modified product response controls the displayed checkout totals',
    { tag: ['@security', '@regression'] },
    async ({ page, homePage, productPage, cartPage }) => {
      await test.step('Intercept product responses to report a tampered price', async () => {
        await page.route('**/view', async (route) => {
          const response = await route.fetch();
          const body = (await response.json()) as { price?: number };
          if (typeof body.price === 'number') body.price = 1;
          await route.fulfill({ response, json: body });
        });
      });

      await test.step('Add the product to the cart', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();
      });

      await test.step('Verify the tampered price drives the cart and order totals', async () => {
        await cartPage.goto();
        await expect(cartPage.totalLabel).toHaveText('1');
        await cartPage.openPlaceOrder();
        expect(await cartPage.orderModal.getDisplayedTotal()).toBe(1);
      });

      await test.step('Complete the purchase', async () => {
        await cartPage.orderModal.fill({ name: 'Price Tamper', card: '4111111111111111' });
        await cartPage.orderModal.purchase();
        await cartPage.confirmation.waitUntilVisible();
      });

      await test.step('Verify the tampered price reaches the final receipt', async () => {
        const receipt = await cartPage.confirmation.getReceipt();
        expect(receipt.amount).toBe(1);
      });

      await cartPage.confirmation.confirm();
    },
  );

  test(
    "TC-CART-22 — a logged-in account's cart persists across logout and back in",
    { tag: ['@regression'] },
    async ({ loggedInHomePage, productPage, cartPage, isolatedCartUser }) => {
      await test.step('Start with an empty cart', async () => {
        await cartPage.goto();
        await cartPage.removeAllItems();
      });

      await test.step('Log in and add a product', async () => {
        await loggedInHomePage.goto();
        await loggedInHomePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await expect(cartPage.rows).toHaveCount(1);
      });

      await test.step('Log out and back in', async () => {
        await loggedInHomePage.nav.logout();
        await loggedInHomePage.goto();
        await loggedInHomePage.login(isolatedCartUser.username, isolatedCartUser.password);
      });

      await test.step('Verify the cart item is still there', async () => {
        await cartPage.goto();
        await expect(cartPage.getRowsByProductTitle(PRODUCTS.PHONE)).toHaveCount(1);
      });

      await cartPage.removeAllItems();
    },
  );

  test(
    'TC-CART-23 — a guest cart does not automatically merge into the account cart on login',
    { tag: ['@security', '@edge', '@regression'] },
    async ({ homePage, productPage, cartPage, isolatedCartUser }) => {
      await test.step('Add an item as a guest', async () => {
        await homePage.goto();
        await homePage.filterByCategory('monitor');
        await homePage.openProduct(PRODUCTS.MONITOR);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();
        await cartPage.goto();
        await expect(cartPage.getRowsByProductTitle(PRODUCTS.MONITOR)).toHaveCount(1);
      });

      await test.step('Log in with a different account in the same browser context', async () => {
        await homePage.goto();
        await homePage.login(isolatedCartUser.username, isolatedCartUser.password);
      });

      await test.step('Verify the guest item did not merge into the account cart', async () => {
        await cartPage.goto();
        await expect(cartPage.getRowsByProductTitle(PRODUCTS.MONITOR)).toHaveCount(0);
      });
    },
  );

  test(
    'TC-CART-24 — an XSS-shaped checkout Name is rendered as inert text, not executed',
    { tag: ['@security'] },
    async ({ page, homePage, productPage, cartPage }) => {
      await test.step('Add a product and open Place Order', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await cartPage.openPlaceOrder();
      });

      let dialogFired = false;
      await test.step('Submit an XSS-shaped Name', async () => {
        page.once('dialog', async (dialog) => {
          dialogFired = true;
          await dialog.accept();
        });

        await cartPage.orderModal.fill({ name: '<script>window.__xss=1</script>', card: '4111111111111111' });
        await cartPage.orderModal.purchase();
        await cartPage.confirmation.waitUntilVisible();
      });

      await test.step('Verify the payload was not executed', async () => {
        expect(dialogFired).toBe(false);
        expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__xss)).toBeUndefined();
        const receipt = await cartPage.confirmation.getReceipt();
        expect(receipt.name).toBe('<script>window.__xss=1</script>');
      });

      await cartPage.confirmation.confirm();
    },
  );

  test('TC-CART-25 — a very long checkout Name is handled without crashing', { tag: ['@edge'] }, async ({
    page,
    homePage,
    productPage,
    cartPage,
  }) => {
    await test.step('Add a product and submit a 500-character Name', async () => {
      await homePage.goto();
      await homePage.openProduct(PRODUCTS.PHONE);
      await productPage.waitUntilLoaded();
      await productPage.addToCart();

      await cartPage.goto();
      await cartPage.openPlaceOrder();
      await cartPage.orderModal.fill({ name: 'a'.repeat(500), card: '4111111111111111' });
      await cartPage.orderModal.purchase();
    });

    await test.step('Verify the page remains responsive', async () => {
      await cartPage.confirmation.waitUntilVisible();
      await expect(page.locator('body')).toBeVisible();
    });

    await cartPage.confirmation.confirm();
  });

  test(
    'TC-CART-26 — a whitespace-only Card value bypasses required-field validation',
    { tag: ['@edge'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Add a product and submit a whitespace-only Card', async () => {
        await homePage.goto();
        await homePage.openProduct(PRODUCTS.PHONE);
        await productPage.waitUntilLoaded();
        await productPage.addToCart();

        await cartPage.goto();
        await cartPage.openPlaceOrder();
        await cartPage.orderModal.fill({ name: 'Whitespace Card', card: '   ' });
        await cartPage.orderModal.purchase();
      });

      await test.step('Verify the purchase went through with a blank Card Number', async () => {
        await cartPage.confirmation.waitUntilVisible();
        const receipt = await cartPage.confirmation.getReceipt();
        expect(receipt.cardNumber).toBe('');
      });

      await cartPage.confirmation.confirm();
    },
  );

  test(
    'TC-CART-27 — the cart total correctly sums three items across three categories',
    { tag: ['@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      await test.step('Start with an empty cart', async () => {
        await homePage.goto();
        await cartPage.goto();
        await cartPage.removeAllItems();
      });

      let expectedTotal = 0;
      await test.step('Add one product from each category', async () => {
        for (const product of [PRODUCTS.PHONE, PRODUCTS.LAPTOP, PRODUCTS.MONITOR]) {
          await homePage.goto();
          if (product === PRODUCTS.MONITOR) await homePage.filterByCategory('monitor');
          await homePage.openProduct(product);
          await productPage.waitUntilLoaded();
          expectedTotal += await productPage.getPrice();
          await productPage.addToCart();
        }
      });

      await test.step('Verify the total sums all three prices', async () => {
        await cartPage.goto();
        await expect(cartPage.rows).toHaveCount(3);
        await expect(cartPage.totalLabel).toHaveText(String(expectedTotal));
      });
    },
  );
});
