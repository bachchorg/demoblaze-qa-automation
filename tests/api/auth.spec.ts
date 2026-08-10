import { expect, test } from '../../src/fixtures/test-fixtures';
import { randomPassword, uniqueUsername } from '../../src/utils/random';

/**
 * Exercises api.demoblaze.com directly (no browser) — see
 * src/api/DemoblazeApiClient.ts for how these endpoints were derived, since
 * demoblaze publishes no API documentation.
 */
test.describe('API — auth', () => {
  test('TC-API-01 @regression — signup then login succeeds for a fresh account', async ({ api }) => {
    const username = uniqueUsername('api_auth');
    const password = randomPassword();

    const signupResult = await api.signup(username, password);
    expect(signupResult.ok).toBe(true);

    const loginResult = await api.login(username, password);
    expect(loginResult.ok).toBe(true);
    if (loginResult.ok) {
      expect(loginResult.token).toContain('Auth_token');
    }
  });

  test('TC-API-02 — signing up an existing username is rejected', async ({ api }) => {
    const username = uniqueUsername('api_dup');
    const password = randomPassword();
    await api.signup(username, password);

    const secondSignup = await api.signup(username, password);
    expect(secondSignup.ok).toBe(false);
    if (!secondSignup.ok) {
      expect(secondSignup.errorMessage).toBe('This user already exist.');
    }
  });

  test('TC-API-03 — logging in as an unknown user is rejected', async ({ api }) => {
    const result = await api.login(uniqueUsername('nobody'), 'irrelevant');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).toBe('User does not exist.');
    }
  });

  test('TC-API-04 — logging in with the wrong password is rejected', async ({ api, testUser }) => {
    const result = await api.login(testUser.username, `${testUser.password}-wrong`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).toBe('Wrong password.');
    }
  });

  test('TC-API-05 @edge — an empty password is rejected, not silently accepted', async ({ api, testUser }) => {
    const result = await api.login(testUser.username, '');
    expect(result.ok).toBe(false);
  });
});
