import { use } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { ShellContext } from '../context';
import { contextDocked, sidebarDocked } from '../store';
import type { ShellStore } from '../model/types';

function useShellStore<T>(selector: (s: ShellStore) => T): T {
  const store = use(ShellContext);
  if (!store) throw new Error('Shell hooks must be used inside <ShellProvider>');
  return useStore(store, selector);
}

export function useShellActions() {
  return useShellStore((s) => s.actions);
}

/** Derived sidebar state. Shallow-compared, so consumers only re-render when a value they read changes. */
export function useSidebar() {
  return useShellStore(
    useShallow((s) => {
      const docked = sidebarDocked(s);
      return {
        mode: s.sidebar.mode,
        width: s.sidebar.width,
        docked,
        prefersDocked: s.sidebar.docked,
        isCompact: docked && s.sidebar.mode === 'compact',
        /** Rendered as a docked pane. */
        isColumn: docked && s.sidebar.mode !== 'closed',
        /** Rendered as a Drawer over the content. */
        isOverlay: !docked && s.sidebar.drawerOpen,
        narrow: s.narrow,
      };
    }),
  );
}

export function useContextBar() {
  return useShellStore(
    useShallow((s) => {
      const docked = contextDocked(s);
      return {
        width: s.contextBar.width,
        activeTab: s.contextBar.activeTab,
        docked,
        prefersDocked: s.contextBar.docked,
        isColumn: docked && s.contextBar.open,
        isOverlay: !docked && s.contextBar.drawerOpen,
        /** Visible in either form. */
        open: docked ? s.contextBar.open : s.contextBar.drawerOpen,
      };
    }),
  );
}
