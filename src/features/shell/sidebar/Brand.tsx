import { Group, Text } from '@mantine/core';
import { appName } from '@/shared/config';
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
      <Text component="span" fw={600} size="sm" className={classes.name}>
        {appName}
      </Text>
    </Group>
  );
}
