import { sentryVitePlugin } from '@sentry/vite-plugin';
import { devtools as tanstackDevtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { defineConfig, lazyPlugins } from 'vite-plus';
import { lint } from './oxlint.config';
import { optionalPlugins } from './plugins.config';

const uploadSourcemaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig(({ command, mode }) => {
  // `pnpm dev:devtools` (`vite --mode devtools`): the dev server with TanStack Devtools, Vite DevTools
  // and click-to-source. `pnpm dev`, builds, Storybook and tests load none of them.
  const withDevtools = command === 'serve' && mode === 'devtools';
  // `pnpm build:analyze` (`vite build --mode analyze`): builds, then serves Vite DevTools on :9999 until
  // Ctrl+C. Normal builds must keep DevTools off, or they never exit.
  const analyze = command === 'build' && mode === 'analyze';

  return {
    staged: {
      '*': 'vp check --fix',
    },
    // Vite Task caches these: a rerun with no input changed replays the last result. `pnpm build`, `lint`,
    // `typecheck`, `format:check` and `test*` hand off here; `vp cache clean` resets it.
    run: {
      tasks: {
        // Type errors come from tsgolint (`typeCheck` above): `vp lint` reports them, so there's no separate
        // tsc and `pnpm typecheck` runs check:lint. (`vp check --no-fmt --no-lint` measured 4x slower.)
        // Tasks get a clean env. The Sentry vars turn source-map upload on, so they belong in the key.
        'check:build': { command: 'vp build', cache: { env: ['SENTRY_*'] } },
        'check:lint': 'vp lint',
        'check:css': 'stylelint "src/**/*.css"',
        'check:fmt': 'vp fmt --check .',
        'check:test': 'vp test run',
        'check:unit': 'vp test run --project node --project dom',
        'check:stories': 'vp test run --project storybook',
      },
    },
    lint: {
      ...lint,
      jsPlugins: [...lint.jsPlugins, { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
      rules: { ...lint.rules, 'vite-plus/prefer-vite-plus-imports': 'error' },
      options: { ...lint.options, typeCheck: true },
      ignorePatterns: [...lint.ignorePatterns, 'lint/fixtures/**', '.qartez/**'],
    },
    fmt: {
      singleQuote: true,
      semi: true,
      printWidth: 110,
      trailingComma: 'all',
      arrowParens: 'always',
      sortPackageJson: false,
      ignorePatterns: [
        'dist',
        'storybook-static',
        'node_modules',
        'pnpm-lock.yaml',
        'src/app/routeTree.gen.ts',
        '.claude',
        '.codex',
        '.agents/skills',
        'coverage/',
        '.kiro',
        '.qartez',
        'public/assets',
      ],
    },
    base: '/mantine-dashboard-builder/',
    plugins: lazyPlugins(() => [
      // First, as TanStack requires. Its click-to-source is off: code-inspector does that job.
      withDevtools && tanstackDevtools({ injectSource: { enabled: false } }),
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: 'src/app/routes',
        generatedRouteTree: 'src/app/routeTree.gen.ts',
      }),
      // Hold Alt+Shift and click an element to open its source in the editor. Must precede react().
      withDevtools && codeInspectorPlugin({ bundler: 'vite' }),
      // React Compiler (Rust port, oxc-transform-react): automatic memoization. lint/compiler.test.ts
      // fails when it skips a component it shouldn't. See docs/dashboard/grid-and-charts.md.
      react({ compiler: true }),
      // Only the optional plugins plugins.json lists are built in; the rest aren't in dist at all.
      optionalPlugins(),
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        disable: !uploadSourcemaps,
        // Uploaded to Sentry, then removed so the deployed site never serves them.
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      }),
    ]),
    // Also turns on Rolldown's build data (node_modules/.rolldown/) for analyze builds only.
    devtools: withDevtools || analyze,
    resolve: { tsconfigPaths: true },
    server: { port: 5173 },
    build: {
      license: true,
      // Source maps only when they go to Sentry; otherwise GitHub Pages would publish them.
      sourcemap: uploadSourcemaps ? 'hidden' : false,
      rolldownOptions: {
        output: {
          // Framework code every page loads, in its own long-cached chunks: an app-only deploy keeps
          // them in the browser cache. Named libraries only; a catch-all node_modules group would
          // pull lazy-only libraries (Recharts, react-grid-layout) into the first load. Mantine is
          // left out on purpose: a group would also capture components only lazy routes use (+50 KiB).
          codeSplitting: {
            groups: [
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: 'tanstack',
                test: /node_modules[\\/]@tanstack[\\/](react-router|router-core|react-query|query-core)[\\/]/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
  };
});
