import { sentryVitePlugin } from '@sentry/vite-plugin';
import { devtools as tanstackDevtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { defineConfig } from 'vite';

const uploadSourcemaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig(({ command, mode }) => {
  // `pnpm dev:devtools` (`vite --mode devtools`): the dev server with TanStack Devtools, Vite DevTools
  // and click-to-source. `pnpm dev`, builds, Storybook and tests load none of them.
  const withDevtools = command === 'serve' && mode === 'devtools';
  // `pnpm build:analyze` (`vite build --mode analyze`): builds, then serves Vite DevTools on :9999 until
  // Ctrl+C. Normal builds must keep DevTools off, or they never exit.
  const analyze = command === 'build' && mode === 'analyze';

  return {
    base: '/mantine-dashboard-builder/',
    plugins: [
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
      // React Compiler (Rust port, oxc-transform-react): automatic memoization. Skipped components are
      // reported as warnings. See docs/dashboard/grid-and-charts.md.
      react({ compiler: { reportDiagnostics: true } }),
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        disable: !uploadSourcemaps,
        // Uploaded to Sentry, then removed so the deployed site never serves them.
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      }),
    ],
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
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
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
