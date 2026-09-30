import { Box, Group, Text, Title, type BoxProps } from '@mantine/core';
import type { ComponentProps, ReactNode } from 'react';
import classes from './Page.module.css';

/**
 * Content-area layout. `Page.Header` is a grid with named areas and each part places itself, so a
 * page writes only the parts it needs, in reading order: breadcrumbs, title, description, actions,
 * control bar. `Page.Root` is a size container: the header restacks by the width of `<main>`, which
 * depends on the side panels, not on the viewport.
 */

export function PageRoot({ children, ...rest }: BoxProps & { children: ReactNode }) {
  return (
    <Box className={classes.root} {...rest}>
      {children}
    </Box>
  );
}

export function PageHeader({ children }: { children: ReactNode }) {
  return <div className={classes.header}>{children}</div>;
}

/** Holds the trail; `RouteBreadcrumbs` fills it from the router. */
export function PageBreadcrumbs({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className={classes.crumbs}>
      {children}
    </nav>
  );
}

/** The page's only `<h1>`. Wraps instead of truncating. */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <Title order={1} className={classes.title}>
      {children}
    </Title>
  );
}

export function PageDescription({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" c="dimmed" className={classes.description}>
      {children}
    </Text>
  );
}

export function PageActions({ children }: { children: ReactNode }) {
  return (
    <Group gap="xs" className={classes.actions}>
      {children}
    </Group>
  );
}

/**
 * A wrapping row of controls under the title (time range, refresh, filters). A `group`, so the
 * `aria-label` callers give it names the set for screen readers.
 */
export function PageControlBar({
  children,
  ...rest
}: Omit<ComponentProps<typeof Group>, 'className' | 'children'> & { children: ReactNode }) {
  return (
    <Group gap="xs" role="group" {...rest} className={classes.controls}>
      {children}
    </Group>
  );
}

export function PageBody({ children, ...rest }: BoxProps & { children: ReactNode }) {
  return (
    <Box className={classes.body} {...rest}>
      {children}
    </Box>
  );
}

export const Page = {
  Root: PageRoot,
  Header: PageHeader,
  Breadcrumbs: PageBreadcrumbs,
  Title: PageTitle,
  Description: PageDescription,
  Actions: PageActions,
  ControlBar: PageControlBar,
  Body: PageBody,
};
