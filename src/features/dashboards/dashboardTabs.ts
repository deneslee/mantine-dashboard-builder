import { IconInfoCircle } from '@tabler/icons-react';
import { lazy } from 'react';
import type { ContextTab } from '@/shell/ContextTab';

/** Context-bar tabs declared by the dashboard route. */
export const dashboardTabs: ContextTab[] = [
  {
    id: 'details',
    label: 'Details',
    icon: IconInfoCircle,
    component: lazy(() => import('./DetailsPanel').then((m) => ({ default: m.DetailsTab }))),
  },
];
