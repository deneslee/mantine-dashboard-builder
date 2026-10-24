import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  // The sample dashboards and frames, so page stories load real data like the app.
  staticDirs: ['../public'],
  // Reuse vite.config.ts (tsconfig paths, PostCSS) but skip the router file generator. Stories show
  // every optional plugin, as the tests do, whatever plugins.json lists (plugins.config.ts).
  viteFinal: async (cfg) => {
    cfg.plugins = (cfg.plugins ?? [])
      .flat()
      .filter((p) => !(p && typeof p === 'object' && 'name' in p && String(p.name).startsWith('tanstack')));
    for (const p of cfg.plugins)
      if (p && typeof p === 'object' && 'api' in p && 'name' in p && p.name === 'app:optional-plugins')
        (p.api as { includeAll: () => void }).includeAll();
    return cfg;
  },
};

export default config;
