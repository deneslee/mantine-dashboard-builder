import { Box, Group, Stack, Text, Title, type BoxProps } from '@mantine/core';
import type { ReactNode } from 'react';
import classes from './Page.module.css';

/** Content-area layout: a header row (title, description, actions) above a padded body. */

function Root({ children, ...rest }: BoxProps & { children: ReactNode }) {
  return (
    <Box className={classes.root} {...rest}>
      {children}
    </Box>
  );
}

interface HeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

function Header({ title, description, actions }: HeaderProps) {
  return (
    <Group className={classes.header} justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Stack gap={4} className={classes.heading}>
        <Title order={1}>{title}</Title>
        {description ? (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        ) : null}
      </Stack>
      {actions ? <Group gap="xs">{actions}</Group> : null}
    </Group>
  );
}

function Body({ children, ...rest }: BoxProps & { children: ReactNode }) {
  return (
    <Box className={classes.body} {...rest}>
      {children}
    </Box>
  );
}

export const Page = { Root, Header, Body };
