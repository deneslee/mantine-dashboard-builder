import { Button, Group, Text } from '@mantine/core';
import { useTimeout } from '@mantine/hooks';
import { useState } from 'react';

/** Appears after `after` ms of loading: says it's still working and offers Cancel. */
export function SlowHint({ after = 5000, onCancel }: { after?: number; onCancel?: () => void }) {
  const [slow, setSlow] = useState(false);
  useTimeout(() => setSlow(true), after, { autoInvoke: true });
  if (!slow) return null;
  return (
    <Group gap="xs" justify="center" py="xs">
      <Text size="xs" c="dimmed">
        Still loading…
      </Text>
      {onCancel ? (
        <Button size="compact-xs" variant="subtle" color="neutral" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </Group>
  );
}
