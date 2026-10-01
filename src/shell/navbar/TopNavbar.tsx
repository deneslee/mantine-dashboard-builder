import { ActionIcon, Burger, Group, Indicator, Select, Tooltip } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { useContextBar, useNav, useShellActions, useSidebar } from '../useShell';
import { useTotalBadgeCount } from '../contextBar/useBadgeCount';
import { useContextTabs } from '../contextBar/useContextTabs';
import { nextSidebarMode, type SidebarMode } from '../createShellStore';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { Search } from './Search';
import { UserMenu } from './UserMenu';
import classes from './TopNavbar.module.css';

/** Global bar: burger · search · area select · context · theme · user. */
const burgerLabels: Record<SidebarMode, string> = {
  expanded: 'Expand sidebar',
  compact: 'Collapse sidebar to icons',
  closed: 'Hide sidebar',
};

export function TopNavbar() {
  const { isOverlay: isDrawerOpen, isDocked: isSidebarDocked, mode, burger } = useSidebar();
  const { isOpen: isContextOpen, isColumn: isContextDocked } = useContextBar();
  const { toggleSidebar, toggleContextBar } = useShellActions();

  const burgerLabel = isSidebarDocked
    ? burgerLabels[nextSidebarMode(mode, burger)]
    : isDrawerOpen
      ? 'Close menu'
      : 'Open menu';

  return (
    <Group className={classes.root} h="100%" px="sm" gap="md" wrap="nowrap">
      <Tooltip label={burgerLabel}>
        <Burger
          size="sm"
          opened={isDrawerOpen}
          onClick={toggleSidebar}
          aria-label={burgerLabel}
          aria-expanded={isSidebarDocked ? undefined : isDrawerOpen}
          color="var(--app-navbar-text)"
          className={classes.burger}
        />
      </Tooltip>

      <Group className={classes.center} justify="center">
        <Search />
      </Group>

      <Group gap="2xs" wrap="nowrap" className={classes.right} justify="flex-end">
        <Tooltip.Group>
          <AreaSelect />
          <ContextButton isOpen={isContextOpen} isActive={isContextDocked} onClick={toggleContextBar} />
          <ColorSchemeToggle />
          <UserMenu />
        </Tooltip.Group>
      </Group>
    </Group>
  );
}

function AreaSelect() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { areas } = useNav();
  const current = areas.find((a) => pathname.startsWith(a.to))?.value ?? null;

  return (
    <Select
      aria-label="Area"
      size="xs"
      w={150}
      visibleFrom="sm"
      data={areas.map((a) => ({ value: a.value, label: a.label }))}
      value={current}
      placeholder="Go to…"
      onChange={(value) => {
        const area = areas.find((a) => a.value === value);
        if (area) void navigate({ to: area.to });
      }}
      classNames={{ input: classes.selectInput, section: classes.selectSection }}
      comboboxProps={{ width: 180, position: 'bottom-end', shadow: 'md' }}
    />
  );
}

/** `isActive` (selected look) only while the panel is docked open; an open drawer covers the navbar anyway. */
function ContextButton({
  isOpen,
  isActive,
  onClick,
}: {
  isOpen: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const count = useTotalBadgeCount(useContextTabs());

  return (
    <Tooltip label={isOpen ? 'Close context panel' : 'Open context panel'}>
      <Indicator label={count > 9 ? '9+' : count} size={16} offset={6} disabled={count === 0} color="danger">
        <ActionIcon
          variant="chrome"
          aria-label={isOpen ? 'Close context panel' : 'Open context panel'}
          aria-pressed={isOpen}
          data-active={isActive || undefined}
          onClick={onClick}
        >
          <IconHelp size={iconSize.md} stroke={iconStroke} />
        </ActionIcon>
      </Indicator>
    </Tooltip>
  );
}
