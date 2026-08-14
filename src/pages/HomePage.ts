import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../config/env';
import { BasePage } from './BasePage';
import { LoginModal } from './modals/LoginModal';
import { SignUpModal } from './modals/SignUpModal';
import { NavBar } from './NavBar';

export type Category = 'phone' | 'notebook' | 'monitor';

const CATEGORY_LABEL: Record<Category, string> = {
  phone: 'Phones',
  notebook: 'Laptops',
  monitor: 'Monitors',
};

export class HomePage extends BasePage {
  readonly nav: NavBar;
  readonly loginModal: LoginModal;
  readonly signUpModal: SignUpModal;
  readonly productCards: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new NavBar(page);
    this.loginModal = new LoginModal(page);
    this.signUpModal = new SignUpModal(page);
    this.productCards = page.locator('.card-title a');
  }

  async goto(): Promise<void> {
    await this.page.goto(`${env.baseUrl}/`);
    await expect(this.productCards.first()).toBeVisible();
  }

  async filterByCategory(category: Category): Promise<void> {
    const response = this.page.waitForResponse(
      (res) => res.url().includes('/bycat') && res.request().method() === 'POST',
    );
    await this.page.locator('.list-group-item', { hasText: CATEGORY_LABEL[category] }).click();
    await response;
    await expect(this.productCards.first()).toBeVisible();
  }

  async openProduct(title: string): Promise<void> {
    await this.page.locator('.card-title a', { hasText: title }).click();
    await this.page.waitForURL('**/prod.html?idp_=*');
  }

  async login(username: string, password: string): Promise<void> {
    await this.nav.openLoginModal();
    await this.loginModal.waitUntilOpen();
    await this.loginModal.fill(username, password);
    await this.loginModal.submitExpectingSuccess();
  }

  async listVisibleProductTitles(): Promise<string[]> {
    return this.productCards.allTextContents();
  }
}
