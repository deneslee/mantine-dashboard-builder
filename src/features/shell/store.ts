import { clamp } from '@mantine/hooks';
import { persist } from 'zustand/middleware';
import { createStore, type StateCreator } from 'zustand/vanilla';
import { tokens } from '@/design-system/tokens/tokens';
import type { BurgerBehavior, PersistedShell, ShellState, ShellStore, SidebarMode } from './model/types';

const { sidebar: sb, contextBar: cb } = tokens.shell;

export const STORAGE_KEY = 'shell.v1';
/** Mantine's default `md` breakpoint; below it both panels are overlays. */
export const NARROW_QUERY = '(max-width: 61.99em)';

const initialNarrow = () => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_QUERY).matches;

export const initialShellState = (): ShellState => ({
  sidebar: { mode: 'expanded', burger: 'compact', docked: true, width: sb.expanded, drawerOpen: false },
  contextBar: { open: false, docked: true, width: cb.default, activeTab: null, drawerOpen: false },
  narrow: initialNarrow(),
});

const cycle: Record<SidebarMode, SidebarMode> = {
  expanded: 'compact',
  compact: 'closed',
  closed: 'expanded',
};

/**
 * Where the burger takes a docked sidebar.
 * - `compact`: expanded ↔ compact
 * - `hide`:    expanded ↔ closed
 * - `cycle`:   expanded → compact → closed → expanded
 * From any collapsed state the two-state behaviours go back to expanded.
 */
export function nextSidebarMode(mode: SidebarMode, burger: BurgerBehavior): SidebarMode {
  if (burger === 'cycle') return cycle[mode];
  if (mode !== 'expanded') return 'expanded';
  return burger === 'hide' ? 'closed' : 'compact';
}

/** Effective docking: the preference, unless the viewport forces overlays. */
export const sidebarDocked = (s: ShellState) => s.sidebar.docked && !s.narrow;
export const contextDocked = (s: ShellState) => s.contextBar.docked && !s.narrow;

export type ShellInit = {
  sidebar?: Partial<ShellState['sidebar']>;
  contextBar?: Partial<ShellState['contextBar']>;
  narrow?: boolean;
};

/**
 * Factory so tests and stories get an isolated store; the app creates one in ShellProvider.
 * `persisted: false` skips localStorage (stories, tests).
 */
export function createShellStore(init?: ShellInit, persisted = true) {
  const base = initialShellState();
  const start: ShellState = {
    sidebar: { ...base.sidebar, ...init?.sidebar },
    contextBar: { ...base.contextBar, ...init?.contextBar },
    narrow: init?.narrow ?? base.narrow,
  };

  const creator: StateCreator<ShellStore> = (set, get) => {
    const setSidebar = (patch: Partial<ShellState['sidebar']>) =>
      set((s) => ({ sidebar: { ...s.sidebar, ...patch } }));
    const setContext = (patch: Partial<ShellState['contextBar']>) =>
      set((s) => ({ contextBar: { ...s.contextBar, ...patch } }));

    return {
      ...start,
      actions: {
        toggleSidebar: () => {
          const s = get();
          if (sidebarDocked(s)) setSidebar({ mode: nextSidebarMode(s.sidebar.mode, s.sidebar.burger) });
          else setSidebar({ drawerOpen: !s.sidebar.drawerOpen });
        },
        closeSidebar: () =>
          sidebarDocked(get()) ? setSidebar({ mode: 'closed' }) : setSidebar({ drawerOpen: false }),
        setSidebarMode: (mode) => setSidebar({ mode }),
        setBurgerBehavior: (burger) => setSidebar({ burger }),
        setSidebarWidth: (width) => setSidebar({ width: clamp(Math.round(width), sb.min, sb.max) }),
        setSidebarDocked: (docked) => {
          const { mode } = get().sidebar;
          // Docking shows the column; undocking keeps the sidebar visible as a drawer.
          if (docked) setSidebar({ docked, drawerOpen: false, mode: mode === 'closed' ? 'expanded' : mode });
          else setSidebar({ docked, drawerOpen: true });
        },

        toggleContextBar: () => {
          const s = get();
          if (contextDocked(s)) setContext({ open: !s.contextBar.open });
          else setContext({ drawerOpen: !s.contextBar.drawerOpen });
        },
        openContextBar: (tab) => {
          const s = get();
          const activeTab = tab ?? s.contextBar.activeTab;
          if (contextDocked(s)) setContext({ open: true, activeTab });
          else setContext({ drawerOpen: true, activeTab });
        },
        closeContextBar: () =>
          contextDocked(get()) ? setContext({ open: false }) : setContext({ drawerOpen: false }),
        setContextBarWidth: (width) => setContext({ width: clamp(Math.round(width), cb.min, cb.max) }),
        setContextBarDocked: (docked) =>
          docked
            ? setContext({ docked, open: true, drawerOpen: false })
            : setContext({ docked, drawerOpen: true }),
        setActiveTab: (activeTab) => setContext({ activeTab }),

        setNarrow: (narrow) => {
          if (get().narrow === narrow) return;
          // Crossing the breakpoint closes drawers; docked columns follow the stored preference.
          set((s) => ({
            narrow,
            sidebar: { ...s.sidebar, drawerOpen: false },
            contextBar: { ...s.contextBar, drawerOpen: false },
          }));
        },
      },
    };
  };

  if (!persisted) return createStore<ShellStore>()(creator);

  return createStore<ShellStore>()(
    persist(creator, {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s): PersistedShell => ({
        sidebar: {
          mode: s.sidebar.mode,
          burger: s.sidebar.burger,
          docked: s.sidebar.docked,
          width: s.sidebar.width,
        },
        contextBar: {
          open: s.contextBar.open,
          docked: s.contextBar.docked,
          width: s.contextBar.width,
          activeTab: s.contextBar.activeTab,
        },
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedShell>;
        return {
          ...current,
          sidebar: { ...current.sidebar, ...p.sidebar, drawerOpen: false },
          contextBar: { ...current.contextBar, ...p.contextBar, drawerOpen: false },
        };
      },
    }),
  );
}

export type ShellStoreApi = ReturnType<typeof createShellStore>;

// Dev only. ShellProvider keeps its store in state, and Fast Refresh preserves that state, so a hot
// update here would leave the running app on the old store (old actions, missing new ones).
// Reload instead of patching in place.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
