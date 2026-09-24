import { IconInfoCircle, IconLayoutGridAdd } from '@tabler/icons-react';
import { lazy } from 'react';
import type { ContextTab } from '@/components/layouts/shell';

/** Context-bar tabs declared by the dashboard route. */
export const dashboardTabs: ContextTab[] = [
  {
    id: 'details',
    label: 'Details',
    icon: IconInfoCircle,
    component: lazy(() => import('./components/DetailsTab').then((m) => ({ default: m.DetailsTab }))),
  },
  {
    id: 'widgets',
    label: 'Widgets',
    icon: IconLayoutGridAdd,
    component: lazy(() => import('./components/WidgetsTab').then((m) => ({ default: m.WidgetsTab }))),
  },
];
