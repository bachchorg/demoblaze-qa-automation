import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class LoginModal extends BasePage {
  readonly root: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('#logInModal');
    this.usernameInput = page.locator('#loginusername');
    this.passwordInput = page.locator('#loginpassword');
    this.loginButton = this.root.getByRole('button', { name: 'Log in' });
    this.closeButton = this.root.locator('.close');
  }

  async waitUntilOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async fill(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  /** Happy path: submits and waits for the modal to close. */
  async submitExpectingSuccess(): Promise<void> {
    await this.loginButton.click();
    await expect(this.root).toBeHidden({ timeout: 10_000 });
  }

  /** Submits and captures the resulting validation alert (bad creds, empty fields, ...). */
  async submitExpectingError(): Promise<string> {
    return this.captureDialogMessage(() => this.loginButton.click());
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }
}
