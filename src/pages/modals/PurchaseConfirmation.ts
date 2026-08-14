import { expect, type Locator, type Page } from '@playwright/test';

export interface PurchaseReceipt {
  orderId: string;
  amount: number;
  cardNumber: string;
  name: string;
  date: string;
}

export class PurchaseConfirmation {
  readonly root: Locator;
  readonly heading: Locator;
  readonly detailsText: Locator;
  readonly okButton: Locator;

  constructor(page: Page) {
    this.root = page.locator('.sweet-alert');
    this.heading = this.root.locator('h2');
    this.detailsText = this.root.locator('p.lead');
    this.okButton = this.root.locator('button.confirm');
  }

  async waitUntilVisible(): Promise<void> {
    await expect(this.root).toBeVisible({ timeout: 15_000 });
    await expect(this.heading).toHaveText(/thank you for your purchase/i);
  }

  async getReceipt(): Promise<PurchaseReceipt> {
    const text = (await this.detailsText.innerText()).replace(/\s+/g, ' ');
    const get = (label: string): string => {
      // Allow empty values without consuming the next receipt field.
      const match = text.match(new RegExp(`${label}:\\s*([^\\n]*?)\\s*(?:(?:Id|Amount|Card Number|Name|Date):|$)`));
      if (!match) throw new Error(`Could not find "${label}" in confirmation text: "${text}"`);
      return match[1].trim();
    };
    return {
      orderId: get('Id'),
      amount: Number(get('Amount').replace(/[^\d.]/g, '')),
      cardNumber: get('Card Number'),
      name: get('Name'),
      date: get('Date'),
    };
  }

  async confirm(): Promise<void> {
    await this.okButton.click();
    await expect(this.root).toBeHidden();
  }
}
