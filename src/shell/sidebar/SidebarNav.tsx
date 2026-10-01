import { Menu, NavLink, Stack, Text, Tooltip } from '@mantine/core';
import { Link, useRouterState } from '@tanstack/react-router';
import { clsx } from 'clsx';
import { useId, useState } from 'react';
import { dimensions } from '@/ui/tokens/dimensions';
import { fontWeight, iconStroke } from '@/ui/tokens/semantic';
import { useShellActions, useSidebar } from '../useShell';
import type { NavGroup, NavItem } from '../Nav';
import classes from './Sidebar.module.css';

type NavChild = NonNullable<NavItem['children']>[number];

/**
 * Nav groups for the sidebar. The expanded sidebar and the compact rail render the same tree:
 * icons sit on the rail's center line in both, labels fade, and nothing remounts on collapse,
 * so the width animation only covers or reveals text.
 */
export function SidebarNav({ groups, className }: { groups: NavGroup[]; className?: string }) {
  return (
    <Stack gap="lg" className={clsx(classes.nav, className)}>
      {groups.map((group) => (
        <SidebarGroup key={group.id} group={group} />
      ))}
    </Stack>
  );
}

function SidebarGroup({ group }: { group: NavGroup }) {
  const labelId = useId();
  return (
    <Stack
      gap="3xs"
      role={group.label ? 'group' : undefined}
      aria-labelledby={group.label ? labelId : undefined}
    >
      {group.label ? (
        <Text id={labelId} size="xs" fw={fontWeight.medium} className={classes.groupLabel}>
          <span>{group.label}</span>
        </Text>
      ) : null}
      {group.items.map((item) =>
        item.children?.length ? (
          <SidebarParent key={item.id} item={item} items={item.children} />
        ) : (
          <SidebarLink key={item.id} item={item} />
        ),
      )}
    </Stack>
  );
}

const isExact = (pathname: string, to: string) => pathname === to || pathname === `${to}/`;

const usePathname = () => useRouterState({ select: (s) => s.location.pathname });

/** An overlay sidebar closes after navigating. */
function useAfterNavigate() {
  const { isDocked } = useSidebar();
  const { closeSidebar } = useShellActions();
  return () => {
    if (!isDocked) closeSidebar();
  };
}

function NavIcon({ icon: Icon }: { icon: NavItem['icon'] }) {
  return <Icon size={dimensions.shell.sidebar.iconSize} stroke={iconStroke} />;
}

/** Leaf entry. Active on its own route and nested paths; the tooltip only shows on the compact rail. */
function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { isCompact } = useSidebar();
  const handleNavigate = useAfterNavigate();

  return (
    <Tooltip label={item.label} position="right" disabled={!isCompact}>
      <NavLink
        renderRoot={(props) => <Link to={item.to} {...props} />}
        label={item.label}
        leftSection={<NavIcon icon={item.icon} />}
        active={pathname === item.to || pathname.startsWith(`${item.to}/`)}
        data-compact={isCompact || undefined}
        onClick={handleNavigate}
      />
    </Tooltip>
  );
}

/**
 * Entry with children.
 * - Expanded: a disclosure button over its child links. A child is active on an exact match;
 *   the parent then gets `data-child-active` (white, heavier) instead of the selected style.
 * - Compact: the same button opens a flyout menu with the children and shows the selected style,
 *   since the children are out of sight. The disclosure closes (animated) so the items below
 *   slide up instead of jumping; expanding the sidebar restores it.
 */
function SidebarParent({ item, items }: { item: NavItem; items: NavChild[] }) {
  const pathname = usePathname();
  const { isCompact } = useSidebar();
  const handleNavigate = useAfterNavigate();
  const isChildActive = items.some((c) => isExact(pathname, c.to)) || pathname.startsWith(`${item.to}/`);
  const [isOpen, setOpened] = useState(isChildActive);
  const [isMenuOpen, setMenuOpened] = useState(false);

  // Navigating into the section (e.g. from the flyout) opens it, so the current page is visible.
  const [wasChildActive, setWasChildActive] = useState(isChildActive);
  if (isChildActive !== wasChildActive) {
    setWasChildActive(isChildActive);
    if (isChildActive) setOpened(true);
  }
  // The flyout only exists on the rail; drop it when the sidebar expands so it can't reopen on collapse.
  if (!isCompact && isMenuOpen) setMenuOpened(false);

  return (
    <Menu
      opened={isMenuOpen}
      onChange={(next) => setMenuOpened(isCompact && next)}
      // No openDelay: entering the dropdown schedules a delayed open, which would reopen the
      // menu right after an item click closes it.
      trigger="click-hover"
      position="right-start"
      offset={12}
      // The button carries its own ARIA: disclosure when expanded, menu button when compact.
      withRoles={false}
      classNames={{ item: classes.flyoutItem }}
    >
      <Menu.Target>
        <NavLink
          component="button"
          label={item.label}
          leftSection={<NavIcon icon={item.icon} />}
          opened={isOpen && !isCompact}
          onChange={(next) => {
            if (!isCompact) setOpened(next);
          }}
          onKeyDown={(event) => {
            if (!isCompact) return;
            // NavLink turns Space into a disclosure toggle; on the rail it opens the flyout instead.
            if (event.key === ' ') setMenuOpened(true);
            // Mantine only handles Escape inside the dropdown; a hover-opened flyout leaves focus here.
            if (event.key === 'Escape') setMenuOpened(false);
          }}
          active={isCompact && isChildActive}
          data-child-active={isChildActive || undefined}
          data-compact={isCompact || undefined}
          aria-haspopup={isCompact ? 'menu' : undefined}
          aria-expanded={isCompact ? isMenuOpen : isOpen}
        >
          {items.map((child) => (
            <NavLink
              key={child.id}
              renderRoot={(props) => <Link to={child.to} activeOptions={{ exact: true }} {...props} />}
              label={child.label}
              active={isExact(pathname, child.to)}
              onClick={handleNavigate}
            />
          ))}
        </NavLink>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{item.label}</Menu.Label>
        {items.map((child) => (
          <Menu.Item
            key={child.id}
            renderRoot={(props) => <Link to={child.to} activeOptions={{ exact: true }} {...props} />}
          >
            {child.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
