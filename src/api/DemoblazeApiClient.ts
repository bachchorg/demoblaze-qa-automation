import type { APIRequestContext, APIResponse } from '@playwright/test';

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

export class DemoblazeApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  private encodePassword(password: string): string {
    return Buffer.from(password, 'utf8').toString('base64');
  }

  private async requireSuccessfulResponse(response: APIResponse, operation: string): Promise<string> {
    const text = await response.text();
    if (!response.ok()) {
      throw new Error(`${operation} failed: ${response.status()} ${text}`);
    }
    return text;
  }

  async getEntries(): Promise<ProductEntry[]> {
    const res = await this.request.get(`${this.baseUrl}/entries`);
    if (!res.ok()) {
      throw new Error(`GET /entries failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as Partial<EntriesResponse>;
    if (!Array.isArray(body.Items)) {
      throw new Error('GET /entries returned an invalid payload: expected an Items array.');
    }
    return body.Items;
  }

  async findProductByTitle(title: string): Promise<ProductEntry | undefined> {
    const items = await this.getEntries();
    return items.find((item) => item.title === title);
  }

  async getByCategory(cat: string): Promise<ProductEntry[]> {
    const res = await this.request.post(`${this.baseUrl}/bycat`, { data: { cat } });
    if (!res.ok()) {
      throw new Error(`POST /bycat failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as Partial<EntriesResponse>;
    if (!Array.isArray(body.Items)) {
      throw new Error('POST /bycat returned an invalid payload: expected an Items array.');
    }
    return body.Items;
  }

  async signup(username: string, password: string): Promise<SignupResult> {
    const res = await this.request.post(`${this.baseUrl}/signup`, {
      data: { username, password: this.encodePassword(password) },
    });
    const text = await this.requireSuccessfulResponse(res, 'POST /signup');
    // This API returns HTTP 200 for both domain success and failure.
    if (!text || text === '""' || text.trim() === '') return { ok: true };
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed === '') return { ok: true };
      if (typeof parsed === 'object' && parsed !== null && 'errorMessage' in parsed) {
        return { ok: false, errorMessage: String(parsed.errorMessage) };
      }
    } catch (error) {
      throw new Error('POST /signup returned invalid JSON.', { cause: error });
    }
    throw new Error(`POST /signup returned an unexpected payload: ${text}`);
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const res = await this.request.post(`${this.baseUrl}/login`, {
      data: { username, password: this.encodePassword(password) },
    });
    const text = await this.requireSuccessfulResponse(res, 'POST /login');
    try {
      const parsed = JSON.parse(text) as unknown;
      if (typeof parsed === 'object' && parsed !== null && 'errorMessage' in parsed) {
        return { ok: false, errorMessage: String(parsed.errorMessage) };
      }
      if (typeof parsed === 'string' && parsed.startsWith('Auth_token: ')) {
        return { ok: true, token: parsed.slice('Auth_token: '.length) };
      }
    } catch (error) {
      throw new Error('POST /login returned invalid JSON.', { cause: error });
    }
    throw new Error(`POST /login returned an unexpected payload: ${text}`);
  }
}
