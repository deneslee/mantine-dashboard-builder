import type { Icon } from '@tabler/icons-react';
import {
  IconChartDots3,
  IconDatabase,
  IconLayoutDashboard,
  IconSettings,
  IconTemplate,
} from '@tabler/icons-react';

export interface NavItem {
  id: string;
  label: string;
  icon: Icon;
  to: string;
  children?: { id: string; label: string; to: string }[];
}

export interface NavGroup {
  id: string;
  /** Optional title above the items. The compact rail shows a short divider in its place. */
  label?: string;
  items: NavItem[];
}

/**
 * Sidebar navigation. `main` scrolls; `bottom` stays pinned above the sidebar footer.
 * Nested entries render as children of a NavLink, or as a flyout menu in the compact rail.
 */
export const nav: Record<'main' | 'bottom', NavGroup[]> = {
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
      ],
    },
  ],
  bottom: [
    {
      id: 'system',
      items: [{ id: 'settings', label: 'Settings', icon: IconSettings, to: '/settings' }],
    },
  ],
};

/** Top navbar area switcher. */
export const areas = [
  { value: 'dashboards', label: 'Dashboards', to: '/dashboards' },
  { value: 'datasources', label: 'Data sources', to: '/datasources' },
  { value: 'settings', label: 'Settings', to: '/settings' },
] as const;

export type AreaValue = (typeof areas)[number]['value'];
