// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**', 'dist/**', '.auth/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Playwright's own fixture syntax for a fixture with no upstream
      // dependencies is `async ({}, use) => ...` — idiomatic, not a mistake.
      'no-empty-pattern': 'off',
    },
  },
);
