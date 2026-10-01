import { Paper, SimpleGrid, Text } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Page } from '@/ui/components/Page';
import { notificationsTab } from '@/features/notifications/notificationsTab';
import { TestRouter } from '@/testing/TestRouter';
import { Shell } from './Shell';
import { ShellProvider } from './ShellProvider';
import { createShellStore } from './createShellStore';
import type { ContextTab } from './ContextTab';
import type { ShellInit } from './createShellStore';

const globalTabs = [notificationsTab];

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
      <Page.Header>
        <Page.Title>Sales overview</Page.Title>
        <Page.Description>Revenue, pipeline and win rate by region</Page.Description>
      </Page.Header>
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
    <TestRouter
      path={path}
      contextTabs={[detailsTab]}
      page={<Content />}
      wrap={(outlet) => (
        <ShellProvider store={store} globalTabs={globalTabs}>
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
const sidebar = (s: SidebarInit): SidebarInit => ({ mode: 'expanded', isDocked: true, ...s });
const ctx = (s: ContextInit): ContextInit => ({ isOpen: false, isDocked: true, activeTab: 'details', ...s });

export const Expanded: Story = { args: { state: { sidebar: sidebar({}), contextBar: ctx({}) } } };
export const Compact: Story = {
  args: { state: { sidebar: sidebar({ mode: 'compact' }), contextBar: ctx({}) } },
};
export const SidebarClosed: Story = {
  args: { state: { sidebar: sidebar({ mode: 'closed' }), contextBar: ctx({}) } },
};
export const SidebarUndocked: Story = {
  args: { state: { sidebar: sidebar({ isDocked: false, isDrawerOpen: true }), contextBar: ctx({}) } },
};
export const ContextDocked: Story = {
  args: { state: { sidebar: sidebar({}), contextBar: ctx({ isOpen: true }) } },
};
export const ContextUndocked: Story = {
  args: { state: { sidebar: sidebar({}), contextBar: ctx({ isDocked: false, isDrawerOpen: true }) } },
};
export const BothCompactAndContext: Story = {
  args: {
    state: {
      sidebar: sidebar({ mode: 'compact' }),
      contextBar: ctx({ isOpen: true, activeTab: 'notifications' }),
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
