import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const uploadSourcemaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
  base: '/mantine-dashboard-builder/',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: 'src/app/routes',
      generatedRouteTree: 'src/app/routeTree.gen.ts',
    }),
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
  resolve: { tsconfigPaths: true },
  server: { port: 5173 },
  build: {
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
});
