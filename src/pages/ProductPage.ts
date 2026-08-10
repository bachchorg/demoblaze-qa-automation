import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavBar } from './NavBar';

export class ProductPage extends BasePage {
  readonly nav: NavBar;
  readonly title: Locator;
  readonly price: Locator;
  readonly addToCartLink: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new NavBar(page);
    this.title = page.locator('.name');
    this.price = page.locator('.price-container');
    this.addToCartLink = page.getByRole('link', { name: 'Add to cart' });
  }

  async waitUntilLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
  }

  async getTitle(): Promise<string> {
    return (await this.title.textContent())?.trim() ?? '';
  }

  /** Price is rendered as e.g. "$360" — parsed to a plain number for assertions. */
  async getPrice(): Promise<number> {
    const text = (await this.price.textContent()) ?? '';
    return Number(text.replace(/[^\d.]/g, ''));
  }

  /** Returns the confirmation alert text ("Product added"). */
  async addToCart(): Promise<string> {
    return this.captureDialogMessage(() => this.addToCartLink.click());
  }
}
