import { useShellActions, useSidebar } from '../hooks/useShell';
import { nav } from '../model/nav';
import { Panel } from '../panel/Panel';
import { Brand } from './Brand';
import { SidebarMenu } from './SidebarMenu';
import { SidebarNav } from './SidebarNav';
import classes from './Sidebar.module.css';

/**
 * Sidebar content: brand, scrolling nav, nav pinned to the bottom, footer with the dock toggle and
 * the sidebar menu. Same component in the docked column and in the overlay drawer; `compact` only
 * applies when docked.
 */
export function Sidebar() {
  const { isCompact, prefersDocked, narrow } = useSidebar();
  const { setSidebarDocked } = useShellActions();

  return (
    <Panel.Root className={classes.root} data-compact={isCompact || undefined}>
      <Panel.Header className={classes.header}>
        <Brand />
      </Panel.Header>

      <Panel.Body>
        <SidebarNav groups={nav.main} />
      </Panel.Body>

      {nav.bottom.length > 0 ? <SidebarNav groups={nav.bottom} className={classes.bottom} /> : null}

      <Panel.Footer className={classes.footer}>
        {/* The compact rail only fits one button: docking moves into the menu there. */}
        {narrow || isCompact ? null : (
          <Panel.DockToggle variant="chrome" docked={prefersDocked} onChange={setSidebarDocked} />
        )}
        <SidebarMenu />
      </Panel.Footer>
    </Panel.Root>
  );
}
