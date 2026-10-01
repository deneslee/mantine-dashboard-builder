import { createContext, use } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { ContextTab } from './ContextTab';
import { contextDocked, sidebarDocked, type ShellStore, type ShellStoreApi } from './createShellStore';
import type { Nav } from './Nav';

/** The frame's store plus the static values the app hands the shell. Set by `ShellProvider`. */
export const ShellContext = createContext<{
  store: ShellStoreApi;
  nav: Nav;
  globalTabs: ContextTab[];
} | null>(null);

function useShellContext() {
  const shell = use(ShellContext);
  if (!shell) throw new Error('Shell hooks must be used inside <ShellProvider>');
  return shell;
}

function useShellStore<T>(selector: (s: ShellStore) => T): T {
  return useStore(useShellContext().store, selector);
}

/** The app's navigation (`app/nav.ts`). */
export const useNav = () => useShellContext().nav;

/** Context-bar tabs shown on every route, after the route's own. */
export const useGlobalTabs = () => useShellContext().globalTabs;

export function useShellActions() {
  return useShellStore((s) => s.actions);
}

/** Derived sidebar state. Shallow-compared, so consumers only re-render when a value they read changes. */
export function useSidebar() {
  return useShellStore(
    useShallow((s) => {
      const isDocked = sidebarDocked(s);
      return {
        mode: s.sidebar.mode,
        burger: s.sidebar.burger,
        width: s.sidebar.width,
        isDocked,
        isDockPreferred: s.sidebar.isDocked,
        isCompact: isDocked && s.sidebar.mode === 'compact',
        /** Rendered as a docked pane. */
        isColumn: isDocked && s.sidebar.mode !== 'closed',
        /** Rendered as a Drawer over the content. */
        isOverlay: !isDocked && s.sidebar.isDrawerOpen,
        isNarrow: s.isNarrow,
      };
    }),
  );
}

export function useContextBar() {
  return useShellStore(
    useShallow((s) => {
      const isDocked = contextDocked(s);
      return {
        width: s.contextBar.width,
        activeTab: s.contextBar.activeTab,
        isDocked,
        isDockPreferred: s.contextBar.isDocked,
        isColumn: isDocked && s.contextBar.isOpen,
        isOverlay: !isDocked && s.contextBar.isDrawerOpen,
        /** Visible in either form. */
        isOpen: isDocked ? s.contextBar.isOpen : s.contextBar.isDrawerOpen,
      };
    }),
  );
}
