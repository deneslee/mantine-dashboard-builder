import { Box } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconChartDots3, IconDatabase, IconHelp, IconSettings, IconTemplate } from '@tabler/icons-react';
import { useState } from 'react';
import { tokens } from '@/design-system';
import { StoryRouter } from '@/testing/storyRouter';
import type { NavGroup } from '../model/nav';
import { ShellProvider } from '../ShellProvider';
import { createShellStore } from '../store';
import { SidebarNav } from './SidebarNav';
import classes from './Sidebar.module.css';

/** Titled and untitled groups; the real nav decides per group in `model/nav.ts`. */
const groups: NavGroup[] = [
  {
    id: 'build',
    items: [
      { id: 'templates', label: 'Templates', icon: IconTemplate, to: '/templates' },
      { id: 'explore', label: 'Explore', icon: IconChartDots3, to: '/explore' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [{ id: 'datasources', label: 'Data sources', icon: IconDatabase, to: '/datasources' }],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: IconSettings, to: '/settings' },
      { id: 'help', label: 'Help', icon: IconHelp, to: '/help' },
    ],
  },
];

function NavStory({ compact }: { compact: boolean }) {
  const [store] = useState(() =>
    createShellStore({ narrow: false, sidebar: { mode: compact ? 'compact' : 'expanded' } }, false),
  );
  const { sidebar } = tokens.shell;
  return (
    <StoryRouter
      path="/datasources"
      wrap={() => (
        <ShellProvider store={store}>
          <Box
            w={compact ? sidebar.compact : sidebar.expanded}
            mih="100dvh"
            className={classes.root}
            data-compact={compact || undefined}
          >
            <SidebarNav groups={groups} />
          </Box>
        </ShellProvider>
      )}
    />
  );
}

const meta = {
  title: 'Shell/Sidebar nav',
  component: NavStory,
} satisfies Meta<typeof NavStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GroupTitles: Story = { args: { compact: false } };
/** Titles become short dividers under the icons, so items keep their position. */
export const GroupTitlesCompact: Story = { args: { compact: true } };
