import { Portal } from '@mantine/core';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import type { PageTab } from '../ContextTab';
import { usePageTabStore } from './usePageTabs';

export interface ContextBarPanelProps extends PageTab {
  /** Rendered in the page's own tree: it keeps the page's state and context. */
  children: ReactNode;
}

/**
 * Adds a tab to the context bar while this component is mounted, and renders `children` as that
 * tab's panel. The content stays mounted while the bar is closed or shows another tab, like the
 * bar's other panels. To show it, call `useShellActions().openContextBar(id)`.
 */
export function ContextBarPanel({ id, label, icon, badge, children }: ContextBarPanelProps) {
  const store = usePageTabStore();
  const [host] = useState(() => document.createElement('div'));
  useLayoutEffect(
    () => store.register({ id, label, icon, badge, host }),
    [store, id, label, icon, badge, host],
  );
  return <Portal target={host}>{children}</Portal>;
}
