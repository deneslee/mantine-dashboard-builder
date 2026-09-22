import { EmptyState } from '@mantine/core';
import { IconLayoutGridAdd } from '@tabler/icons-react';

/** Context-bar tab: widget palette. Drag-to-add arrives with the builder in phase 3. */
export function WidgetsTab() {
  return (
    <EmptyState
      p="lg"
      size="sm"
      variant="light"
      icon={<IconLayoutGridAdd size={20} stroke={1.75} />}
      title="Widget palette"
      description="Header, chart, table, panel group, markdown and nodes. Drag onto the grid once the builder lands."
    />
  );
}
