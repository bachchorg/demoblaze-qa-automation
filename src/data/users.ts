import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface TestUser {
  username: string;
  password: string;
}

/**
 * Where global setup persists the account it provisions, so every worker
 * process (Playwright shards tests across several) reads the same identity
 * instead of each registering its own. Gitignored — it's regenerated per run.
 */
export const TEST_USER_FILE = join(__dirname, '..', '..', '.auth', 'test-user.json');

export function saveTestUser(user: TestUser): void {
  mkdirSync(dirname(TEST_USER_FILE), { recursive: true });
  writeFileSync(TEST_USER_FILE, JSON.stringify(user, null, 2));
}

export function loadTestUser(): TestUser {
  if (!existsSync(TEST_USER_FILE)) {
    throw new Error(
      `No provisioned test user at ${TEST_USER_FILE} — global setup should have created ` +
        'this before any test ran. Did you run via `playwright test` (which always runs ' +
        'globalSetup first), rather than executing a spec file directly?',
    );
  }
  return JSON.parse(readFileSync(TEST_USER_FILE, 'utf8')) as TestUser;
}
