import { clamp } from '@mantine/hooks';
import { persist } from 'zustand/middleware';
import { createStore, type StateCreator } from 'zustand/vanilla';
import { dimensions } from '@/ui/tokens/dimensions';
import type { BurgerBehavior, PersistedShell, ShellState, ShellStore, SidebarMode } from './types';

const { sidebar: sb, contextBar: cb } = dimensions.shell;

export const STORAGE_KEY = 'shell.v1';
/** Mantine's default `md` breakpoint; below it both panels are overlays. */
export const NARROW_QUERY = '(max-width: 61.99em)';

const initialNarrow = () => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_QUERY).matches;

export const initialShellState = (): ShellState => ({
  sidebar: { mode: 'expanded', burger: 'compact', isDocked: true, width: sb.expanded, isDrawerOpen: false },
  contextBar: { isOpen: false, isDocked: true, width: cb.default, activeTab: null, isDrawerOpen: false },
  isNarrow: initialNarrow(),
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
export const sidebarDocked = (s: ShellState) => s.sidebar.isDocked && !s.isNarrow;
export const contextDocked = (s: ShellState) => s.contextBar.isDocked && !s.isNarrow;

export type ShellInit = {
  sidebar?: Partial<ShellState['sidebar']>;
  contextBar?: Partial<ShellState['contextBar']>;
  isNarrow?: boolean;
};

/**
 * Factory so tests and stories get an isolated store; the app creates one in ShellProvider.
 * `shouldPersist: false` skips localStorage (stories, tests).
 */
export function createShellStore(init?: ShellInit, shouldPersist = true) {
  const base = initialShellState();
  const start: ShellState = {
    sidebar: { ...base.sidebar, ...init?.sidebar },
    contextBar: { ...base.contextBar, ...init?.contextBar },
    isNarrow: init?.isNarrow ?? base.isNarrow,
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
          else setSidebar({ isDrawerOpen: !s.sidebar.isDrawerOpen });
        },
        closeSidebar: () =>
          sidebarDocked(get()) ? setSidebar({ mode: 'closed' }) : setSidebar({ isDrawerOpen: false }),
        setSidebarMode: (mode) => setSidebar({ mode }),
        setBurgerBehavior: (burger) => setSidebar({ burger }),
        setSidebarWidth: (width) => setSidebar({ width: clamp(Math.round(width), sb.min, sb.max) }),
        setSidebarDocked: (isDocked) => {
          const { mode } = get().sidebar;
          // Docking shows the column; undocking keeps the sidebar visible as a drawer.
          if (isDocked)
            setSidebar({ isDocked, isDrawerOpen: false, mode: mode === 'closed' ? 'expanded' : mode });
          else setSidebar({ isDocked, isDrawerOpen: true });
        },

        toggleContextBar: () => {
          const s = get();
          if (contextDocked(s)) setContext({ isOpen: !s.contextBar.isOpen });
          else setContext({ isDrawerOpen: !s.contextBar.isDrawerOpen });
        },
        openContextBar: (tab) => {
          const s = get();
          const activeTab = tab ?? s.contextBar.activeTab;
          if (contextDocked(s)) setContext({ isOpen: true, activeTab });
          else setContext({ isDrawerOpen: true, activeTab });
        },
        closeContextBar: () =>
          contextDocked(get()) ? setContext({ isOpen: false }) : setContext({ isDrawerOpen: false }),
        setContextBarWidth: (width) => setContext({ width: clamp(Math.round(width), cb.min, cb.max) }),
        setContextBarDocked: (isDocked) =>
          isDocked
            ? setContext({ isDocked, isOpen: true, isDrawerOpen: false })
            : setContext({ isDocked, isDrawerOpen: true }),
        setActiveTab: (activeTab) => setContext({ activeTab }),

        setNarrow: (isNarrow) => {
          if (get().isNarrow === isNarrow) return;
          // Crossing the breakpoint closes drawers; docked columns follow the stored preference.
          set((s) => ({
            isNarrow,
            sidebar: { ...s.sidebar, isDrawerOpen: false },
            contextBar: { ...s.contextBar, isDrawerOpen: false },
          }));
        },
      },
    };
  };

  if (!shouldPersist) return createStore<ShellStore>()(creator);

  return createStore<ShellStore>()(
    persist(creator, {
      name: STORAGE_KEY,
      version: 2,
      migrate: (old, version) => {
        if (version >= 2) return old as PersistedShell;
        // ponytail: v1 (`docked`, `open`) migration; delete after 2027-01.
        const { sidebar, contextBar } = old as Partial<
          Record<'sidebar' | 'contextBar', Record<string, unknown>>
        >;
        return {
          sidebar: renameKeys(sidebar, { docked: 'isDocked' }),
          contextBar: renameKeys(contextBar, { docked: 'isDocked', open: 'isOpen' }),
        } as PersistedShell;
      },
      partialize: (s): PersistedShell => ({
        sidebar: {
          mode: s.sidebar.mode,
          burger: s.sidebar.burger,
          isDocked: s.sidebar.isDocked,
          width: s.sidebar.width,
        },
        contextBar: {
          isOpen: s.contextBar.isOpen,
          isDocked: s.contextBar.isDocked,
          width: s.contextBar.width,
          activeTab: s.contextBar.activeTab,
        },
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedShell>;
        return {
          ...current,
          sidebar: { ...current.sidebar, ...p.sidebar, isDrawerOpen: false },
          contextBar: { ...current.contextBar, ...p.contextBar, isDrawerOpen: false },
        };
      },
    }),
  );
}

const renameKeys = (o: Record<string, unknown> = {}, names: Record<string, string>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [names[k] ?? k, v]));

export type ShellStoreApi = ReturnType<typeof createShellStore>;

// Dev only. ShellProvider keeps its store in state, and Fast Refresh preserves that state, so a hot
// update here would leave the running app on the old store (old actions, missing new ones).
// Reload instead of patching in place.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
