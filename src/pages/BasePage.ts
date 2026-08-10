import type { Page } from '@playwright/test';
import { env } from '../config/env';

/**
 * demoblaze relies heavily on native alert()/confirm() dialogs — signup
 * result, add-to-cart confirmation, login errors, empty-form validation all
 * surface as a browser `alert()`. Playwright auto-dismisses any dialog left
 * unhandled after a beat, so every action that can raise one must register
 * a listener *before* triggering it. This base class centralizes that
 * pattern so page objects don't each reimplement it slightly differently.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async captureDialogMessage(trigger: () => Promise<void>): Promise<string> {
    let message = '';
    // MUST run concurrently, not `await trigger()` then `await` the dialog:
    // demoblaze's *client-side* validation (empty username/password, empty
    // name/card) calls `alert()` synchronously inside the click handler,
    // which blocks the page's JS thread until the dialog is dismissed. If
    // `trigger()` (the click) is awaited first, its own promise can't
    // resolve until that same dialog is dismissed — a deadlock, since
    // nothing dismisses it until `trigger()` returns. Racing them via
    // `Promise.all` lets the dialog handler dismiss the alert *while* the
    // click is still "in flight", which is what actually unblocks both.
    // (Server-validated errors — wrong password, unknown user — fire the
    // alert asynchronously after an XHR and don't hit this at all, but the
    // concurrent form is correct for both cases.)
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
