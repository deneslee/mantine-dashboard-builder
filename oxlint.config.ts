import type { OxlintConfig } from 'vite-plus/lint';

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
    '@/plugins/optional/*',
    '@/lib/notify',
    '@/lib/sentry',
    '@/lib/vault',
  ],
  message: 'No barrel files: import the file that defines the name, e.g. @/ui/components/ErrorState.',
};

/** Raw values stay in the design system; everything else reads the semantic tier (docs/design-system.md). */
const primitives = {
  group: ['@/ui/tokens/primitives'],
  message: 'Only ui/ may import the primitives: use @/ui/tokens/semantic.',
};

/** Drivers that need Node and raw sockets: they run in relay/, never in the browser bundle. */
const serverPackages = {
  group: [
    'mssql',
    'mssql/**',
    'tedious',
    'tedious/**',
    'mongodb',
    'mongodb/**',
    'hono',
    'hono/**',
    '@hono/**',
  ],
  message: 'Server packages run in relay/, never in the browser: talk to them through the relay client.',
};

/** Generated from plugins.json by plugins.config.ts: what's in the build is decided in one place. */
const virtualPlugins = {
  group: ['virtual:optional-plugins'],
  message: 'Only app/ imports virtual:optional-plugins; everything else reads plugins through usePlugins().',
};

/** Packages core/ may not use, type imports included: it runs anywhere and knows no UI or state. */
const uiAndStatePackages = [
  'react',
  'react/**',
  'react-dom',
  'react-dom/**',
  '@mantine/**',
  '@tanstack/**',
  '@tabler/**',
  'zustand',
  'zustand/**',
  'zundo',
  'immer',
  'dayjs',
  'dayjs/**',
  'recharts',
  'react-grid-layout',
  'react-grid-layout/**',
  '@sentry/**',
];

/**
 * One layer's import rule, for its folder and its fixture mirror under lint/fixtures/src/. It replaces
 * the global rule there, so it repeats the shared bans.
 */
const layer = (
  dir: string,
  group: string[],
  message: string,
  shared = [barrels, primitives, serverPackages, virtualPlugins],
) => ({
  files: [`src/${dir}/**`, `lint/fixtures/src/${dir}/**`],
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group, message }, ...shared] }] as [
      'error',
      { patterns: { group: string[]; message: string }[] },
    ],
  },
});

export const lint = {
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
    'no-restricted-imports': ['error', { patterns: [barrels, primitives, serverPackages, virtualPlugins] }],
  },
  overrides: [
    {
      files: [
        'src/ui/tokens/**',
        'src/ui/theme/**',
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

    // Layers (AGENTS.md › Structure, docs/architecture.md › Layers). Each folder imports only the
    // folders below it; tests, stories and testing/ are exempt (last override). Every rule also covers
    // its mirror under lint/fixtures/src/, where lint/rules.test.ts proves it fires.
    layer(
      'utils',
      [...above('core', 'ui', 'lib', 'shell', 'plugins', 'features', 'app', 'testing')],
      'utils/ imports nothing from src/.',
    ),
    layer(
      'core',
      [...above('ui', 'lib', 'shell', 'plugins', 'features', 'app', 'testing'), ...uiAndStatePackages],
      'core/ is plain TypeScript: it imports only utils/ and libraries without UI or state (zod).',
    ),
    layer(
      'ui',
      [...above('lib', 'shell', 'plugins', 'features', 'app', 'testing'), '@tanstack/react-router'],
      'ui/ is the design system: it imports only core/ and utils/, and knows no routes.',
      [barrels, serverPackages, virtualPlugins],
    ),
    layer(
      'lib',
      above('shell', 'plugins', 'features', 'app', 'testing'),
      'lib/ imports only core/, ui/ and utils/.',
    ),
    layer(
      'plugins',
      above('lib', 'shell', 'features', 'app', 'testing'),
      'plugins/ imports only core/, ui/ and utils/: a plugin needs nothing from the app.',
    ),
    layer(
      'shell',
      above('plugins', 'features', 'app', 'testing'),
      'shell/ imports only core/, ui/, utils/ and lib/.',
    ),
    layer(
      'features',
      [
        ...above('app', 'features', 'testing'),
        '**/features/**',
        '@/plugins/widgets/**',
        '@/plugins/datasources/**',
        '@/plugins/optional/**',
      ],
      'Features never import app/, another feature, or a built-in widget, datasource or optional plugin (they come from usePlugins); app/ combines them. Inside a feature, use relative imports.',
    ),
    // app/ alone reads virtual:optional-plugins.
    layer('app', above('testing'), 'testing/ is for tests and stories only.', [
      barrels,
      primitives,
      serverPackages,
    ]),
    // Tests, stories and their helpers assemble things, like app/: no layer rule.
    {
      files: ['**/*.test.{ts,tsx}', '**/*.stories.tsx', 'src/testing/**'],
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
} satisfies OxlintConfig;

export default { lint };
