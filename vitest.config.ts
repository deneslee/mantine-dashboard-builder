import babel from '@rolldown/plugin-babel';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

// Pure logic: no DOM, so no jsdom start-up cost. Everything else runs in jsdom.
const NODE_TESTS = [
  'lint/**/*.test.ts',
  'src/core/**/*.test.ts',
  'src/utils/**/*.test.ts',
  'src/plugins/datasources/**/*.test.ts',
  'src/features/dashboards/data/demoDashboards.test.ts',
];

export default defineConfig({
  // Same React Compiler as the app, so tests run the code that ships.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    projects: [
      { extends: true, test: { name: 'node', environment: 'node', include: NODE_TESTS } },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...NODE_TESTS],
          setupFiles: ['./src/testing/setup.ts'],
          css: { modules: { classNameStrategy: 'non-scoped' } },
        },
      },
      // Every story renders (and passes its a11y check) in real Chromium; play functions test flows.
      {
        extends: true,
        plugins: [storybookTest({ configDir: '.storybook', storybookScript: 'pnpm storybook --no-open' })],
        test: {
          name: 'storybook',
          setupFiles: ['./.storybook/vitest.setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            // Wide enough for the lg grid and edit mode.
            viewport: { width: 1600, height: 1000 },
          },
        },
      },
    ],
  },
});
