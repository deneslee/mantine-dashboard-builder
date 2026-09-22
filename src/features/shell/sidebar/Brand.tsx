import { Group, Text } from '@mantine/core';
import { appName } from '@/shared/config';
import classes from './Brand.module.css';

/** Product mark: a small grid of tiles, the thing the product makes. Name comes from config. */
export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Group gap="sm" wrap="nowrap" className={classes.root} aria-label={appName}>
      <span className={classes.mark} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {compact ? null : (
        <Text component="span" fw={600} size="sm" className={classes.name}>
          {appName}
        </Text>
      )}
    </Group>
  );
}
