import { Button, Group, Modal, Text } from '@mantine/core';
import { useBlocker } from '@tanstack/react-router';
import type { DashboardSearch } from '../dashboardSearch';
import { useDashboard } from '../state/useDashboard';

/**
 * Asks before leaving the dashboard, or edit mode, with unsaved changes; the browser asks on
 * reload and close. Mounted with the page, not the lazy editor, so it guards view mode too.
 */
export function LeaveDialog() {
  const isDirty = useDashboard((s) => s.isDirty);
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      isDirty && (current.pathname !== next.pathname || (next.search as DashboardSearch).mode !== 'edit'),
    enableBeforeUnload: isDirty,
    withResolver: true,
  });
  return (
    <Modal
      opened={blocker.status === 'blocked'}
      onClose={() => blocker.reset?.()}
      title="Leave with unsaved changes?"
      centered
    >
      <Text>Your draft is stored on this browser. Save or export it to keep a separate copy.</Text>
      <Group mt="md" justify="flex-end">
        <Button variant="default" onClick={() => blocker.reset?.()}>
          Keep editing
        </Button>
        <Button color="warning" onClick={() => blocker.proceed?.()}>
          Leave dashboard
        </Button>
      </Group>
    </Modal>
  );
}
