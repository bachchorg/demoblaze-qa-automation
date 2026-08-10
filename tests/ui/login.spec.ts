import { expect, test } from '../../src/fixtures/test-fixtures';
import { uniqueUsername } from '../../src/utils/random';

/**
 * TC-LOGIN-* references correspond to the rows in the Excel test case suite
 * (test-cases/demoblaze-test-cases.xlsx) — kept in sync deliberately so a
 * reviewer can trace a failing automated test back to its documented case.
 */
test.describe('Login', () => {
  test('TC-LOGIN-01 @smoke @regression — valid credentials log the user in', async ({
    homePage,
    testUser,
  }) => {
    await homePage.goto();
    await homePage.login(testUser.username, testUser.password);

    await expect(homePage.nav.welcomeLabel).toHaveText(`Welcome ${testUser.username}`);
    await expect(homePage.nav.loginLink).toBeHidden();
    await expect(homePage.nav.logoutLink).toBeVisible();
  });

  test('TC-LOGIN-02 @regression — logging out returns to the logged-out state', async ({
    homePage,
    testUser,
  }) => {
    await homePage.goto();
    await homePage.login(testUser.username, testUser.password);
    await homePage.nav.logout();

    await expect(homePage.nav.loginLink).toBeVisible();
    await expect(homePage.nav.welcomeLabel).toBeHidden();
  });

  test('TC-LOGIN-03 — session survives navigating to another page', async ({
    homePage,
    cartPage,
    testUser,
  }) => {
    await homePage.goto();
    await homePage.login(testUser.username, testUser.password);

    await homePage.nav.goToCart();
    await cartPage.waitForCartToSettle();

    await expect(cartPage.nav.welcomeLabel).toHaveText(`Welcome ${testUser.username}`);
  });

  test('TC-LOGIN-04 — a non-existent username is rejected', async ({ homePage }) => {
    await homePage.goto();
    await homePage.nav.openLoginModal();
    await homePage.loginModal.waitUntilOpen();
    await homePage.loginModal.fill(uniqueUsername('nobody'), 'irrelevant-password');

    const message = await homePage.loginModal.submitExpectingError();
    expect(message).toBe('User does not exist.');
    // Rejected login must not leave the app in a logged-in state.
    await expect(homePage.nav.loginLink).toBeVisible();
  });

  test('TC-LOGIN-05 — the correct username with the wrong password is rejected', async ({
    homePage,
    testUser,
  }) => {
    await homePage.goto();
    await homePage.nav.openLoginModal();
    await homePage.loginModal.waitUntilOpen();
    await homePage.loginModal.fill(testUser.username, `${testUser.password}-wrong`);

    const message = await homePage.loginModal.submitExpectingError();
    expect(message).toBe('Wrong password.');
  });

  test('TC-LOGIN-06 — submitting with both fields empty is rejected client-side', async ({
    homePage,
  }) => {
    await homePage.goto();
    await homePage.nav.openLoginModal();
    await homePage.loginModal.waitUntilOpen();

    const message = await homePage.loginModal.submitExpectingError();
    expect(message).toBe('Please fill out Username and Password.');
    // Validation failure keeps the modal open for correction.
    await expect(homePage.loginModal.root).toBeVisible();
  });

  test('TC-LOGIN-07 — submitting with only the password filled is rejected client-side', async ({
    homePage,
    testUser,
  }) => {
    await homePage.goto();
    await homePage.nav.openLoginModal();
    await homePage.loginModal.waitUntilOpen();
    await homePage.loginModal.fill('', testUser.password);

    const message = await homePage.loginModal.submitExpectingError();
    expect(message).toBe('Please fill out Username and Password.');
  });

  test('TC-LOGIN-08 @edge — a SQL-injection-shaped username is treated as plain text, not exploited', async ({
    page,
    homePage,
  }) => {
    await homePage.goto();
    await homePage.nav.openLoginModal();
    await homePage.loginModal.waitUntilOpen();
    await homePage.loginModal.fill("' OR '1'='1' --", "' OR '1'='1' --");

    // Verified directly against the live site (not an assumption): this
    // specific input does NOT surface the usual alert() rejection that
    // TC-LOGIN-04/05 exercise. Instead the click falls through to a real
    // form submission and the page does a full reload back to "/" — visible
    // as a `load` event, reproducible 100% of the time. Root cause looks
    // like an unhandled client-side exception on this response path (this
    // exact literal username already exists in demoblaze's shared public
    // DB from other testers' prior fuzzing, so the server returns "Wrong
    // password." rather than "User does not exist.", a different code path
    // than TC-LOGIN-04). Whatever the cause, the meaningful security
    // assertion still holds regardless of *which* failure mode occurs: no
    // alert, no crash, and — critically — no bypassed login.
    await Promise.all([page.waitForLoadState('load'), homePage.loginModal.loginButton.click()]);

    await expect(homePage.nav.loginLink).toBeVisible();
    await expect(homePage.nav.welcomeLabel).toBeHidden();
  });

  test('TC-LOGIN-09 @edge — a very long username is handled without crashing the page', async ({
    page,
    homePage,
  }) => {
    await homePage.goto();
    await homePage.nav.openLoginModal();
    await homePage.loginModal.waitUntilOpen();
    await homePage.loginModal.fill('a'.repeat(500), 'irrelevant-password');

    const message = await homePage.loginModal.submitExpectingError();
    expect(message.length).toBeGreaterThan(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-LOGIN-10 @edge — username lookup is case-sensitive', async ({ homePage, testUser }) => {
    await homePage.goto();
    await homePage.nav.openLoginModal();
    await homePage.loginModal.waitUntilOpen();
    await homePage.loginModal.fill(testUser.username.toUpperCase(), testUser.password);

    // Documents actual behaviour rather than assuming it: demoblaze does not
    // fold case, so the upper-cased username is an unknown user.
    const message = await homePage.loginModal.submitExpectingError();
    expect(message).toBe('User does not exist.');
  });
});
