import { ActionIcon, Badge, Button, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { useTimeout } from '@mantine/hooks';
import { IconAlertTriangle, IconBellOff, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useShallow } from 'zustand/shallow';
import { useInbox } from '@/stores/inbox';
import { fontWeight, iconSize, iconStroke } from '@/design-system/tokens/semantic';
import classes from './Inbox.module.css';

dayjs.extend(relativeTime);

/** Context-bar tab: persisted warnings and errors, newest first. */
export function Inbox() {
  const { items, markAllRead, dismiss, clear } = useInbox(
    useShallow((s) => ({
      items: s.items,
      markAllRead: s.markAllRead,
      dismiss: s.dismiss,
      clear: s.clear,
    })),
  );

  const unread = items.filter((i) => !i.read).length;

  // The tab is hidden with React Activity, so this runs each time it becomes visible.
  const { start: startReadTimer, clear: clearReadTimer } = useTimeout(markAllRead, 1500);
  useEffect(() => {
    if (!unread) return;
    startReadTimer();
    return clearReadTimer;
  }, [unread, startReadTimer, clearReadTimer]);

  if (items.length === 0) {
    return (
      <Stack align="center" gap="xs" p="xl" className={classes.empty}>
        <ThemeIcon variant="light" color="neutral" size="xl" radius="xl">
          <IconBellOff size={iconSize.lg} stroke={iconStroke} />
        </ThemeIcon>
        <Text size="sm" fw={fontWeight.medium}>
          No notifications
        </Text>
        <Text size="xs" c="dimmed" ta="center" maw={220}>
          Warnings and errors from dashboards and data sources show up here.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={0}>
      <Group justify="space-between" px="sm" py="xs" className={classes.toolbar}>
        <Text size="xs" c="dimmed">
          {unread ? `${unread} unread` : 'All read'}
        </Text>
        <Group gap="2xs">
          <Button size="compact-xs" variant="subtle" onClick={markAllRead} disabled={!unread}>
            Mark all read
          </Button>
          <Button size="compact-xs" variant="subtle" color="danger" onClick={clear}>
            Clear all
          </Button>
        </Group>
      </Group>

      <Stack gap={0} component="ul" className={classes.list}>
        {items.map((item) => (
          <li
            key={item.id}
            className={classes.item}
            data-unread={!item.read || undefined}
            data-level={item.level}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon
                variant="light"
                color={item.level === 'error' ? 'red' : 'yellow'}
                size="md"
                radius="xl"
                mt="3xs"
              >
                {item.level === 'error' ? (
                  <IconX size={iconSize.xs} />
                ) : (
                  <IconAlertTriangle size={iconSize.xs} />
                )}
              </ThemeIcon>

              <Stack gap="3xs" className={classes.body}>
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={item.read ? 400 : 600} lineClamp={1}>
                    {item.title}
                  </Text>
                  {item.count > 1 ? (
                    <Badge size="xs" variant="light" color="neutral">
                      ×{item.count}
                    </Badge>
                  ) : null}
                </Group>
                {item.message ? (
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {item.message}
                  </Text>
                ) : null}
                <Text size="xs" c="dimmed">
                  {item.source ? `${item.source} · ` : ''}
                  {dayjs(item.at).fromNow()}
                </Text>
              </Stack>

              <Tooltip label="Dismiss">
                <ActionIcon size="sm" aria-label={`Dismiss ${item.title}`} onClick={() => dismiss(item.id)}>
                  <IconX size={iconSize.xs} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </li>
        ))}
      </Stack>
    </Stack>
  );
}
