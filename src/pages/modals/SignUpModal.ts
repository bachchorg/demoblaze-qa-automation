import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class SignUpModal extends BasePage {
  readonly root: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signupButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('#signInModal');
    this.usernameInput = page.locator('#sign-username');
    this.passwordInput = page.locator('#sign-password');
    this.signupButton = this.root.getByRole('button', { name: 'Sign up' });
    this.closeButton = this.root.locator('.close');
  }

  async waitUntilOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async fill(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<string> {
    return this.captureDialogMessage(() => this.signupButton.click());
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }
}
