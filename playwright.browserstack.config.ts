import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { BROWSERSTACK_CAPABILITIES, buildBrowserStackEndpoint } from './src/config/browserstack';

// Same tests/fixtures/reporters as playwright.config.ts, but browsers run on
// BrowserStack's cloud grid via connectOptions.wsEndpoint instead of a local
// binary. Needs BROWSERSTACK_USERNAME/BROWSERSTACK_ACCESS_KEY — see README
// "BrowserStack". `npm run test:browserstack`.
export default defineConfig({
  ...baseConfig,
  testDir: './tests/ui',
  // Most BrowserStack trial/starter plans cap concurrent sessions at 5.
  workers: process.env.BROWSERSTACK_MAX_WORKERS ? Number(process.env.BROWSERSTACK_MAX_WORKERS) : 2,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-browserstack' }],
    ['junit', { outputFile: 'test-results/junit-browserstack.xml' }],
  ],
  projects: BROWSERSTACK_CAPABILITIES.map((cap) => ({
    name: `bstack-${cap.sessionName}`,
    use: {
      ...baseConfig.use,
      connectOptions: { wsEndpoint: buildBrowserStackEndpoint(cap) },
    },
  })),
});
