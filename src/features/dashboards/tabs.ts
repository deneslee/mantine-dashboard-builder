import { IconInfoCircle } from '@tabler/icons-react';
import { lazy } from 'react';
import type { ContextTab } from '@/components/layouts/shell/model/contextTabs';

/** Context-bar tabs declared by the dashboard route. */
export const dashboardTabs: ContextTab[] = [
  {
    id: 'details',
    label: 'Details',
    icon: IconInfoCircle,
    component: lazy(() => import('./components/DetailsTab').then((m) => ({ default: m.DetailsTab }))),
  },
];
