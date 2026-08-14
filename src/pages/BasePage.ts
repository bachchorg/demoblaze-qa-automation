import type { Page } from '@playwright/test';
import { env } from '../config/env';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async captureDialogMessage(trigger: () => Promise<void>): Promise<string> {
    let message = '';
    // Listen before clicking because client-side validation alerts fire synchronously.
    await Promise.all([
      this.page.waitForEvent('dialog', { timeout: env.actionTimeoutMs }).then(async (dialog) => {
        message = dialog.message();
        await dialog.accept();
      }),
      trigger(),
    ]);
    return message;
  }
}
