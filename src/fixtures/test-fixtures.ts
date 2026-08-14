import { test as base } from '@playwright/test';
import { DemoblazeApiClient } from '../api/DemoblazeApiClient';
import { env } from '../config/env';
import { loadTestUser, type TestUser } from '../data/users';
import { CartPage } from '../pages/CartPage';
import { HomePage } from '../pages/HomePage';
import { ProductPage } from '../pages/ProductPage';
import { randomPassword, uniqueUsername } from '../utils/random';

interface Fixtures {
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  api: DemoblazeApiClient;
  testUser: TestUser;
  isolatedCartUser: TestUser;
  loggedInHomePage: HomePage;
}

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

  isolatedCartUser: async ({ api }, use) => {
    const user = { username: uniqueUsername('qa_cart'), password: randomPassword() };
    const result = await api.signup(user.username, user.password);
    if (!result.ok) throw new Error(`Could not provision isolated cart user: ${result.errorMessage}`);
    await use(user);
  },

  loggedInHomePage: async ({ page, isolatedCartUser }, use) => {
    const home = new HomePage(page);
    await home.goto();
    await home.login(isolatedCartUser.username, isolatedCartUser.password);
    await use(home);
  },
});

export { expect } from '@playwright/test';
