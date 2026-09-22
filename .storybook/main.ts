import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  // Reuse vite.config.ts (tsconfig paths, PostCSS) but skip the router file generator.
  viteFinal: async (cfg) => {
    cfg.plugins = (cfg.plugins ?? [])
      .flat()
      .filter((p) => !(p && typeof p === 'object' && 'name' in p && String(p.name).startsWith('tanstack')));
    return cfg;
  },
};

export default config;
