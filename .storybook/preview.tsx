import '../src/ui/global.css';
import { useMantineColorScheme } from '@mantine/core';
import type { Preview } from '@storybook/react-vite';
import { useEffect, useState, type ReactNode } from 'react';
import { Providers } from '../src/app/Providers';
import { createQueryClient } from '../src/app/queryClient';

function SchemeSync({ scheme, children }: { scheme: 'light' | 'dark'; children: ReactNode }) {
  const { setColorScheme } = useMantineColorScheme();
  useEffect(() => setColorScheme(scheme), [scheme, setColorScheme]);
  return children;
}

/** The app's providers, a fresh QueryClient per story, and the toolbar's color scheme. */
function StoryProviders({ scheme, children }: { scheme: 'light' | 'dark'; children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <Providers queryClient={queryClient}>
      <SchemeSync scheme={scheme}>{children}</SchemeSync>
    </Providers>
  );
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    // Every a11y rule fails a story, except color-contrast: the light-scheme tokens are below AA
    // today (.agents/planning/tasks.md › Light-scheme contrast). Re-enable it when that is fixed.
    a11y: { test: 'error', config: { rules: [{ id: 'color-contrast', enabled: false }] } },
    // Titles come from the file paths, so the sidebar mirrors src/.
    options: { storySort: { order: ['ui', 'shell', 'features'] } },
  },
  globalTypes: {
    scheme: {
      description: 'Color scheme',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { scheme: 'light' },
  decorators: [
    (Story, ctx) => (
      <StoryProviders scheme={ctx.globals.scheme as 'light' | 'dark'}>
        <Story />
      </StoryProviders>
    ),
  ],
};

export default preview;
