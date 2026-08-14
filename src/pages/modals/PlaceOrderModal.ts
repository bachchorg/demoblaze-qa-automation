import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../../config/env';
import { BasePage } from '../BasePage';

export interface OrderDetails {
  name: string;
  country: string;
  city: string;
  card: string;
  month: string;
  year: string;
}

export class PlaceOrderModal extends BasePage {
  readonly root: Locator;
  readonly totalLabel: Locator;
  readonly nameInput: Locator;
  readonly countryInput: Locator;
  readonly cityInput: Locator;
  readonly cardInput: Locator;
  readonly monthInput: Locator;
  readonly yearInput: Locator;
  readonly purchaseButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('#orderModal');
    this.totalLabel = this.root.locator('#totalm');
    this.nameInput = page.locator('#name');
    this.countryInput = page.locator('#country');
    this.cityInput = page.locator('#city');
    this.cardInput = page.locator('#card');
    this.monthInput = page.locator('#month');
    this.yearInput = page.locator('#year');
    this.purchaseButton = this.root.getByRole('button', { name: 'Purchase' });
  }

  async waitUntilOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async getDisplayedTotal(): Promise<number> {
    const text = await this.totalLabel.textContent();
    return Number((text ?? '').replace(/[^\d.]/g, ''));
  }

  async fill(details: Partial<OrderDetails>): Promise<void> {
    if (details.name !== undefined) await this.nameInput.fill(details.name);
    if (details.country !== undefined) await this.countryInput.fill(details.country);
    if (details.city !== undefined) await this.cityInput.fill(details.city);
    if (details.card !== undefined) await this.cardInput.fill(details.card);
    if (details.month !== undefined) await this.monthInput.fill(details.month);
    if (details.year !== undefined) await this.yearInput.fill(details.year);
  }

  async purchase(): Promise<void> {
    const cartDeletion = this.page.waitForResponse(
      (response) =>
        response.url().endsWith('/deletecart') && response.request().method() === 'POST',
      { timeout: env.actionTimeoutMs },
    );
    await this.purchaseButton.click();
    const response = await cartDeletion;
    if (!response.ok()) {
      throw new Error(`POST /deletecart failed with HTTP ${response.status()}.`);
    }
  }

  async purchaseExpectingValidationError(): Promise<string> {
    return this.captureDialogMessage(() => this.purchaseButton.click());
  }
}
