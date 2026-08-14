import 'dotenv/config';

function booleanValue(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  throw new Error(`${name} must be one of: true, false, 1, 0. Received "${value}".`);
}

function integerValue(name: string, fallback: number, minimum: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}. Received "${raw ?? value}".`);
  }
  return value;
}

function optionalIntegerValue(name: string, minimum: number): number | undefined {
  return process.env[name] === undefined ? undefined : integerValue(name, minimum, minimum);
}

function urlValue(name: string, fallback: string): string {
  const value = process.env[name] ?? fallback;
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${name} must use http or https. Received "${value}".`);
  }
  return value.replace(/\/$/, '');
}

const fixedUsername = process.env.DEMOBLAZE_USERNAME || undefined;
const fixedPassword = process.env.DEMOBLAZE_PASSWORD || undefined;

if (Boolean(fixedUsername) !== Boolean(fixedPassword)) {
  throw new Error('DEMOBLAZE_USERNAME and DEMOBLAZE_PASSWORD must either both be set or both be unset.');
}

export const env = {
  baseUrl: urlValue('BASE_URL', 'https://www.demoblaze.com'),
  apiBaseUrl: urlValue('API_BASE_URL', 'https://api.demoblaze.com'),

  headless: booleanValue('HEADLESS', true),
  actionTimeoutMs: integerValue('ACTION_TIMEOUT_MS', 15_000, 1),
  testTimeoutMs: integerValue('TEST_TIMEOUT_MS', 60_000, 1),

  workers: optionalIntegerValue('WORKERS', 1),
  retries: optionalIntegerValue('RETRIES', 0),

  isCI: booleanValue('CI', false),

  performanceMaxLoadMs: integerValue('PERF_MAX_LOAD_MS', 8_000, 1),
  performanceMaxTtfbMs: integerValue('PERF_MAX_TTFB_MS', 3_000, 1),

  fixedUsername,
  fixedPassword,
};
