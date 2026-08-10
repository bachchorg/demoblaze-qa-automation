import { test as base } from '@playwright/test';
import { DemoblazeApiClient } from '../api/DemoblazeApiClient';
import { env } from '../config/env';
import { loadTestUser, type TestUser } from '../data/users';
import { CartPage } from '../pages/CartPage';
import { HomePage } from '../pages/HomePage';
import { ProductPage } from '../pages/ProductPage';

interface Fixtures {
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  api: DemoblazeApiClient;
  /** The account global setup provisioned (or verified) for this run. */
  testUser: TestUser;
  /** A page that's already logged in as `testUser` when the test starts. */
  loggedInHomePage: HomePage;
}

/**
 * Extends Playwright's base `test` with the framework's own fixtures, so
 * spec files ask for what they need by name instead of constructing page
 * objects by hand — this is the seam that keeps tests modular: change how a
 * page object is built once, here, and every test picks it up.
 */
export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  api: async ({ request }, use) => {
    await use(new DemoblazeApiClient(request, env.apiBaseUrl));
  },

  testUser: async ({}, use) => {
    await use(loadTestUser());
  },

  loggedInHomePage: async ({ page, testUser }, use) => {
    const home = new HomePage(page);
    await home.goto();
    await home.login(testUser.username, testUser.password);
    await use(home);
  },
});

export { expect } from '@playwright/test';
