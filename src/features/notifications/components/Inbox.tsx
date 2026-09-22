import { ActionIcon, Badge, Button, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconBellOff, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useShallow } from 'zustand/shallow';
import { useInbox } from '../store';
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
  useEffect(() => {
    if (!unread) return;
    const t = window.setTimeout(markAllRead, 1500);
    return () => window.clearTimeout(t);
  }, [unread, markAllRead]);

  if (items.length === 0) {
    return (
      <Stack align="center" gap="xs" p="xl" className={classes.empty}>
        <ThemeIcon variant="light" color="gray" size="xl" radius="xl">
          <IconBellOff size={20} stroke={1.75} />
        </ThemeIcon>
        <Text size="sm" fw={500}>
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
        <Group gap={4}>
          <Button size="compact-xs" variant="subtle" onClick={markAllRead} disabled={!unread}>
            Mark all read
          </Button>
          <Button size="compact-xs" variant="subtle" color="red" onClick={clear}>
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
                mt={2}
              >
                {item.level === 'error' ? <IconX size={14} /> : <IconAlertTriangle size={14} />}
              </ThemeIcon>

              <Stack gap={2} className={classes.body}>
                <Group gap={6} wrap="nowrap">
                  <Text size="sm" fw={item.read ? 400 : 600} lineClamp={1}>
                    {item.title}
                  </Text>
                  {item.count > 1 ? (
                    <Badge size="xs" variant="light" color="gray">
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
                  <IconX size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </li>
        ))}
      </Stack>
    </Stack>
  );
}
