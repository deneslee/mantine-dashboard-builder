import { Button, Paper, SimpleGrid } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconRefresh } from '@tabler/icons-react';
import { AppError } from '@/lib/errors/AppError';
import { ErrorState } from './ErrorState';

const meta = { title: 'Errors/ErrorState' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const NotFound: Story = {
  render: () => (
    <ErrorState.Full
      code="404"
      title="This page doesn't exist"
      description="Nothing lives at /dashbords/sales. It may have been moved, or the link is wrong."
      actions={
        <>
          <Button variant="default" size="sm">
            Go back
          </Button>
          <Button size="sm">Dashboards</Button>
        </>
      }
    />
  ),
};

export const RouteError: Story = {
  render: () => (
    <ErrorState.Full
      title="Data source error"
      description="The data source for this dashboard did not respond in time."
      details={new AppError('datasource', 'Timeout after 30s')}
      actions={
        <Button size="sm" leftSection={<IconRefresh size={16} />}>
          Try again
        </Button>
      }
    />
  ),
};

export const Inline: Story = {
  render: () => (
    <SimpleGrid cols={2} p="lg" spacing="md">
      <Paper variant="widget" h={220}>
        <ErrorState.Inline
          title="Alarms: data source error"
          description='Haystack server returned 502 for query "equip and hvac".'
          actions={
            <Button size="xs" variant="default" leftSection={<IconRefresh size={14} />}>
              Retry
            </Button>
          }
        />
      </Paper>
      <Paper variant="widget" h={220}>
        <ErrorState.Inline
          title="Invalid data"
          description="Column “timestamp” is missing from the result."
        />
      </Paper>
    </SimpleGrid>
  ),
};

export const Banner: Story = {
  render: () => (
    <ErrorState.Banner
      title="You're offline"
      description="Showing cached data. Changes sync when the connection is back."
    />
  ),
};
