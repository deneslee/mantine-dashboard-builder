import { Alert, Button, Code, Collapse, EmptyState, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle, IconChevronDown } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import classes from './ErrorState.module.css';

/**
 * One visual language for every error. Three explicit variants, chosen by the parent:
 *   ErrorState.Full   — takes the content area (404, route error, crash)
 *   ErrorState.Inline — fills a card or widget tile
 *   ErrorState.Banner — strip above content (offline, degraded)
 * Full and Inline are Mantine `EmptyState`; Banner is Mantine `Alert`.
 */

interface CommonProps {
  title: string;
  description?: ReactNode;
  icon?: Icon;
  /** Mantine Buttons wired to a real recovery (refetch, invalidate, reset). */
  actions?: ReactNode;
  /** Technical detail, shown collapsed and only in dev builds. */
  details?: unknown;
  children?: ReactNode;
}

export function ErrorFull({
  title,
  description,
  icon: IconCmp = IconAlertTriangle,
  actions,
  details,
  children,
  code,
}: CommonProps & { code?: string }) {
  return (
    <EmptyState
      className={classes.full}
      size="lg"
      color="danger"
      // A status code replaces the icon, so it gets no colored disc.
      variant={code ? undefined : 'light'}
      icon={
        code ? (
          <span className={classes.code} aria-hidden="true">
            {code}
          </span>
        ) : (
          <IconCmp stroke={iconStroke} />
        )
      }
      role="alert"
    >
      <EmptyState.Title order={2}>{title}</EmptyState.Title>
      {description ? <EmptyState.Description>{description}</EmptyState.Description> : null}
      {children}
      {actions ? <EmptyState.Actions>{actions}</EmptyState.Actions> : null}
      <Details details={details} />
    </EmptyState>
  );
}

export function ErrorInline({
  title,
  description,
  icon: IconCmp = IconAlertTriangle,
  actions,
  details,
  children,
}: CommonProps) {
  return (
    <EmptyState
      className={classes.inline}
      classNames={{ description: classes.clamp }}
      size="sm"
      color="danger"
      variant="light"
      icon={<IconCmp stroke={iconStroke} />}
      title={title}
      description={description}
      role="alert"
    >
      {children}
      {actions ? <EmptyState.Actions>{actions}</EmptyState.Actions> : null}
      <Details details={details} />
    </EmptyState>
  );
}

export function ErrorBanner({
  title,
  description,
  icon: IconCmp = IconAlertTriangle,
  actions,
  color = 'warning',
}: CommonProps & { color?: string }) {
  return (
    <Alert
      className={classes.banner}
      color={color}
      radius={0}
      icon={<IconCmp size={iconSize.md} stroke={iconStroke} />}
      title={title}
      role="status"
    >
      <Group justify="space-between" gap="sm" wrap="nowrap">
        {description ? <Text size="sm">{description}</Text> : <span />}
        {actions ? <Group gap="xs">{actions}</Group> : null}
      </Group>
    </Alert>
  );
}

function Details({ details }: { details: unknown }) {
  const [opened, { toggle }] = useDisclosure(false);
  if (!import.meta.env.DEV || details === undefined || details === null) return null;
  const text =
    details instanceof Error
      ? `${details.name}: ${details.message}\n${details.stack ?? ''}`
      : JSON.stringify(details, null, 2);
  return (
    <Stack gap="2xs" align="center" w="100%" maw={560}>
      <Button
        size="compact-xs"
        variant="subtle"
        color="neutral"
        onClick={toggle}
        rightSection={
          <IconChevronDown size={iconSize.xs} className={classes.chevron} data-open={opened || undefined} />
        }
      >
        {opened ? 'Hide details' : 'Show details'}
      </Button>
      <Collapse expanded={opened} w="100%">
        <Code block className={classes.details}>
          {text}
        </Code>
      </Collapse>
    </Stack>
  );
}

export const ErrorState = { Full: ErrorFull, Inline: ErrorInline, Banner: ErrorBanner };
