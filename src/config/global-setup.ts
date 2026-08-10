import { request } from '@playwright/test';
import { DemoblazeApiClient } from '../api/DemoblazeApiClient';
import { saveTestUser } from '../data/users';
import { randomPassword, uniqueUsername } from '../utils/random';
import { env } from './env';

/**
 * Runs once before the whole suite (wired via playwright.config.ts
 * `globalSetup`). demoblaze has no seeded accounts, so "log in with valid
 * credentials" needs *an* account to exist first.
 *
 * If DEMOBLAZE_USERNAME/DEMOBLAZE_PASSWORD are set (e.g. in CI, to reuse one
 * stable account across runs), this verifies that account logs in and stops.
 * Otherwise it registers a fresh, uniquely-named account via the API — no
 * UI interaction needed for setup, and no risk of colliding with an account
 * a previous/concurrent run created.
 */
export default async function globalSetup(): Promise<void> {
  const apiContext = await request.newContext({ baseURL: env.apiBaseUrl });
  const api = new DemoblazeApiClient(apiContext, env.apiBaseUrl);

  try {
    if (env.fixedUsername && env.fixedPassword) {
      const result = await api.login(env.fixedUsername, env.fixedPassword);
      if (!result.ok) {
        throw new Error(
          `DEMOBLAZE_USERNAME/DEMOBLAZE_PASSWORD are set but login failed: ${result.errorMessage}. ` +
            'Fix the credentials, or unset both env vars to auto-provision a fresh account instead.',
        );
      }
      saveTestUser({ username: env.fixedUsername, password: env.fixedPassword });
      console.log(`[global-setup] Using fixed account "${env.fixedUsername}".`);
      return;
    }

    const username = uniqueUsername('qa_auto');
    const password = randomPassword();
    const signupResult = await api.signup(username, password);
    if (!signupResult.ok) {
      throw new Error(`[global-setup] Could not provision test account: ${signupResult.errorMessage}`);
    }

    saveTestUser({ username, password });
    console.log(`[global-setup] Provisioned fresh account "${username}" for this run.`);
  } finally {
    await apiContext.dispose();
  }
}
