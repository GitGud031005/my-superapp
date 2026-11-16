import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const p5rImportBan = {
  patterns: [
    {
      group: ['@superapp/p5r-ds', '@superapp/p5r-ds/*', '**/packages/p5r-ds/**'],
      message:
        'The Persona 5 Royal design system is only for modules/phantom-ledger. The shell and other modules keep their own neutral styling.',
    },
  ],
};

export default defineConfig([
  globalIgnores(['**/dist', 'packages/p5r-ds/**', 'backend/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: { 'no-restricted-imports': ['error', p5rImportBan] },
  },
  {
    files: ['**/vite.config.ts', '**/vitest.config.ts', 'vitest.setup.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['modules/phantom-ledger/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
