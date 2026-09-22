import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconDots,
  IconEyeOff,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPinnedOff,
  IconSettings,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useShellActions, useSidebar } from '../hooks/useShell';

const iconProps = { size: 16, stroke: 1.75 };

/**
 * Sidebar footer menu: app links and the sidebar's own layout actions.
 * Appearance items depend on the current form: layout changes only apply to a docked column,
 * and the dock toggle lives here only when the compact rail has no room for it.
 */
export function SidebarMenu() {
  const { docked, isCompact } = useSidebar();
  const { setSidebarMode, closeSidebar, setSidebarDocked } = useShellActions();

  // An overlay sidebar closes after navigating, like the nav links.
  const afterNavigate = () => {
    if (!docked) closeSidebar();
  };

  return (
    <Menu position={isCompact ? 'right-end' : 'top-end'} width={220}>
      <Menu.Target>
        <Tooltip label="Sidebar menu" position={isCompact ? 'right' : 'top'}>
          <ActionIcon variant="chrome" aria-label="Sidebar menu">
            <IconDots size={18} stroke={1.75} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Application</Menu.Label>
        <Menu.Item
          renderRoot={(props) => <Link to="/settings" {...props} />}
          leftSection={<IconSettings {...iconProps} />}
          onClick={afterNavigate}
        >
          Settings
        </Menu.Item>

        <Menu.Divider />
        <Menu.Label>Appearance</Menu.Label>
        {docked && isCompact ? (
          <Menu.Item
            leftSection={<IconLayoutSidebarLeftExpand {...iconProps} />}
            onClick={() => setSidebarMode('expanded')}
          >
            Expand sidebar
          </Menu.Item>
        ) : null}
        {docked && !isCompact ? (
          <Menu.Item
            leftSection={<IconLayoutSidebarLeftCollapse {...iconProps} />}
            onClick={() => setSidebarMode('compact')}
          >
            Collapse to icons
          </Menu.Item>
        ) : null}
        <Menu.Item leftSection={<IconEyeOff {...iconProps} />} onClick={closeSidebar}>
          {docked ? 'Hide sidebar' : 'Close sidebar'}
        </Menu.Item>
        {isCompact ? (
          <Menu.Item leftSection={<IconPinnedOff {...iconProps} />} onClick={() => setSidebarDocked(false)}>
            Undock sidebar
          </Menu.Item>
        ) : null}
        <Menu.Item
          renderRoot={(props) => <Link to="/settings" search={{ tab: 'appearance' }} {...props} />}
          leftSection={<IconAdjustmentsHorizontal {...iconProps} />}
          onClick={afterNavigate}
        >
          Sidebar behavior…
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
