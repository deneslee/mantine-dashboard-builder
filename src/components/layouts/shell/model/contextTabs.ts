import type { Icon } from '@tabler/icons-react';
import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * A tab in the context bar. Routes declare theirs in `staticData.contextTabs`;
 * tabs shown on every route (notifications) come from `ShellProvider`'s `globalTabs`.
 */
export interface ContextTab {
  id: string;
  label: string;
  icon: Icon;
  component: LazyExoticComponent<ComponentType> | ComponentType;
  /** Optional attention count (external store), shown on the tab and summed on the navbar button. */
  badge?: TabBadge;
}

export interface TabBadge {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => number;
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    contextTabs?: ContextTab[];
  }
}
