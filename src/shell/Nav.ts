import type { Icon } from '@tabler/icons-react';

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

/** An entry in the navbar's area switcher. */
export interface NavArea {
  value: string;
  label: string;
  to: string;
}

/**
 * The app's navigation, handed to `ShellProvider` by the app (`app/nav.ts`), so the shell knows no
 * routes. `main` scrolls; `bottom` stays pinned above the sidebar footer. Nested entries render as
 * children of a NavLink, or as a flyout menu in the compact rail.
 */
export interface Nav {
  main: NavGroup[];
  bottom: NavGroup[];
  areas: NavArea[];
}
