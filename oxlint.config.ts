import { defineConfig } from 'oxlint';

/** The shared layer: everything features may build on (see AGENTS.md › Structure). */
const shared = ['core', 'shell', 'plugins', 'lib', 'utils', 'config', 'testing'];

/** Alias patterns for the given top-level folders. */
const above = (...dirs: string[]) => dirs.flatMap((dir) => [`@/${dir}`, `@/${dir}/**`]);

/** Folder imports that would need a barrel (index.ts). There are none: import the defining file. */
const barrels = {
  group: [
    '@/features/*',
    '@/core/*',
    '@/ui',
    '@/ui/components',
    '@/ui/theme',
    '@/ui/tokens',
    '@/shell/navbar',
    '@/shell/sidebar',
    '@/shell/contextBar',
    '@/shell/breadcrumbs',
    '@/plugins/widgets/*',
    '@/plugins/datasources/*',
    '@/lib/notify',
    '@/lib/sentry',
  ],
  message: 'No barrel files: import the file that defines the name, e.g. @/ui/components/ErrorState.',
};

/** Raw values stay in the design system; everything else reads the semantic tier (docs/design-system.md). */
const primitives = {
  group: ['@/ui/tokens/primitives'],
  message: 'Only ui/ may import the primitives: use @/ui/tokens/semantic.',
};

/** Layer rule for one layer's files; it replaces the global rule there, so it repeats the shared bans. */
const layerRule = (group: string[], message: string, shared = [barrels, primitives]) =>
  ['error', { patterns: [{ group, message }, ...shared] }] as [
    'error',
    { patterns: { group: string[]; message: string }[] },
  ];

export default defineConfig({
  plugins: ['typescript', 'react', 'unicorn', 'oxc', 'import'],

  options: {
    typeAware: true,
  },

  jsPlugins: ['./lint/plugin.js'],
  categories: { correctness: 'error' },
  env: { browser: true },
  ignorePatterns: ['dist', 'storybook-static', 'src/app/routeTree.gen.ts'],
  rules: {
    'import/no-cycle': 'error',
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
    // Token keys, not raw values, in Mantine props (docs/design-system.md).
    'app/no-raw-style-props': 'error',

    // No barrel files (bulletproof-react: they defeat tree-shaking); import the file that defines a name.
    'no-restricted-imports': ['error', { patterns: [barrels, primitives] }],
  },
  overrides: [
    {
      files: [
        'src/ui/tokens/**',
        'src/ui/theme/**',
        'src/ui/components/Page.tsx',
        '**/*.stories.tsx',
        '**/*.test.{ts,tsx}',
        'src/testing/**',
        '.storybook/**',
      ],
      rules: {
        'app/no-inline-style': 'off',
        'app/no-raw-style-props': 'off',
        'react/only-export-components': 'off',
      },
    },
    // The Sentry prototype UI is rebuilt or removed in Plan 06; until then it keeps its raw values.
    {
      files: ['src/features/integrations/**'],
      rules: { 'app/no-raw-style-props': 'off' },
    },
    {
      files: ['src/app/routes/**/*.tsx'],
      rules: { 'react/only-export-components': 'off' },
    },
    {
      files: ['*.config.{ts,cjs}', 'lint/**'],
      env: { node: true, browser: false },
    },

    // Layers (AGENTS.md › Structure): ui ← shared ← features ← app. A layer imports only from itself
    // and the layers below; features never import each other (app/ combines them).
    {
      files: ['src/ui/**'],
      rules: {
        'no-restricted-imports': layerRule(
          above('app', 'features', 'shell', 'plugins', 'lib', 'config', 'testing'),
          'ui/ is the design system: it imports only core/ and utils/.',
          [barrels],
        ),
      },
    },
    {
      files: shared.map((dir) => `src/${dir}/**`),
      rules: {
        'no-restricted-imports': layerRule(
          above('app', 'features'),
          'Shared code (components, hooks, lib, …) must not import features or the app layer.',
        ),
      },
    },
    {
      files: ['src/features/**'],
      rules: {
        'no-restricted-imports': layerRule(
          [...above('app', 'features'), '**/features/**'],
          'Features never import other features or the app layer; combine them in app/. Inside a feature, use relative imports.',
        ),
      },
    },
    // Tests, stories and their helpers assemble things, like app/: no layer rule.
    {
      files: ['**/*.test.{ts,tsx}', '**/*.stories.tsx', 'src/testing/**'],
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
});
