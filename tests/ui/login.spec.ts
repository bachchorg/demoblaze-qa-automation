import { expect, test } from '../../src/fixtures/test-fixtures';
import { env } from '../../src/config/env';
import { uniqueUsername } from '../../src/utils/random';

test.describe('Login', () => {
  test('TC-LOGIN-01 — valid credentials log the user in', { tag: ['@smoke', '@regression'] }, async ({
    homePage,
    testUser,
  }) => {
    await test.step('Log in with valid credentials', async () => {
      await homePage.goto();
      await homePage.login(testUser.username, testUser.password);
    });

    await test.step('Verify the logged-in state', async () => {
      await expect(homePage.nav.welcomeLabel).toHaveText(`Welcome ${testUser.username}`);
      await expect(homePage.nav.loginLink).toBeHidden();
      await expect(homePage.nav.logoutLink).toBeVisible();
    });
  });

  test('TC-LOGIN-02 — logging out returns to the logged-out state', { tag: ['@regression'] }, async ({
    homePage,
    testUser,
  }) => {
    await test.step('Log in', async () => {
      await homePage.goto();
      await homePage.login(testUser.username, testUser.password);
    });

    await test.step('Log out', async () => {
      await homePage.nav.logout();
    });

    await test.step('Verify the logged-out state', async () => {
      await expect(homePage.nav.loginLink).toBeVisible();
      await expect(homePage.nav.welcomeLabel).toBeHidden();
    });
  });

  test('TC-LOGIN-03 — session survives navigating to another page', { tag: ['@regression'] }, async ({
    homePage,
    cartPage,
    testUser,
  }) => {
    await test.step('Log in', async () => {
      await homePage.goto();
      await homePage.login(testUser.username, testUser.password);
    });

    await test.step('Navigate to the cart', async () => {
      await homePage.nav.goToCart();
      await cartPage.waitForCartToSettle();
    });

    await test.step('Verify the session persists', async () => {
      await expect(cartPage.nav.welcomeLabel).toHaveText(`Welcome ${testUser.username}`);
    });
  });

  test('TC-LOGIN-04 — a non-existent username is rejected', { tag: ['@regression'] }, async ({ homePage }) => {
    await test.step('Open the login modal', async () => {
      await homePage.goto();
      await homePage.nav.openLoginModal();
      await homePage.loginModal.waitUntilOpen();
    });

    let message = '';
    await test.step('Submit an unregistered username', async () => {
      await homePage.loginModal.fill(uniqueUsername('nobody'), 'irrelevant-password');
      message = await homePage.loginModal.submitExpectingError();
    });

    await test.step('Verify the rejection', async () => {
      expect(message).toBe('User does not exist.');
      await expect(homePage.nav.loginLink).toBeVisible();
    });
  });

  test('TC-LOGIN-05 — the correct username with the wrong password is rejected', { tag: ['@regression'] }, async ({
    homePage,
    testUser,
  }) => {
    await test.step('Open the login modal', async () => {
      await homePage.goto();
      await homePage.nav.openLoginModal();
      await homePage.loginModal.waitUntilOpen();
    });

    let message = '';
    await test.step('Submit the correct username with a wrong password', async () => {
      await homePage.loginModal.fill(testUser.username, `${testUser.password}-wrong`);
      message = await homePage.loginModal.submitExpectingError();
    });

    await test.step('Verify the rejection', async () => {
      expect(message).toBe('Wrong password.');
    });
  });

  test('TC-LOGIN-06 — submitting with both fields empty is rejected client-side', { tag: ['@regression'] }, async ({
    homePage,
  }) => {
    await test.step('Open the login modal', async () => {
      await homePage.goto();
      await homePage.nav.openLoginModal();
      await homePage.loginModal.waitUntilOpen();
    });

    let message = '';
    await test.step('Submit with both fields empty', async () => {
      message = await homePage.loginModal.submitExpectingError();
    });

    await test.step('Verify client-side validation', async () => {
      expect(message).toBe('Please fill out Username and Password.');
      await expect(homePage.loginModal.root).toBeVisible();
    });
  });

  test('TC-LOGIN-07 — submitting with only the password filled is rejected client-side', { tag: ['@regression'] }, async ({
    homePage,
    testUser,
  }) => {
    await test.step('Open the login modal', async () => {
      await homePage.goto();
      await homePage.nav.openLoginModal();
      await homePage.loginModal.waitUntilOpen();
    });

    let message = '';
    await test.step('Submit with only the password filled', async () => {
      await homePage.loginModal.fill('', testUser.password);
      message = await homePage.loginModal.submitExpectingError();
    });

    await test.step('Verify client-side validation', async () => {
      expect(message).toBe('Please fill out Username and Password.');
    });
  });

  test(
    'TC-LOGIN-08 — a SQL-injection-shaped username is treated as plain text, not exploited',
    { tag: ['@edge', '@security', '@regression'] },
    async ({ homePage }) => {
      await test.step('Open the login modal', async () => {
        await homePage.goto();
        await homePage.nav.openLoginModal();
        await homePage.loginModal.waitUntilOpen();
      });

      let message = '';
      await test.step('Submit an SQL-injection-shaped username', async () => {
        const injectionShapedUsername = `${uniqueUsername('sqli')}' OR '1'='1' --`;
        await homePage.loginModal.fill(injectionShapedUsername, "' OR '1'='1' --");
        message = await homePage.loginModal.submitExpectingError();
      });

      await test.step('Verify it is treated as an ordinary, unrecognized username', async () => {
        expect(message).toBe('User does not exist.');
        await expect(homePage.nav.loginLink).toBeVisible();
        await expect(homePage.nav.welcomeLabel).toBeHidden();
        await expect(homePage.loginModal.root).toBeVisible();
      });
    },
  );

  test('TC-LOGIN-09 — a very long username is handled without crashing the page', { tag: ['@edge'] }, async ({
    page,
    homePage,
  }) => {
    await test.step('Open the login modal', async () => {
      await homePage.goto();
      await homePage.nav.openLoginModal();
      await homePage.loginModal.waitUntilOpen();
    });

    let message = '';
    await test.step('Submit a 500-character username', async () => {
      await homePage.loginModal.fill('a'.repeat(500), 'irrelevant-password');
      message = await homePage.loginModal.submitExpectingError();
    });

    await test.step('Verify the page remains responsive', async () => {
      expect(message.length).toBeGreaterThan(0);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test('TC-LOGIN-10 — username lookup is case-sensitive', { tag: ['@edge', '@regression'] }, async ({
    homePage,
    testUser,
  }) => {
    await test.step('Open the login modal', async () => {
      await homePage.goto();
      await homePage.nav.openLoginModal();
      await homePage.loginModal.waitUntilOpen();
    });

    let message = '';
    await test.step('Submit the registered username in uppercase', async () => {
      await homePage.loginModal.fill(testUser.username.toUpperCase(), testUser.password);
      message = await homePage.loginModal.submitExpectingError();
    });

    await test.step('Verify it is rejected as an unknown user', async () => {
      expect(message).toBe('User does not exist.');
    });
  });

  test('TC-LOGIN-17 — login session persists across a full page reload', { tag: ['@regression'] }, async ({
    page,
    homePage,
    testUser,
  }) => {
    await test.step('Log in', async () => {
      await homePage.goto();
      await homePage.login(testUser.username, testUser.password);
      await expect(homePage.nav.welcomeLabel).toHaveText(`Welcome ${testUser.username}`);
    });

    await test.step('Reload the page', async () => {
      await page.reload();
    });

    await test.step('Verify the session persists', async () => {
      await expect(homePage.nav.welcomeLabel).toHaveText(`Welcome ${testUser.username}`);
      await expect(homePage.nav.logoutLink).toBeVisible();
    });
  });

  test(
    'TC-LOGIN-18 — a forged session-token cookie is rejected, not trusted client-side',
    { tag: ['@security', '@edge'] },
    async ({ page, homePage }) => {
      await test.step('Load the site as a guest', async () => {
        await homePage.goto();
      });

      await test.step('Inject a forged session-token cookie and reload', async () => {
        await page.context().addCookies([
          {
            name: 'tokenp_',
            value: Buffer.from(`forged-admin_${Date.now()}`).toString('base64'),
            url: `${env.baseUrl}/`,
          },
        ]);
        await page.reload();
      });

      await test.step('Verify the forged session is rejected', async () => {
        await expect(homePage.nav.welcomeLabel).toBeHidden();
        await expect(homePage.nav.logoutLink).toBeHidden();
        await expect(homePage.nav.loginLink).toBeVisible();
      });
    },
  );

  test(
    'TC-LOGIN-19 — logging out clears the session token so it cannot be silently restored on reload',
    { tag: ['@security', '@regression'] },
    async ({ page, homePage, testUser }) => {
      await test.step('Log in', async () => {
        await homePage.goto();
        await homePage.login(testUser.username, testUser.password);
        await expect(homePage.nav.welcomeLabel).toBeVisible();
      });

      await test.step('Log out', async () => {
        await homePage.nav.logout();
        await expect(homePage.nav.loginLink).toBeVisible();
      });

      await test.step('Verify the session-token cookie is cleared', async () => {
        const cookiesAfterLogout = await page.context().cookies();
        expect(cookiesAfterLogout.find((c) => c.name === 'tokenp_')).toBeUndefined();
      });

      await test.step('Reload and verify the session is not restored', async () => {
        await page.reload();
        await expect(homePage.nav.welcomeLabel).toBeHidden();
        await expect(homePage.nav.loginLink).toBeVisible();
      });
    },
  );

  test('TC-LOGIN-20 — a very long password is handled without crashing the page', { tag: ['@edge'] }, async ({
    page,
    homePage,
  }) => {
    await test.step('Open the login modal', async () => {
      await homePage.goto();
      await homePage.nav.openLoginModal();
      await homePage.loginModal.waitUntilOpen();
    });

    let message = '';
    await test.step('Submit a 500-character password', async () => {
      await homePage.loginModal.fill(uniqueUsername('longpw'), 'a'.repeat(500));
      message = await homePage.loginModal.submitExpectingError();
    });

    await test.step('Verify the page remains responsive', async () => {
      expect(message.length).toBeGreaterThan(0);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test(
    'TC-LOGIN-22 — login responses disclose whether a username exists',
    { tag: ['@security', '@regression'] },
    async ({ homePage, testUser }) => {
      await test.step('Open the login modal', async () => {
        await homePage.goto();
        await homePage.nav.openLoginModal();
        await homePage.loginModal.waitUntilOpen();
      });

      let unknownUserMessage = '';
      await test.step('Submit an unregistered username', async () => {
        await homePage.loginModal.fill(uniqueUsername('enumeration'), 'irrelevant-password');
        unknownUserMessage = await homePage.loginModal.submitExpectingError();
      });

      let knownUserMessage = '';
      await test.step('Submit a registered username with the wrong password', async () => {
        await homePage.loginModal.fill(testUser.username, `${testUser.password}-wrong`);
        knownUserMessage = await homePage.loginModal.submitExpectingError();
      });

      await test.step('Verify the two responses are distinguishable', async () => {
        expect(unknownUserMessage).toBe('User does not exist.');
        expect(knownUserMessage).toBe('Wrong password.');
        expect(unknownUserMessage).not.toBe(knownUserMessage);
      });
    },
  );

  test(
    'TC-LOGIN-23 — a failing auth API gives no feedback but leaves the modal usable',
    { tag: ['@edge', '@regression'] },
    async ({ page, homePage }) => {
      await test.step('Intercept the login request to fail', async () => {
        await page.route('**/login', (route) =>
          route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' }),
        );
        await homePage.goto();
        await homePage.nav.openLoginModal();
        await homePage.loginModal.waitUntilOpen();
        await homePage.loginModal.fill(uniqueUsername('svcfail'), 'irrelevant-password');
      });

      const modalTextBefore = await homePage.loginModal.root.innerText();
      let dialogMessage: string | undefined;
      await test.step('Submit and wait out the failed request', async () => {
        page.once('dialog', async (dialog) => {
          dialogMessage = dialog.message();
          await dialog.dismiss();
        });
        const loginResponse = page.waitForResponse(
          (response) => response.url().endsWith('/login') && response.request().method() === 'POST',
        );
        await homePage.loginModal.loginButton.click();
        expect((await loginResponse).status()).toBe(500);
        await page.waitForFunction(() => {
          const jquery = (window as typeof window & { jQuery?: { active: number } }).jQuery;
          return jquery?.active === 0;
        });
      });

      await test.step('Verify the failure is silent but the modal stays usable', async () => {
        expect(dialogMessage).toBeUndefined();
        expect(await homePage.loginModal.root.innerText()).toBe(modalTextBefore);
        await expect(homePage.loginModal.root).toBeVisible();
        await expect(homePage.nav.welcomeLabel).toBeHidden();
        await expect(homePage.nav.loginLink).toBeVisible();
      });

      await homePage.loginModal.close();
      await expect(page.locator('body')).toBeVisible();
    },
  );
});
