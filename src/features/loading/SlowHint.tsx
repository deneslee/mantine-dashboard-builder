import { Button, Group, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

/** Appears after `after` ms of loading: says it's still working and offers Cancel. */
export function SlowHint({ after = 5000, onCancel }: { after?: number; onCancel?: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), after);
    return () => window.clearTimeout(t);
  }, [after]);
  if (!slow) return null;
  return (
    <Group gap="xs" justify="center" py="xs">
      <Text size="xs" c="dimmed">
        Still loading…
      </Text>
      {onCancel ? (
        <Button size="compact-xs" variant="subtle" color="gray" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </Group>
  );
}
