import { Group, Text } from '@mantine/core';
import { appName } from '@/config/config';
import { fontWeight } from '@/ui/tokens/semantic';
import classes from './Brand.module.css';

/**
 * Product mark: a small grid of tiles, the thing the product makes. Name comes from config.
 * The name fades out on the compact sidebar rail; the mark stays where it is.
 */
export function Brand() {
  return (
    <Group gap="sm" wrap="nowrap" className={classes.root} aria-label={appName}>
      <span className={classes.mark} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <Text component="span" fw={fontWeight.medium} size="sm" className={classes.name}>
        {appName}
      </Text>
    </Group>
  );
}
