import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { env } from '../config/env';
import { BasePage } from './BasePage';
import { PlaceOrderModal } from './modals/PlaceOrderModal';
import { PurchaseConfirmation } from './modals/PurchaseConfirmation';
import { NavBar } from './NavBar';

export class CartPage extends BasePage {
  readonly nav: NavBar;
  readonly orderModal: PlaceOrderModal;
  readonly confirmation: PurchaseConfirmation;
  readonly rows: Locator;
  readonly totalLabel: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new NavBar(page);
    this.orderModal = new PlaceOrderModal(page);
    this.confirmation = new PurchaseConfirmation(page);
    this.rows = page.locator('#tbodyid tr');
    this.totalLabel = page.locator('#totalp');
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order' });
  }

  private isViewCartResponse(response: Response): boolean {
    return response.url().endsWith('/viewcart') && response.request().method() === 'POST';
  }

  // Cart rows render through one nested /view request per item.
  private async waitForRowsFrom(response: Response): Promise<void> {
    if (!response.ok()) {
      throw new Error(`POST /viewcart failed with HTTP ${response.status()}.`);
    }

    const body = (await response.json()) as {
      Items?: unknown[];
      errorMessage?: string;
    };

    if (body.errorMessage) {
      throw new Error(`POST /viewcart failed: ${body.errorMessage}`);
    }
    if (!Array.isArray(body.Items)) {
      throw new Error('POST /viewcart returned an invalid payload.');
    }

    await expect(this.rows).toHaveCount(body.Items.length, {
      timeout: env.actionTimeoutMs,
    });
  }

  async goto(): Promise<void> {
    const viewCartResponse = this.page.waitForResponse(
      (response) => this.isViewCartResponse(response),
      { timeout: env.actionTimeoutMs },
    );
    await this.page.goto(`${env.baseUrl}/cart.html`);
    await this.waitForRowsFrom(await viewCartResponse);
  }

  async waitForCartToSettle(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const jquery = (window as typeof window & { jQuery?: { active: number } }).jQuery;
        return document.readyState === 'complete' && jquery !== undefined && jquery.active === 0;
      },
      undefined,
      { timeout: env.actionTimeoutMs },
    );
  }

  async getItemCount(): Promise<number> {
    return this.rows.count();
  }

  getRowsByProductTitle(title: string): Locator {
    return this.rows.filter({ hasText: title });
  }

  async getTotal(): Promise<number> {
    const text = await this.totalLabel.textContent();
    return Number((text ?? '0').trim() || '0');
  }

  private async deleteRow(row: Locator): Promise<void> {
    const viewCartResponse = this.page.waitForResponse(
      (response) => this.isViewCartResponse(response),
      { timeout: env.actionTimeoutMs },
    );
    const navigation = this.page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    await row.getByRole('link', { name: 'Delete' }).click();
    await navigation;
    await this.waitForRowsFrom(await viewCartResponse);
  }

  async deleteFirstItemByTitle(title: string): Promise<void> {
    const row = this.getRowsByProductTitle(title).first();
    await expect(row).toBeVisible();
    await this.deleteRow(row);
  }

  async removeAllItems(maxItems = 60): Promise<void> {
    for (let i = 0; i < maxItems; i++) {
      const count = await this.rows.count();
      if (count === 0) return;
      await this.deleteRow(this.rows.first());
    }
    throw new Error(`Cart still had items after removing ${maxItems} — raise the cap if this is expected.`);
  }

  async openPlaceOrder(): Promise<void> {
    await this.placeOrderButton.click();
    await this.orderModal.waitUntilOpen();
  }
}
