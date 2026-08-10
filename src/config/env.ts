import 'dotenv/config';

/**
 * Single source of truth for every configurable parameter the framework
 * reads. Nothing in tests/pages/api should read `process.env` directly —
 * route it through here so there is one place that knows the defaults and
 * one place CI overrides via env vars (see .github/workflows/playwright.yml).
 */
function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

export const env = {
  /** Base URL of the app under test. */
  baseUrl: process.env.BASE_URL ?? 'https://www.demoblaze.com',
  /** Base URL of the JSON API the app talks to (used by tests/api). */
  apiBaseUrl: process.env.API_BASE_URL ?? 'https://api.demoblaze.com',

  headless: bool(process.env.HEADLESS, true),
  /** Per-action timeout, ms. */
  actionTimeoutMs: Number(process.env.ACTION_TIMEOUT_MS ?? 15_000),
  /** Whole-test timeout, ms. */
  testTimeoutMs: Number(process.env.TEST_TIMEOUT_MS ?? 60_000),

  workers: process.env.WORKERS ? Number(process.env.WORKERS) : undefined,
  retries: process.env.RETRIES ? Number(process.env.RETRIES) : undefined,

  isCI: bool(process.env.CI, false),

  /**
   * A fixed, reusable demoblaze account for tests that need to log in as an
   * *already-registered* user (e.g. "valid login" happy-path scenarios).
   * demoblaze has no seeded accounts, so if these aren't set the global
   * setup project (see playwright.config.ts) registers one via the API and
   * writes it to `.auth/test-user.json` for the rest of the run to reuse.
   */
  fixedUsername: process.env.DEMOBLAZE_USERNAME,
  fixedPassword: process.env.DEMOBLAZE_PASSWORD,
};
