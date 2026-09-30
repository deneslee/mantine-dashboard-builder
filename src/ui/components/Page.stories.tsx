import { ActionIcon, Anchor, Box, Breadcrumbs, Button, Select, Stack, Text } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconRefresh } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Page } from './Page';

const meta = { title: 'Design system/Page' } satisfies Meta;
export default meta;
type Story = StoryObj;

// Static crumbs: the app renders them with RouteBreadcrumbs, which needs the router.
const crumbs = (
  <Page.Breadcrumbs>
    <Breadcrumbs>
      <Anchor href="#" size="sm">
        Dashboards
      </Anchor>
      <Text span size="sm" aria-current="page">
        Sales overview
      </Text>
    </Breadcrumbs>
  </Page.Breadcrumbs>
);

const actions = (
  <Page.Actions>
    <Button variant="default" size="sm">
      Share
    </Button>
    <ActionIcon variant="default" size="lg" aria-label="Refresh all widgets">
      <IconRefresh size={18} stroke={1.75} />
    </ActionIcon>
  </Page.Actions>
);

const controls = (
  <Page.ControlBar aria-label="Dashboard controls">
    <Select size="xs" aria-label="Time range" defaultValue="24h" data={['1h', '24h', '7d']} w={140} />
    <Select size="xs" aria-label="Refresh" defaultValue="off" data={['off', '30s', '1m']} w={100} />
    <Button size="xs" variant="subtle">
      Region: all
    </Button>
  </Page.ControlBar>
);

const body = (
  <Page.Body>
    <Text c="dimmed">Page body</Text>
  </Page.Body>
);

function FullPage() {
  return (
    <Page.Root>
      <Page.Header>
        {crumbs}
        <Page.Title>Sales overview</Page.Title>
        <Page.Description>Revenue, pipeline and win rate by region</Page.Description>
        {actions}
        {controls}
      </Page.Header>
      {body}
    </Page.Root>
  );
}

export const Minimal: Story = {
  render: () => (
    <Page.Root>
      <Page.Header>
        <Page.Title>Settings</Page.Title>
      </Page.Header>
      {body}
    </Page.Root>
  ),
};

export const Standard: Story = {
  render: () => (
    <Page.Root>
      <Page.Header>
        {crumbs}
        <Page.Title>Sales overview</Page.Title>
        <Page.Description>Revenue, pipeline and win rate by region</Page.Description>
        {actions}
      </Page.Header>
      {body}
    </Page.Root>
  ),
};

export const Full: Story = { render: () => <FullPage /> };

/** The header restacks by the width of its container, not the viewport. */
export const NarrowContainer: Story = {
  // Three copies of the page side by side repeat the breadcrumb landmark on purpose.
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: false },
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
  },
  render: () => (
    <Stack gap="lg">
      {[375, 768, 1280].map((width) => (
        <Frame key={width} width={width}>
          <FullPage />
        </Frame>
      ))}
    </Stack>
  ),
};

function Frame({ width, children }: { width: number; children: ReactNode }) {
  return (
    <Box w={width} style={{ border: '1px dashed var(--app-color-border-default)' }}>
      <Text size="xs" c="dimmed" px="xs">
        {width} px
      </Text>
      {children}
    </Box>
  );
}
