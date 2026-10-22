import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { devtools as tanstackDevtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { defineConfig } from 'vite';

const uploadSourcemaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig(({ command, mode }) => {
  // `pnpm dev:devtools` (`vite --mode devtools`): the dev server with TanStack Devtools, Vite DevTools
  // and click-to-source. `pnpm dev`, builds, Storybook and tests load none of them.
  const withDevtools = command === 'serve' && mode === 'devtools';

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
      react(),
      // React Compiler 1.0 (stable, through Babel): automatic memoization. See docs/grid-and-charts.md.
      babel({ presets: [reactCompilerPreset()] }),
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        disable: !uploadSourcemaps,
        // Uploaded to Sentry, then removed so the deployed site never serves them.
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      }),
    ],
    devtools: withDevtools,
    resolve: { tsconfigPaths: true },
    server: { port: 5173 },
    build: {
      // Every bundled dependency's license, in dist/.vite/license.md.
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
