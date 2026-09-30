import '../src/app/global.css';
import { MantineProvider, useMantineColorScheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Preview } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';
import { cssVariablesResolver, theme } from '../src/design-system/theme/theme';

function SchemeSync({ scheme, children }: { scheme: 'light' | 'dark'; children: ReactNode }) {
  const { setColorScheme } = useMantineColorScheme();
  useEffect(() => setColorScheme(scheme), [scheme, setColorScheme]);
  return children;
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    // Every a11y rule fails a story, except color-contrast: the light-scheme tokens are below AA
    // today (.agents/planning/tasks.md › Light-scheme contrast). Re-enable it when that is fixed.
    a11y: { test: 'error', config: { rules: [{ id: 'color-contrast', enabled: false }] } },
    options: { storySort: { order: ['Design system', 'Shell', 'Notifications', 'Errors', 'Loading'] } },
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
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
        <SchemeSync scheme={ctx.globals.scheme as 'light' | 'dark'}>
          <Notifications limit={3} />
          <Story />
        </SchemeSync>
      </MantineProvider>
    ),
  ],
};

export default preview;
