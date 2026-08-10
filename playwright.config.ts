import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Central, configurable entry point — every knob here is either read from
 * `src/config/env.ts` (itself sourced from environment variables / `.env`)
 * or has a sane default, so CI and local runs can diverge (headless,
 * retries, worker count, target URL) without touching this file. See
 * README "Configuration" for the full list of env vars.
 */
export default defineConfig({
  testDir: './tests',
  timeout: env.testTimeoutMs,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.retries ?? (env.isCI ? 2 : 0),
  workers: env.workers,

  // Runs once before any test — provisions/validates the demoblaze account
  // UI and API tests log in as (see src/config/global-setup.ts).
  globalSetup: require.resolve('./src/config/global-setup'),

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: env.baseUrl,
    headless: env.headless,
    actionTimeout: env.actionTimeoutMs,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Full suite (UI + API + performance) on Chromium — the primary,
    // fastest-feedback target.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Cross-browser coverage for UI flows specifically — API/performance
    // tests don't render through a browser engine in any way that differs
    // by browser, so re-running them on every engine would just be slower
    // CI for no extra signal.
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'] },
    },

    // Cross-platform (viewport/touch) coverage.
    {
      name: 'mobile-chrome',
      testDir: './tests/ui',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
