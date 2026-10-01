import { IconBell } from '@tabler/icons-react';
import { lazy } from 'react';
import type { ContextTab } from '@/shell/ContextTab';
import { selectUnread, useInbox } from '@/lib/notify/useInbox';

/** Global context-bar tab, appended to every route's tabs. */
export const notificationsTab: ContextTab = {
  id: 'notifications',
  label: 'Notifications',
  icon: IconBell,
  component: lazy(() => import('./InboxPanel').then((m) => ({ default: m.InboxPanel }))),
  badge: {
    subscribe: (onChange) => useInbox.subscribe(onChange),
    getSnapshot: () => selectUnread(useInbox.getState()),
  },
};
