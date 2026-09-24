import { Paper, SimpleGrid, Text } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Page } from '@/design-system';
import { StoryRouter } from '@/testing/storyRouter';
import { Shell } from './Shell';
import { ShellProvider } from './ShellProvider';
import { createShellStore } from './store';
import type { ContextTab } from './model/contextTabs';
import type { ShellInit } from './store';

const detailsTab: ContextTab = {
  id: 'details',
  label: 'Details',
  icon: IconInfoCircle,
  component: () => (
    <Text p="md" size="sm">
      Route-specific context content.
    </Text>
  ),
};

function Content() {
  return (
    <Page.Root>
      <Page.Header title="Sales overview" description="Revenue, pipeline and win rate by region" />
      <Page.Body>
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          {['Key figures', 'Revenue by region', 'Pipeline', 'Win rate', 'Top accounts', 'Alarms'].map((t) => (
            <Paper key={t} variant="panel" p="md" h={180}>
              <Text size="sm" fw={600}>
                {t}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Page.Body>
    </Page.Root>
  );
}

function ShellStory({ state, path }: { state: ShellInit; path?: string }) {
  const [store] = useState(() => createShellStore(state, false));
  return (
    <StoryRouter
      path={path}
      contextTabs={[detailsTab]}
      page={<Content />}
      wrap={(outlet) => (
        <ShellProvider store={store}>
          <Shell>{outlet}</Shell>
        </ShellProvider>
      )}
    />
  );
}

const meta = {
  title: 'Shell/App chrome',
  component: ShellStory,
  parameters: { a11y: { test: 'todo' } },
} satisfies Meta<typeof ShellStory>;

export default meta;
type Story = StoryObj<typeof meta>;

type SidebarInit = NonNullable<ShellInit['sidebar']>;
type ContextInit = NonNullable<ShellInit['contextBar']>;
const sidebar = (s: SidebarInit): SidebarInit => ({ mode: 'expanded', docked: true, ...s });
const ctx = (s: ContextInit): ContextInit => ({ open: false, docked: true, activeTab: 'details', ...s });

export const Expanded: Story = { args: { state: { sidebar: sidebar({}), contextBar: ctx({}) } } };
export const Compact: Story = {
  args: { state: { sidebar: sidebar({ mode: 'compact' }), contextBar: ctx({}) } },
};
export const SidebarClosed: Story = {
  args: { state: { sidebar: sidebar({ mode: 'closed' }), contextBar: ctx({}) } },
};
export const SidebarUndocked: Story = {
  args: { state: { sidebar: sidebar({ docked: false, drawerOpen: true }), contextBar: ctx({}) } },
};
export const ContextDocked: Story = {
  args: { state: { sidebar: sidebar({}), contextBar: ctx({ open: true }) } },
};
export const ContextUndocked: Story = {
  args: { state: { sidebar: sidebar({}), contextBar: ctx({ docked: false, drawerOpen: true }) } },
};
export const BothCompactAndContext: Story = {
  args: {
    state: {
      sidebar: sidebar({ mode: 'compact' }),
      contextBar: ctx({ open: true, activeTab: 'notifications' }),
    },
  },
};
export const ChildRouteActive: Story = {
  args: { path: '/dashboards/ops', state: { sidebar: sidebar({}), contextBar: ctx({}) } },
};
/** On the rail a section whose child is current shows as selected. */
export const CompactChildRouteActive: Story = {
  args: { path: '/dashboards/ops', state: { sidebar: sidebar({ mode: 'compact' }), contextBar: ctx({}) } },
};
/** A section on the rail opens its children as a flyout menu. */
export const CompactFlyout: Story = {
  args: { path: '/dashboards/ops', state: { sidebar: sidebar({ mode: 'compact' }), contextBar: ctx({}) } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Dashboards' }));
  },
};
