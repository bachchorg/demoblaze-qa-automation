// Builds capability sets for BrowserStack's Automate: Playwright product,
// which connects over plain browserType.connect() — no separate SDK.
// Capability keys/values follow BrowserStack's own scheme; re-verify against
// their Playwright onboarding page if this stops working.
export interface BrowserStackCapability {
  /** Session label shown in the BrowserStack Automate dashboard. */
  sessionName: string;
  /** 'chrome' | 'playwright-firefox' | 'playwright-webkit' | 'edge' — the Playwright-patched engine ids BrowserStack expects, not plain browser names. */
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion: string;
}

function requireCredential(name: 'BROWSERSTACK_USERNAME' | 'BROWSERSTACK_ACCESS_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. BrowserStack projects need BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY ` +
        '(from https://www.browserstack.com/accounts/settings) exported as env vars — set them locally, ' +
        'or as Jenkins credentials bound in the Jenkinsfile\'s BrowserStack stage — before running ' +
        '`npm run test:browserstack`.',
    );
  }
  return value;
}

/** Groups every BrowserStack session from one CI run under one dashboard build. */
export const BROWSERSTACK_BUILD_NAME =
  process.env.BROWSERSTACK_BUILD_NAME ??
  `demoblaze-qa-automation #${process.env.BUILD_NUMBER ?? process.env.GITHUB_RUN_NUMBER ?? 'local'}`;

/** Builds the `wss://cdp.browserstack.com/playwright?caps=...` endpoint Playwright's `.connect()` needs. */
export function buildBrowserStackEndpoint(cap: BrowserStackCapability): string {
  const capabilities = {
    browser: cap.browser,
    browser_version: cap.browserVersion ?? 'latest',
    os: cap.os,
    os_version: cap.osVersion,
    name: cap.sessionName,
    build: BROWSERSTACK_BUILD_NAME,
    project: 'demoblaze-qa-automation',
    // '1.latest' = BrowserStack's newest supported driver. Keep
    // @playwright/test pinned within their supported range (see README
    // "BrowserStack") — a newer client connects fine but fails opaquely on
    // the first real call instead of erroring at connect time.
    'client.playwrightVersion': '1.latest',
    'browserstack.username': requireCredential('BROWSERSTACK_USERNAME'),
    'browserstack.accessKey': requireCredential('BROWSERSTACK_ACCESS_KEY'),
  };
  return `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(capabilities))}`;
}

// Real Windows/macOS engine+OS combinations local playwright.config.ts can't cover.
export const BROWSERSTACK_CAPABILITIES: BrowserStackCapability[] = [
  { sessionName: 'chrome-windows11', browser: 'chrome', os: 'Windows', osVersion: '11' },
  { sessionName: 'firefox-windows11', browser: 'playwright-firefox', os: 'Windows', osVersion: '11' },
  { sessionName: 'edge-windows11', browser: 'edge', os: 'Windows', osVersion: '11' },
  { sessionName: 'webkit-sonoma', browser: 'playwright-webkit', os: 'OS X', osVersion: 'Sonoma' },
];
