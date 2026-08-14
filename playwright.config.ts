import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  timeout: env.testTimeoutMs,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.retries ?? (env.isCI ? 2 : 0),
  workers: env.workers,

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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

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

    {
      name: 'mobile-chrome',
      testDir: './tests/ui',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
