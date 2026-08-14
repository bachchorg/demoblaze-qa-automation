import type { Locator, Page } from '@playwright/test';

export class NavBar {
  readonly loginLink: Locator;
  readonly signupLink: Locator;
  readonly cartLink: Locator;
  readonly logoutLink: Locator;
  readonly welcomeLabel: Locator;

  constructor(private readonly page: Page) {
    this.loginLink = page.locator('#login2');
    this.signupLink = page.locator('#signin2');
    this.cartLink = page.locator('#cartur');
    this.logoutLink = page.locator('#logout2');
    this.welcomeLabel = page.locator('#nameofuser');
  }

  async openLoginModal(): Promise<void> {
    await this.loginLink.click();
  }

  async openSignupModal(): Promise<void> {
    await this.signupLink.click();
  }

  async goToCart(): Promise<void> {
    await this.cartLink.click();
    await this.page.waitForURL('**/cart.html');
  }

  async logout(): Promise<void> {
    await this.logoutLink.click();
  }

  async isLoggedIn(): Promise<boolean> {
    return this.welcomeLabel.isVisible();
  }

  async loggedInUsername(): Promise<string> {
    const text = (await this.welcomeLabel.textContent()) ?? '';
    return text.replace(/^Welcome\s+/, '').trim();
  }
}
