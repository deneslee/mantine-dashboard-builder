import { NavLink, Stack, Text, Tooltip } from '@mantine/core';
import { Link, useRouterState } from '@tanstack/react-router';
import { useShellActions, useSidebar } from '../hooks/useShell';
import { navGroups, type NavItem } from '../model/nav';
import { Panel } from '../panel/Panel';
import { Brand } from './Brand';
import { SidebarMenu } from './SidebarMenu';
import classes from './Sidebar.module.css';

/**
 * Sidebar content: brand, nav groups, footer with the dock toggle and the sidebar menu.
 * Same component in the docked column and in the overlay drawer; `compact` only applies when docked.
 */
export function Sidebar() {
  const { isCompact, prefersDocked, narrow } = useSidebar();
  const { setSidebarDocked } = useShellActions();

  return (
    <Panel.Root className={classes.root} data-compact={isCompact || undefined}>
      <Panel.Header className={classes.header}>
        <Brand compact={isCompact} />
      </Panel.Header>

      <Panel.Body>
        <Stack gap="lg" p="xs">
          {navGroups.map((group) => (
            <Stack key={group.id} gap={2}>
              {group.label && !isCompact ? (
                <Text size="xs" fw={500} className={classes.groupLabel}>
                  {group.label}
                </Text>
              ) : null}
              {group.items.map((item) => (
                <SidebarLink key={item.id} item={item} compact={isCompact} />
              ))}
            </Stack>
          ))}
        </Stack>
      </Panel.Body>

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

const isExact = (pathname: string, to: string) => pathname === to || pathname === `${to}/`;

/**
 * Active rules:
 * - a leaf is active when the path starts with its `to`
 * - a child is active on an exact match
 * - its parent then gets `data-child-active` (white, heavier) instead of the selected style
 */
function SidebarLink({ item, compact }: { item: NavItem; compact: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { docked } = useSidebar();
  const { closeSidebar } = useShellActions();

  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const activeChild = children.find((c) => isExact(pathname, c.to));
  const selfActive = hasChildren ? false : pathname === item.to || pathname.startsWith(`${item.to}/`);
  const childActive = hasChildren && (Boolean(activeChild) || pathname.startsWith(`${item.to}/`));

  // An overlay sidebar closes after navigating.
  const afterNavigate = () => {
    if (!docked) closeSidebar();
  };

  const icon = <item.icon size={18} stroke={1.75} />;

  if (compact) {
    return (
      <Tooltip label={item.label} position="right">
        <NavLink
          renderRoot={(props) => <Link to={item.to} {...props} />}
          aria-label={item.label}
          leftSection={icon}
          active={selfActive}
          data-child-active={childActive || undefined}
          data-compact
          onClick={afterNavigate}
        />
      </Tooltip>
    );
  }

  if (!hasChildren) {
    return (
      <NavLink
        renderRoot={(props) => <Link to={item.to} {...props} />}
        label={item.label}
        leftSection={icon}
        active={selfActive}
        onClick={afterNavigate}
      />
    );
  }

  // Parent with children is a disclosure button; children are the links.
  return (
    <NavLink
      component="button"
      label={item.label}
      leftSection={icon}
      data-child-active={childActive || undefined}
      defaultOpened={childActive}
    >
      {children.map((child) => (
        <NavLink
          key={child.id}
          renderRoot={(props) => <Link to={child.to} {...props} />}
          label={child.label}
          active={isExact(pathname, child.to)}
          onClick={afterNavigate}
        />
      ))}
    </NavLink>
  );
}
