import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['typescript', 'react', 'unicorn', 'oxc'],
  jsPlugins: ['./lint/plugin.js'],
  categories: { correctness: 'error' },
  env: { browser: true },
  ignorePatterns: ['dist', 'storybook-static', 'src/routeTree.gen.ts'],
  rules: {
    // typescript-eslint recommended
    'typescript/ban-ts-comment': 'error',
    'typescript/no-empty-object-type': 'error',
    'typescript/no-explicit-any': 'error',
    'typescript/no-namespace': 'error',
    'typescript/no-require-imports': 'error',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-function-type': 'error',
    'typescript/no-wrapper-object-types': 'error',
    'typescript/prefer-as-const': 'error',
    'typescript/triple-slash-reference': 'error',
    'typescript/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',

    // react-hooks recommended (incl. React Compiler rules)
    'react/rules-of-hooks': 'error',
    'react/exhaustive-deps': 'warn',
    'react/static-components': 'error',
    'react/use-memo': 'error',
    'react/preserve-manual-memoization': 'error',
    'react/incompatible-library': 'warn',
    'react/immutability': 'error',
    'react/globals': 'error',
    'react/refs': 'error',
    'react/set-state-in-effect': 'error',
    'react/set-state-in-render': 'error',
    'react/error-boundaries': 'error',
    'react/purity': 'error',
    'react/unsupported-syntax': 'warn',

    // Compound components export an object of components (Panel.Header, ErrorState.Full).
    'react/only-export-components': [
      'error',
      { allowConstantExport: true, allowExportNames: ['Panel', 'ErrorState', 'Page'] },
    ],

    // Design system rule: no inline styles outside design-system/. Use CSS modules or Mantine style props.
    'app/no-inline-style': 'error',

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
  overrides: [
    {
      files: [
        'src/design-system/**',
        '**/*.stories.tsx',
        '**/*.test.{ts,tsx}',
        'src/test/**',
        '.storybook/**',
      ],
      rules: { 'app/no-inline-style': 'off', 'react/only-export-components': 'off' },
    },
    {
      files: ['src/routes/**/*.tsx'],
      rules: { 'react/only-export-components': 'off' },
    },
    {
      files: ['*.config.{ts,cjs}', 'lint/**'],
      env: { node: true, browser: false },
    },
  ],
});
