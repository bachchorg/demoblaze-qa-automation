import type { APIRequestContext } from '@playwright/test';

export interface ProductEntry {
  id: number;
  cat: string;
  title: string;
  price: number;
  desc: string;
  img: string;
}

export interface EntriesResponse {
  Items: ProductEntry[];
}

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; errorMessage: string };

export type SignupResult = { ok: true } | { ok: false; errorMessage: string };

/**
 * Thin wrapper over the JSON API demoblaze.com's own frontend calls
 * (api.demoblaze.com) — reverse-engineered by observing real network traffic
 * from the site (see README "How the API layer was derived"), not from
 * public docs (none exist). Used by tests/api directly, and by the global
 * setup to provision a test account without going through the UI.
 *
 * Takes a Playwright APIRequestContext rather than wrapping fetch/axios so
 * API calls get the same tracing, retry, and reporting integration as UI
 * steps — this is the idiomatic way to do API testing in Playwright.
 */
export class DemoblazeApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  private encodePassword(password: string): string {
    return Buffer.from(password, 'utf8').toString('base64');
  }

  async getEntries(): Promise<ProductEntry[]> {
    const res = await this.request.get(`${this.baseUrl}/entries`);
    if (!res.ok()) {
      throw new Error(`GET /entries failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as EntriesResponse;
    return body.Items;
  }

  async findProductByTitle(title: string): Promise<ProductEntry | undefined> {
    const items = await this.getEntries();
    return items.find((item) => item.title === title);
  }

  /** /entries only returns "phone" and "notebook" — monitors (and other
   * categories) are fetched per-category via this endpoint instead. */
  async getByCategory(cat: string): Promise<ProductEntry[]> {
    const res = await this.request.post(`${this.baseUrl}/bycat`, { data: { cat } });
    if (!res.ok()) {
      throw new Error(`POST /bycat failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as EntriesResponse;
    return body.Items;
  }

  async signup(username: string, password: string): Promise<SignupResult> {
    const res = await this.request.post(`${this.baseUrl}/signup`, {
      data: { username, password: this.encodePassword(password) },
    });
    const text = await res.text();
    // demoblaze returns HTTP 200 with an empty body on success, and HTTP 200
    // with { errorMessage } on failure — status code alone can't tell you
    // which happened, you have to look at the body.
    if (!text || text === '""' || text.trim() === '') return { ok: true };
    try {
      const parsed = JSON.parse(text) as { errorMessage?: string };
      if (parsed.errorMessage) return { ok: false, errorMessage: parsed.errorMessage };
    } catch {
      /* non-JSON, fall through to ok */
    }
    return { ok: true };
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const res = await this.request.post(`${this.baseUrl}/login`, {
      data: { username, password: this.encodePassword(password) },
    });
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { errorMessage?: string };
      if (parsed.errorMessage) return { ok: false, errorMessage: parsed.errorMessage };
    } catch {
      /* not JSON -> it's the raw "Auth_token: ..." success string */
    }
    // Success body is a JSON string like "Auth_token: xxxxx" (quoted).
    const token = text.replace(/^"|"$/g, '');
    return { ok: true, token };
  }
}
