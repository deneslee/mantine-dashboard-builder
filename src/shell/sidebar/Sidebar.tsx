import { Tooltip } from '@mantine/core';
import { useShellActions, useSidebar } from '../useShell';
import { nav } from '../Nav';
import { Panel } from '../Panel';
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
  const { isCompact, isDockPreferred, isNarrow } = useSidebar();
  const { setSidebarDocked } = useShellActions();

  return (
    <Panel.Root className={classes.root} data-compact={isCompact || undefined}>
      <Tooltip.Group>
        <Panel.Header className={classes.header}>
          <Brand />
        </Panel.Header>

        <Panel.Body>
          <SidebarNav groups={nav.main} />
        </Panel.Body>

        {nav.bottom.length > 0 ? <SidebarNav groups={nav.bottom} className={classes.bottom} /> : null}

        <Panel.Footer className={classes.footer}>
          {/* The compact rail only fits one button: docking moves into the menu there. */}
          {isNarrow || isCompact ? null : (
            <Panel.DockToggle variant="chrome" isDocked={isDockPreferred} onChange={setSidebarDocked} />
          )}
          <SidebarMenu />
        </Panel.Footer>
      </Tooltip.Group>
    </Panel.Root>
  );
}
