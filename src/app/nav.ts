import {
  IconChartDots3,
  IconDatabase,
  IconLayoutDashboard,
  IconPlugConnected,
  IconSettings,
  IconTemplate,
} from '@tabler/icons-react';
import type { Nav } from '@/shell/Nav';

/** The app's routes as the shell shows them: sidebar groups, and the navbar's area switcher. */
export const nav: Nav = {
  main: [
    {
      id: 'main',
      items: [
        {
          id: 'dashboards',
          label: 'Dashboards',
          icon: IconLayoutDashboard,
          to: '/dashboards',
          children: [
            { id: 'all', label: 'All dashboards', to: '/dashboards' },
            { id: 'sales', label: 'Sales overview', to: '/dashboards/sales' },
            { id: 'ops', label: 'Operations', to: '/dashboards/ops' },
          ],
        },
        { id: 'templates', label: 'Templates', icon: IconTemplate, to: '/templates' },
        { id: 'datasources', label: 'Data sources', icon: IconDatabase, to: '/datasources' },
        { id: 'explore', label: 'Explore', icon: IconChartDots3, to: '/explore' },
        { id: 'integrations', label: 'Integrations', icon: IconPlugConnected, to: '/integrations' },
      ],
    },
  ],
  bottom: [
    {
      id: 'system',
      items: [{ id: 'settings', label: 'Settings', icon: IconSettings, to: '/settings' }],
    },
  ],
  areas: [
    { value: 'dashboards', label: 'Dashboards', to: '/dashboards' },
    { value: 'datasources', label: 'Data sources', to: '/datasources' },
    { value: 'integrations', label: 'Integrations', to: '/integrations' },
    { value: 'settings', label: 'Settings', to: '/settings' },
  ],
};
