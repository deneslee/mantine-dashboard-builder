export type SidebarMode = 'expanded' | 'compact' | 'closed';

export interface SidebarState {
  /** Docked layout: full, icon rail, or hidden. */
  mode: SidebarMode;
  /** User preference. Below `md` the sidebar is an overlay regardless. */
  docked: boolean;
  /** Width in px when docked and expanded. */
  width: number;
  /** Overlay drawer visibility. Transient: never persisted, so a drawer never opens on load. */
  drawerOpen: boolean;
}

export interface ContextBarState {
  /** Docked column visibility (persisted). */
  open: boolean;
  docked: boolean;
  width: number;
  activeTab: string | null;
  /** Overlay drawer visibility. Transient. */
  drawerOpen: boolean;
}

export interface ShellState {
  sidebar: SidebarState;
  contextBar: ContextBarState;
  /** Viewport below `md`: panels become overlays. Kept in sync by the Shell. */
  narrow: boolean;
}

export interface ShellActions {
  /** Burger. Docked: expanded → compact → closed → expanded. Overlay: open/close the drawer. */
  toggleSidebar: () => void;
  /** Closes whichever form is showing (column or drawer). */
  closeSidebar: () => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarDocked: (docked: boolean) => void;

  /** Question button. Docked: show/hide the column. Overlay: open/close the drawer. */
  toggleContextBar: () => void;
  openContextBar: (tab?: string) => void;
  closeContextBar: () => void;
  setContextBarWidth: (width: number) => void;
  setContextBarDocked: (docked: boolean) => void;
  setActiveTab: (tab: string | null) => void;

  setNarrow: (narrow: boolean) => void;
}

export type ShellStore = ShellState & { actions: ShellActions };

/** What the persisted snapshot contains (no transient fields, no actions). */
export interface PersistedShell {
  sidebar: Omit<SidebarState, 'drawerOpen'>;
  contextBar: Omit<ContextBarState, 'drawerOpen'>;
}
