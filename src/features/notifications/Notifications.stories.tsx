import { Button, Group, Paper } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { Inbox } from './components/Inbox';
import { notify } from '@/lib/notify/notify';
import { useInbox } from '@/stores/inbox';

const meta = { title: 'Notifications/Toasts and inbox' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Levels: Story = {
  render: () => (
    <Group p="lg" gap="xs">
      <Button variant="default" onClick={() => notify.success({ title: 'Dashboard saved' })}>
        Success
      </Button>
      <Button
        variant="default"
        onClick={() =>
          notify.info({ title: 'Layout reset', message: 'Widgets moved back to their default positions.' })
        }
      >
        Info
      </Button>
      <Button
        variant="default"
        onClick={() =>
          notify.warning({ title: 'Data source is slow', message: 'Showing cached data from 5 minutes ago.' })
        }
      >
        Warning
      </Button>
      <Button
        variant="default"
        onClick={() =>
          notify.error({
            title: 'Import failed',
            message: 'Invalid JSON at line 12.',
            action: { label: 'Retry', onClick: () => {} },
          })
        }
      >
        Error with action
      </Button>
    </Group>
  ),
};

function SeededInbox() {
  useEffect(() => {
    useInbox.setState({
      items: [
        {
          id: '1',
          level: 'error',
          title: 'Widget failed to load',
          message: 'Haystack returned 502.',
          source: 'Operations',
          at: Date.now() - 60_000,
          read: false,
          count: 3,
        },
        {
          id: '2',
          level: 'warning',
          title: 'Data source is slow',
          message: 'Showing cached data.',
          source: 'Datadog',
          at: Date.now() - 3_600_000,
          read: true,
          count: 1,
        },
      ],
    });
  }, []);
  return (
    <Paper variant="panel" w={360} m="lg">
      <Inbox />
    </Paper>
  );
}

export const InboxWithItems: Story = { render: () => <SeededInbox /> };
function EmptyInbox() {
  useEffect(() => {
    useInbox.setState({ items: [] });
  }, []);
  return (
    <Paper variant="panel" w={360} m="lg">
      <Inbox />
    </Paper>
  );
}

export const InboxEmpty: Story = { render: () => <EmptyInbox /> };
