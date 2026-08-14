# DemoBlaze QA Automation

Playwright and TypeScript test framework for the Login and Cart/Checkout features at [demoblaze.com](https://www.demoblaze.com/).

The repository includes UI, API, regression, edge-case, security-focused, and page-load smoke coverage. The main user journey is automated end to end; broader scenarios and manual candidates are captured in the test case workbook.

## Deliverables

- [Test case workbook](test-cases/demoblaze-test-cases.xlsx): 50 Login and Cart/Checkout cases covering functional, negative, edge, and security scenarios. The workbook includes coverage and traceability sheets and can be uploaded to Google Sheets.
- Automation framework: Playwright tests under `tests/` with reusable code under `src/`.
- CI pipeline: [GitHub Actions workflow](.github/workflows/playwright.yml) for quality checks and automated execution.

The workbook is generated from `scripts/test-case-data.ts`. After changing the test case source, run `npm run gen:test-cases` and commit the updated `.xlsx` file.

## Quick start

Prerequisites: Node.js 22 and npm.

```bash
npm ci
npx playwright install
npm run test:e2e -- --project=chromium
```

The E2E command runs the requested demo flow: log in with valid credentials, add a product, place the order, and validate the cart total and confirmation details.

Credentials are optional. By default, global setup creates a unique account for the run. To use an existing account, copy `.env.example` to `.env` and set both `DEMOBLAZE_USERNAME` and `DEMOBLAZE_PASSWORD`.

## Test commands

```bash
npm test                  # all configured projects
npm run test:ui           # Login and Cart/Checkout UI tests
npm run test:api          # authentication and catalog API tests
npm run test:performance  # browser navigation timing checks
npm run test:regression   # @regression
npm run test:smoke        # @smoke
npm run test:e2e          # @e2e purchase journey
npm run test:edge         # @edge
npm run test:security     # @security
```

Browser and local debugging commands:

```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
npm run test:headed
npm run test:debug
npm run report
```

Firefox, WebKit, and the mobile Chrome project run UI tests only. API and performance checks run once on Chromium because repeating them for each rendering engine adds no coverage.

CI runs on Ubuntu; the npm commands and Playwright projects also run on supported macOS and Windows development machines.

```bash
npm run test:browserstack # UI suite on BrowserStack's cloud grid (see "BrowserStack" below)
```

Before opening a pull request:

```bash
npm run typecheck
npm run lint
```

## Project structure

```text
src/
  api/          typed DemoBlaze API client
  config/       environment parsing, global setup, BrowserStack capability config
  data/         products and run-scoped user data
  fixtures/     Playwright fixtures
  pages/        page objects and modal components
  utils/        test data helpers
tests/
  api/          authentication and catalog checks
  performance/  navigation timing smoke checks
  ui/           Login and Cart/Checkout scenarios
scripts/        Excel test case data and generator
test-cases/     submitted Excel workbook
playwright.config.ts              local run configuration
playwright.browserstack.config.ts BrowserStack cloud-grid configuration
Jenkinsfile                       local/self-hosted Jenkins pipeline
.github/workflows/playwright.yml  GitHub Actions pipeline
```

## Design choices

- Page objects keep selectors and UI actions out of the specs. Modal components are separate because Login and Checkout change independently from their host pages.
- Typed fixtures provide page objects, the API client, and test-user data without repeated setup in each test.
- The API client uses Playwright's `APIRequestContext`, so UI and API checks share configuration and reporting.
- Global setup validates supplied credentials or provisions a unique account through the API. The account details are written to the gitignored `.auth/test-user.json` file for worker processes.
- Login and Cart test IDs match the workbook rows, and tags provide focused smoke, regression, E2E, edge, and security runs.
- Playwright projects provide desktop Chromium, Firefox, WebKit, and a Pixel 7 emulation profile.

## Configuration

Values can be supplied through the environment or a local `.env` file. Invalid booleans, integers, URLs, and incomplete credential pairs fail early.

| Variable | Default | Use |
|---|---:|---|
| `BASE_URL` | `https://www.demoblaze.com` | Web application URL |
| `API_BASE_URL` | `https://api.demoblaze.com` | API URL |
| `HEADLESS` | `true` | Run browsers without a visible window |
| `ACTION_TIMEOUT_MS` | `15000` | Playwright action timeout |
| `TEST_TIMEOUT_MS` | `60000` | Timeout for one test |
| `WORKERS` | Playwright default locally, `2` in CI | Number of parallel workers |
| `RETRIES` | `0` locally, `2` in CI | Retry count |
| `PERF_MAX_LOAD_MS` | `8000` | Maximum navigation load-event duration |
| `PERF_MAX_TTFB_MS` | `3000` | Maximum home-page time to first byte |
| `DEMOBLAZE_USERNAME` | unset | Existing test username |
| `DEMOBLAZE_PASSWORD` | unset | Existing test password |

`DEMOBLAZE_USERNAME` and `DEMOBLAZE_PASSWORD` must be set together. CI sets `CI=true`, which also enables `forbidOnly` and the CI retry default.

## Test isolation

Playwright creates a new browser context for each test, which isolates cookies. Guest cart tests first load the site so DemoBlaze creates a unique `user` cookie. A new account is generated for each Playwright invocation unless fixed credentials are configured; browser storage state is not shared between tests.

Authenticated cart scenarios create a dedicated account through the `isolatedCartUser` fixture. This keeps cart mutations independent when tests or browser projects run in parallel.

## BrowserStack

`playwright.browserstack.config.ts` runs the same `tests/ui` specs against BrowserStack's cloud grid instead of a locally-launched browser, using Playwright's native `connectOptions.wsEndpoint` (no separate SDK). Real OS/browser combinations a local run can't cover — Chrome/Edge/Firefox on Windows 11, WebKit on macOS Sonoma — are defined in `src/config/browserstack.ts` (`BROWSERSTACK_CAPABILITIES`). Verified against a real account: all four combinations pass the `@e2e` demo journey.

`@playwright/test` is pinned to `1.61.1` rather than a caret range — BrowserStack Automate's supported client range topped out at `1.61` as of writing, and a newer client connects but fails opaquely on the first real call instead of erroring at connect time (see the comment on `client.playwrightVersion` in `src/config/browserstack.ts`). Check BrowserStack's [supported-versions table](https://www.browserstack.com/docs/automate/playwright/browsers-and-os) before bumping this dependency.

```bash
export BROWSERSTACK_USERNAME=...   # from https://www.browserstack.com/accounts/settings
export BROWSERSTACK_ACCESS_KEY=...
npm run test:browserstack
```

Sessions are grouped under one dashboard build per run (`BROWSERSTACK_BUILD_NAME`, defaulting to the Jenkins/GitHub Actions build number when run in CI). Reports go to `playwright-report-browserstack/` and `test-results/junit-browserstack.xml`, separate from the local-run outputs so a CI job can archive both. `BROWSERSTACK_MAX_WORKERS` (default `2`) caps concurrency to whatever your BrowserStack plan allows — most trial/starter plans cap concurrent sessions at 5.

## Reporting

Each run produces:

- terminal output from the list reporter;
- `playwright-report/` for the HTML report;
- `test-results/junit.xml` for CI integrations;
- `test-results/results.json` for further processing.

Failed tests retain a trace and video and capture a screenshot. Run `npm run report` to open the latest local HTML report.

## CI

Two independent CI entry points run the same npm scripts, so results are comparable regardless of which platform triggered them.

### GitHub Actions

The [workflow](.github/workflows/playwright.yml) runs on pushes and pull requests to `main`, on a daily schedule, and by manual trigger.

The quality job runs TypeScript and ESLint checks first. Pushes and pull requests run the Chromium regression suite. Scheduled runs add Firefox, WebKit, and mobile Chrome UI coverage. A manual run accepts `regression`, `ui`, `api`, `performance`, or `all`; the cross-browser jobs start only for scopes that contain UI tests. Reports and test results are uploaded for 14 days.

### Jenkins

The [`Jenkinsfile`](Jenkinsfile) is a declarative pipeline for a local/self-hosted Jenkins instance: `Checkout` → `Install` → `Quality gate` → `Install browsers` → `Local regression (Chromium)`, plus an optional `BrowserStack cross-browser` stage. Point a Pipeline (or Multibranch Pipeline) job at this repo with script path `Jenkinsfile` — it defines no trigger of its own, so it works the same whether you fire it from a webhook, `pollSCM`, or a manual build.

Two build parameters control it:

| Parameter | Default | Effect |
|---|---|---|
| `TEST_SCOPE` | `regression` | Which `npm run test:*` script the Chromium stage runs (`regression`/`smoke`/`ui`/`api`/`performance`/`all`) |
| `RUN_BROWSERSTACK` | `false` | Also runs `npm run test:browserstack` cross-browser after the local stage |

One-time setup on the Jenkins instance: a NodeJS tool installation named `nodejs` (**Manage Jenkins → Tools**), and a Username/Password credential with your BrowserStack username + access key, ID `browserstack-creds` (**Manage Jenkins → Credentials**) — only needed if you'll ever set `RUN_BROWSERSTACK`. Both JUnit results and the HTML report(s) are published/archived on every run, local and BrowserStack alike, so failures show up in Jenkins' Test Result Trend either way.

## Scope and limitations

- The target is a shared public demo environment. Availability, response times, and data outside this run are not controlled by this project.
- Performance coverage is a small navigation-timing quality gate, not load, stress, or Web Vitals testing. A production programme would add tools such as k6 and Lighthouse against an approved environment.
- Security-tagged cases are safe input, session, and client-side integrity checks. They are not a penetration test.
- Mobile Chrome is Playwright device emulation on the CI host, not a physical-device test.
- Some workbook scenarios remain manual or planned where automation would be unsafe on a public system or low value for this exercise. The workbook records their automation status and expected result.
