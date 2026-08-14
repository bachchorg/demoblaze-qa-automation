import { expect, test } from '../../src/fixtures/test-fixtures';
import { randomPassword, uniqueUsername } from '../../src/utils/random';

test.describe('API — auth', () => {
  test('TC-API-01 — signup then login succeeds for a fresh account', { tag: ['@regression'] }, async ({ api }) => {
    const username = uniqueUsername('api_auth');
    const password = randomPassword();

    await test.step('Sign up', async () => {
      const signupResult = await api.signup(username, password);
      expect(signupResult.ok).toBe(true);
    });

    await test.step('Log in with the new account', async () => {
      const loginResult = await api.login(username, password);
      expect(loginResult.ok).toBe(true);
      if (loginResult.ok) {
        expect(loginResult.token).toBeTruthy();
        expect(loginResult.token).not.toContain('Auth_token:');
      }
    });
  });

  test('TC-API-02 — signing up an existing username is rejected', async ({ api }) => {
    const username = uniqueUsername('api_dup');
    const password = randomPassword();

    await test.step('Sign up once', async () => {
      await api.signup(username, password);
    });

    await test.step('Sign up again with the same username', async () => {
      const secondSignup = await api.signup(username, password);
      expect(secondSignup.ok).toBe(false);
      if (!secondSignup.ok) {
        expect(secondSignup.errorMessage).toBe('This user already exist.');
      }
    });
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

  test('TC-API-05 — an empty password is rejected, not silently accepted', { tag: ['@edge'] }, async ({
    api,
    testUser,
  }) => {
    const result = await api.login(testUser.username, '');
    expect(result.ok).toBe(false);
  });
});
