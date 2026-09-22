import { IconBell } from '@tabler/icons-react';
import { lazy } from 'react';
import type { ContextTab } from '@/features/shell';
import { selectUnread, useInbox } from './store';

/** Global context-bar tab, appended to every route's tabs. */
export const notificationsTab: ContextTab = {
  id: 'notifications',
  label: 'Notifications',
  icon: IconBell,
  component: lazy(() => import('./components/Inbox').then((m) => ({ default: m.Inbox }))),
  badge: {
    subscribe: (onChange) => useInbox.subscribe(onChange),
    getSnapshot: () => selectUnread(useInbox.getState()),
  },
};
