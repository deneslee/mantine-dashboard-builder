import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import type { NotifyInput, NotifyLevel } from './types';
import { ActionMessage } from './ActionMessage';
import { inboxLevels, useInbox } from '@/stores/inbox';

const config: Record<
  NotifyLevel,
  { color: string; autoClose: number | false; icon: typeof IconCheck; priority: number }
> = {
  success: { color: 'teal', autoClose: 4000, icon: IconCheck, priority: 0 },
  info: { color: 'blue', autoClose: 5000, icon: IconInfoCircle, priority: 0 },
  warning: { color: 'yellow', autoClose: 8000, icon: IconAlertTriangle, priority: 1 },
  error: { color: 'red', autoClose: false, icon: IconX, priority: 2 },
};

const DEDUPE_WINDOW = 10_000;
const recent = new Map<string, { id: string; at: number }>();

function show(level: NotifyLevel, input: NotifyInput): string {
  const { color, autoClose, icon: Icon, priority } = config[level];
  const key = input.dedupeKey ?? `${level}:${input.title}`;
  const now = Date.now();
  const prev = recent.get(key);
  const id = prev && now - prev.at < DEDUPE_WINDOW ? prev.id : crypto.randomUUID();

  const data = {
    id,
    title: input.title,
    message: input.action ? (
      <ActionMessage message={input.message} action={input.action} id={id} />
    ) : (
      input.message
    ),
    color,
    icon: <Icon size={18} stroke={2} />,
    autoClose: input.autoClose ?? autoClose,
    withCloseButton: true,
    priority,
    // Errors and warnings interrupt; success and info announce politely.
    role: level === 'error' || level === 'warning' ? 'alert' : 'status',
  } as const;

  if (prev && prev.id === id) notifications.update(data);
  else notifications.show(data);

  recent.set(key, { id, at: now });

  if (inboxLevels.includes(level)) {
    useInbox
      .getState()
      .add({ level, title: input.title, message: input.message, source: input.source, dedupeKey: key });
  }
  return id;
}

export interface ProgressHandle {
  update: (title: string, message?: string) => void;
  done: (title: string, message?: string) => void;
  fail: (title: string, message?: string) => void;
}

/** One toast for a long operation, updated in place. */
function progress(title: string, message?: string): ProgressHandle {
  const id = notifications.show({ title, message, loading: true, autoClose: false, withCloseButton: false });
  return {
    update: (t, m) => notifications.update({ id, title: t, message: m, loading: true, autoClose: false }),
    done: (t, m) =>
      notifications.update({
        id,
        title: t,
        message: m,
        loading: false,
        color: 'teal',
        icon: <IconCheck size={18} stroke={2} />,
        autoClose: 4000,
        withCloseButton: true,
      }),
    fail: (t, m) =>
      notifications.update({
        id,
        title: t,
        message: m,
        loading: false,
        color: 'red',
        icon: <IconX size={18} stroke={2} />,
        autoClose: false,
        withCloseButton: true,
      }),
  };
}

/** The only entry point features use. Nothing calls `notifications.show` directly. */
export const notify = {
  success: (input: NotifyInput) => show('success', input),
  info: (input: NotifyInput) => show('info', input),
  warning: (input: NotifyInput) => show('warning', input),
  error: (input: NotifyInput) => show('error', input),
  progress,
  hide: (id: string) => notifications.hide(id),
  clean: () => notifications.clean(),
};
