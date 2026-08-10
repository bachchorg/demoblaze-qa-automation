import { expect, type Locator, type Page } from '@playwright/test';
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

  /**
   * The cart list — and the total derived from it — is populated by an
   * async POST /viewcart fetch after the page's `load` event, with no
   * loading spinner or other DOM signal.
   *
   * `waitForLoadState('networkidle')` looks like the obvious fit here but
   * actively hangs — the page embeds a background HLS video widget that
   * keeps streaming .ts segments indefinitely, so the network never goes
   * idle (confirmed by capturing real traffic against the live site: after
   * /viewcart resolves, requests to hls.demoblaze.com continue every few
   * seconds). Since this method controls exactly when navigation starts, it
   * can race a `waitForResponse` against the `goto` safely (no missed-event
   * risk) — see `waitForCartToSettle` for the fallback used when a caller
   * navigates some other way (e.g. clicking the nav-bar Cart link).
   */
  async goto(): Promise<void> {
    const viewcartResponse = this.page.waitForResponse(
      (res) => res.url().includes('/viewcart') && res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await this.page.goto(`${env.baseUrl}/cart.html`);
    await viewcartResponse;
    // The row list / total render off the back of that response — give the
    // DOM a beat to actually paint before callers read rows/getTotal().
    await this.page.waitForTimeout(200);
  }

  /**
   * Fallback for callers who reached the cart page via something other than
   * `goto()` above (e.g. clicking the nav-bar Cart link), where it's too
   * late to set up a `waitForResponse` without risking having missed the
   * response already. Polls row-count stability instead — safe regardless
   * of timing, at the cost of a little wall-clock time. Waits out an
   * initial grace period first so "0 rows, twice in a row" isn't mistaken
   * for a genuinely empty cart when the fetch just hasn't resolved yet.
   */
  async waitForCartToSettle(): Promise<void> {
    await this.page.waitForTimeout(600);
    let previousCount = -1;
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const currentCount = await this.rows.count();
      if (currentCount === previousCount) return;
      previousCount = currentCount;
      await this.page.waitForTimeout(400);
    }
    throw new Error('Cart row count never stabilized within 10s.');
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

  /**
   * IMPORTANT — environment characteristic, not a framework bug: demoblaze's
   * cart is shared/global across everyone hitting the public demo site, not
   * scoped to the logged-in session. A freshly-loaded cart routinely already
   * contains dozens of items from unrelated concurrent users. Tests must
   * therefore assert "my product is present" rather than "the cart has
   * exactly N items" — see README "Known environment characteristics".
   *
   * This helper exists for the one flow where a clean, deterministic total
   * genuinely matters (the place-order demo): it removes every existing row
   * so the subsequently-added item is the only one, capped and bounded so a
   * pathologically large shared cart can't hang a test run.
   */
  async removeAllItems(maxItems = 60): Promise<void> {
    for (let i = 0; i < maxItems; i++) {
      const count = await this.rows.count();
      if (count === 0) return;
      await this.rows.first().locator('text=Delete').click();
      // deleteItem() re-fetches the row list asynchronously; wait for the
      // count to actually drop before deleting the next one.
      await expect(this.rows).toHaveCount(count - 1, { timeout: 10_000 });
    }
    throw new Error(`Cart still had items after removing ${maxItems} — raise the cap if this is expected.`);
  }

  async openPlaceOrder(): Promise<void> {
    await this.placeOrderButton.click();
    await this.orderModal.waitUntilOpen();
  }
}
