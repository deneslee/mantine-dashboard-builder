import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'storybook-static', 'src/routeTree.gen.ts', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  ...storybook.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Design system rule: no inline styles outside design-system/. Use CSS modules or Mantine style props.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="style"] > JSXExpressionContainer > ObjectExpression',
          message: 'No inline style objects. Use a CSS module, Mantine style props, or a theme variant.',
        },
      ],
      // Bundle rule: import Mantine and icons from their packages, never from a local barrel of them.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*', '!@/features/*/index'],
              message: 'Import other features through their index.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // Compound components export an object of components (Panel.Header, ErrorState.Full).
    files: ['src/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['Panel', 'ErrorState', 'Page'] },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
  },
  {
    files: [
      'src/design-system/**/*.{ts,tsx}',
      '**/*.stories.tsx',
      '**/*.test.{ts,tsx}',
      'src/test/**',
      '.storybook/**',
    ],
    rules: { 'no-restricted-syntax': 'off', 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['src/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
);
