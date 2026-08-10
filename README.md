# demoblaze-qa-automation

E2E test automation framework for [demoblaze.com](https://www.demoblaze.com/) — Playwright + TypeScript, covering the **Login** and **Cart/Checkout** features with UI, API, regression, and performance-smoke test types.

Built for a QA automation take-home challenge. Everything here was run against the live site, not assumed — several test cases document real, verified quirks of the target application rather than textbook expectations (see [Known environment characteristics](#known-environment-characteristics)).

## Deliverables

| # | Deliverable | Location |
|---|---|---|
| 1 | Test case suite (Login + Cart: functional/edge/negative) | [`test-cases/demoblaze-test-cases.xlsx`](test-cases/demoblaze-test-cases.xlsx) |
| 2 | Automation framework + demo scripts | this repo (`tests/`, `src/`) |
| 3 | README (structure, rationale, execution steps) | this file |

## Quick start

```bash
npm install
npx playwright install --with-deps
npm test              # full suite, all projects
npm run test:chromium # fastest feedback loop: one browser, everything
```

No `.env` file or credentials are required to get started — see [Configuration](#configuration).

## Project structure

```
src/
  config/          env.ts (single config source), global-setup.ts (test-account provisioning)
  data/            products.ts, users.ts — static test data & account persistence
  api/             DemoblazeApiClient.ts — typed wrapper over the JSON API
  pages/           Page Object Model: HomePage, ProductPage, CartPage, NavBar,
                   modals/ (LoginModal, SignUpModal, PlaceOrderModal, PurchaseConfirmation)
  fixtures/        test-fixtures.ts — Playwright `test.extend` wiring page objects,
                   the API client, and a pre-provisioned test user into every test
  utils/           random.ts — unique usernames/passwords for signup-based tests
tests/
  ui/              login.spec.ts, cart.spec.ts
  api/             auth.spec.ts, catalog.spec.ts
  performance/     page-load.spec.ts
scripts/
  test-case-data.ts, generate-test-case-workbook.ts — source of truth for the
  Excel test case suite (`npm run gen:test-cases` regenerates it)
test-cases/        demoblaze-test-cases.xlsx (generated, committed)
.github/workflows/ playwright.yml — CI
```

### Design rationale

- **Page Object Model** — every page/modal is a class owning its own locators and actions (`fill`, `submit…`, `getTotal`, …). Tests read as a sequence of business actions, not raw selectors, so a markup change is a one-file fix.
- **Fixtures over setup boilerplate** (`src/fixtures/test-fixtures.ts`) — `homePage`, `cartPage`, `api`, `testUser`, `loggedInHomePage` are injected per-test via `test.extend`, so specs never hand-construct page objects or repeat login steps.
- **Config-driven, not hardcoded** (`src/config/env.ts`) — base URL, timeouts, worker count, retries, and credentials all read from one module backed by env vars / `.env`, so CI and local runs (or even pointing at a staging clone) diverge without touching test code.
- **`globalSetup` for test data** — demoblaze has no seeded accounts, so global setup either verifies a fixed account (`DEMOBLAZE_USERNAME`/`PASSWORD`) or signs up a fresh, uniquely-named one via the API once per run, then every test reuses it via the `testUser`/`loggedInHomePage` fixtures.
- **API tests use `APIRequestContext`**, Playwright's own request fixture, not a separate HTTP client — one toolchain, one config, one report.
- **Tagged tests, not separate test files, for regression/smoke/edge** — `@smoke`, `@regression`, `@edge` in test titles map to `--grep` in the npm scripts, so the same spec file serves multiple CI trigger types without duplication.

## Configuration

Every knob lives in `src/config/env.ts` and can be overridden via env vars or a `.env` file (copy [`.env.example`](.env.example)):

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://www.demoblaze.com` | App under test |
| `API_BASE_URL` | `https://api.demoblaze.com` | JSON API under test |
| `HEADLESS` | `true` | Browser headless mode |
| `ACTION_TIMEOUT_MS` | `15000` | Per-action timeout |
| `TEST_TIMEOUT_MS` | `60000` | Per-test timeout |
| `WORKERS` | Playwright default | Parallel workers |
| `RETRIES` | `0` local / `2` CI | Retry count |
| `DEMOBLAZE_USERNAME` / `DEMOBLAZE_PASSWORD` | unset | Use a fixed, already-registered account instead of provisioning a fresh one every run |

## Running the suite

```bash
npm test                 # everything, all 4 projects
npm run test:ui          # UI specs only
npm run test:api         # API specs only
npm run test:performance # performance-smoke specs only
npm run test:smoke       # @smoke-tagged tests (fastest sanity check)
npm run test:regression  # @regression-tagged tests (CI default)

npm run test:chromium    # single-browser runs
npm run test:firefox
npm run test:webkit

npm run test:headed      # watch it run
npm run test:debug       # Playwright inspector
npm run report           # open the last HTML report
npm run codegen          # Playwright's recorder, pre-pointed at demoblaze.com

npm run typecheck        # tsc --noEmit
npm run lint             # eslint

npm run gen:test-cases   # regenerate test-cases/demoblaze-test-cases.xlsx
```

### Cross-browser / cross-platform coverage

`playwright.config.ts` defines four projects: **chromium** (full suite — UI + API + performance, the primary/fastest-feedback target), **firefox**, **webkit** (UI only — API/performance don't render through a browser engine, so re-running them per-engine adds runtime, not signal), and **mobile-chrome** (Pixel 7 viewport, for touch/viewport coverage).

## CI/CD

[`.github/workflows/playwright.yml`](.github/workflows/playwright.yml) runs on every push/PR to `main`, nightly (full cross-browser regression), and on-demand via `workflow_dispatch` with a `test_scope` input (`regression` / `ui` / `api` / `performance` / `all`) — mirroring the npm scripts above. Each of the four projects runs as an independent matrix job (`fail-fast: false`, so a webkit failure doesn't hide a chromium one) and uploads its HTML report + JUnit/JSON results as build artifacts.

## Reporting

Every run produces three report formats simultaneously (`playwright.config.ts` → `reporter`): a `list` reporter for the terminal, an HTML report (`playwright-report/`, `npm run report` to open), and JUnit + JSON (`test-results/junit.xml`, `test-results/results.json`) for CI/dashboard ingestion. Failures additionally capture a trace, screenshot, and video (`retain-on-failure`/`only-on-failure`).

## Known environment characteristics

These were found by capturing real traffic and probing the live site during development, and shape several test-design decisions — they are not framework bugs:

- **The cart is a single shared, global list, not scoped per session.** Any visitor to the public demo — including concurrent CI runs and other testers — sees and mutates the same underlying cart data. Most cart assertions therefore check "my product is present" rather than "the cart has exactly N items." The two tests that genuinely need a clean, deterministic total (`TC-CART-02`, `TC-CART-07`) clear the cart first and are intentionally scoped to run on the `chromium` project only — running the same clear-then-assert flow from four browser engines concurrently just means four workers racing to own one shared resource, which doesn't test anything the other three engines' passing UI tests don't already cover. See the doc comments on those two tests and on `CartPage` for the full reasoning.
- **Dialogs fire synchronously for client-side validation.** demoblaze calls `alert()` *inside* the click handler for empty-field validation, which blocks the page's JS thread until the dialog is dismissed — awaiting the click before awaiting the dialog deadlocks. `BasePage.captureDialogMessage()` races both with `Promise.all` instead. Server-validated errors (wrong password, unknown user) fire the alert asynchronously after an XHR and don't hit this, but the same concurrent pattern is correct for both.
- **No `networkidle`.** The site embeds a background HLS video widget that streams continuously, so `waitForLoadState('networkidle')` never resolves. Cart/catalog loads instead race a specific `waitForResponse` (`/viewcart`, `/bycat`) against the triggering navigation/click.
- **An SQL-injection-shaped login (`' OR '1'='1' --`) doesn't produce the expected alert at all** — verified reproducibly (100% of runs) to instead cause a full page reload, likely an unhandled client-side exception on that response path. `TC-LOGIN-08` asserts on the actually-observed outcome (no crash, no bypass) rather than the naive expectation.
- **No format/expiry validation on the checkout form** beyond "Name and Card are non-empty" — a non-numeric card number or an already-expired year is silently accepted. Documented in the test case suite (`TC-CART-09`, `TC-CART-10`) as findings, not automated as failing assertions, since they describe existing (weak) behavior rather than a regression to catch.

## Test IDs

Automated `TC-LOGIN-*` / `TC-CART-*` / `TC-API-*` / `TC-PERF-*` IDs used in spec titles are kept in sync 1:1 with the rows in the Excel test case suite (`Automation Reference` column), so a failing automated test traces straight back to its documented case, and the suite's manual/documented-only rows (`Automated: N`) are visible as deliberate scope decisions rather than gaps.
