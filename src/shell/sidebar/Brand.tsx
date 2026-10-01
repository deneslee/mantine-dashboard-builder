import { Group, Text } from '@mantine/core';
import { fontWeight } from '@/ui/tokens/semantic';
import classes from './Brand.module.css';

/** Product name shown in the sidebar. */
const APP_NAME = 'Dashboard Builder';

/**
 * Product mark: a small grid of tiles, the thing the product makes.
 * The name fades out on the compact sidebar rail; the mark stays where it is.
 */
export function Brand() {
  return (
    <Group gap="sm" wrap="nowrap" className={classes.root} aria-label={APP_NAME}>
      <span className={classes.mark} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <Text component="span" fw={fontWeight.medium} size="sm" className={classes.name}>
        {APP_NAME}
      </Text>
    </Group>
  );
}
