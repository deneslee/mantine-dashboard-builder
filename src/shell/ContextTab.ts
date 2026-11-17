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

/**
 * A tab a mounted page adds to the context bar while it is mounted. The page renders its content
 * (see `ContextBarPanel`), so there is no `component`. Keep `icon` and `badge` stable (module constants
 * or memoized), like route tabs.
 */
export interface PageTab {
  id: string;
  label: string;
  icon: Icon;
  badge?: TabBadge;
}

/** A page tab as the bar holds it: the tab plus the detached element its content is portalled into. */
export interface PageTabEntry extends PageTab {
  host: HTMLElement;
}
