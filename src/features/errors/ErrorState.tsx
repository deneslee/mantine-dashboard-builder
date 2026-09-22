import { Alert, Button, Code, Collapse, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle, IconChevronDown } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import classes from './ErrorState.module.css';

/**
 * One visual language for every error. Three explicit variants, chosen by the parent:
 *   ErrorState.Full   — takes the content area (404, route error, crash)
 *   ErrorState.Inline — fills a card or widget tile
 *   ErrorState.Banner — strip above content (offline, degraded)
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
    <Stack className={classes.full} align="center" justify="center" gap="md" role="alert">
      {code ? (
        <Text className={classes.code} aria-hidden="true">
          {code}
        </Text>
      ) : (
        <ThemeIcon variant="light" color="red" size={48} radius="xl">
          <IconCmp size={24} stroke={1.75} />
        </ThemeIcon>
      )}
      <Stack gap={6} align="center" maw={440}>
        <Title order={2} ta="center">
          {title}
        </Title>
        {description ? (
          <Text c="dimmed" ta="center" size="sm">
            {description}
          </Text>
        ) : null}
      </Stack>
      {children}
      {actions ? <Group gap="sm">{actions}</Group> : null}
      <Details details={details} />
    </Stack>
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
    <Stack className={classes.inline} align="center" justify="center" gap="xs" role="alert">
      <ThemeIcon variant="light" color="red" size="lg" radius="xl">
        <IconCmp size={18} stroke={1.75} />
      </ThemeIcon>
      <Text size="sm" fw={600} ta="center">
        {title}
      </Text>
      {description ? (
        <Text size="xs" c="dimmed" ta="center" lineClamp={3} maw={320}>
          {description}
        </Text>
      ) : null}
      {children}
      {actions ? <Group gap="xs">{actions}</Group> : null}
      <Details details={details} />
    </Stack>
  );
}

export function ErrorBanner({
  title,
  description,
  icon: IconCmp = IconAlertTriangle,
  actions,
  color = 'yellow',
}: CommonProps & { color?: string }) {
  return (
    <Alert
      className={classes.banner}
      color={color}
      radius={0}
      icon={<IconCmp size={18} stroke={1.75} />}
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
    <Stack gap={4} align="center" w="100%" maw={560}>
      <Button
        size="compact-xs"
        variant="subtle"
        color="gray"
        onClick={toggle}
        rightSection={
          <IconChevronDown size={12} className={classes.chevron} data-open={opened || undefined} />
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
