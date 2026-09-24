import { defineConfig } from 'oxlint';

/** The shared layer: everything features may build on (see AGENTS.md › Structure). */
const shared = [
  'components',
  'hooks',
  'lib',
  'stores',
  'config',
  'types',
  'utils',
  'testing',
  'shared',
  'test',
];

/** Alias patterns for the given top-level folders. */
const above = (...dirs: string[]) => dirs.flatMap((dir) => [`@/${dir}`, `@/${dir}/**`]);

// Warn while the structure migration (plan-02) runs; switched to 'error' when it is done.
const layerRule = (group: string[], message: string) =>
  ['warn', { patterns: [{ group, message }] }] as [
    'warn',
    { patterns: { group: string[]; message: string }[] },
  ];

export default defineConfig({
  plugins: ['typescript', 'react', 'unicorn', 'oxc', 'import'],
  jsPlugins: ['./lint/plugin.js'],
  categories: { correctness: 'error' },
  env: { browser: true },
  ignorePatterns: ['dist', 'storybook-static', 'src/routeTree.gen.ts'],
  rules: {
    'import/no-cycle': 'warn',
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

    // No barrel files (bulletproof-react: they defeat tree-shaking); import the file that defines a name.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/features/*', '@/components/*', '@/design-system', '@/lib/errors'],
            message:
              'No barrel files: import the file that defines the name, e.g. @/components/errors/ErrorState.',
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
        'src/testing/**',
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

    // Layers (AGENTS.md › Structure): design-system ← shared ← features ← app. A layer imports only
    // from itself and the layers below; features never import each other (app/ combines them).
    {
      files: ['src/design-system/**'],
      rules: {
        'no-restricted-imports': layerRule(
          above('app', 'routes', 'features', 'integrations', ...shared),
          'design-system/ is the lowest layer: it imports nothing from the rest of the app.',
        ),
      },
    },
    {
      files: shared.map((dir) => `src/${dir}/**`),
      rules: {
        'no-restricted-imports': layerRule(
          above('app', 'routes', 'features', 'integrations'),
          'Shared code (components, hooks, lib, …) must not import features or the app layer.',
        ),
      },
    },
    {
      files: ['src/features/**'],
      rules: {
        'no-restricted-imports': layerRule(
          [...above('app', 'routes', 'features', 'integrations'), '**/features/**'],
          'Features never import other features or the app layer; combine them in app/. Inside a feature, use relative imports.',
        ),
      },
    },
    // Tests and stories assemble things, like app/: no layer rule.
    {
      files: ['**/*.test.{ts,tsx}', '**/*.stories.tsx'],
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
});
