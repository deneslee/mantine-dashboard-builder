import { ActionIcon, Burger, Group, Indicator, Select, Tooltip } from '@mantine/core';
import { IconHelpSquareRounded } from '@tabler/icons-react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useContextBar, useShellActions, useSidebar } from '../hooks/useShell';
import { useTotalBadgeCount } from '../hooks/useBadgeCount';
import { useContextTabs } from '../hooks/useContextTabs';
import { areas } from '../model/nav';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { Search } from './Search';
import { UserMenu } from './UserMenu';
import classes from './TopNavbar.module.css';

/** Global bar: burger · search · area select · context · theme · user. */
export function TopNavbar() {
  const { isOverlay: drawerOpen, docked: sidebarDocked } = useSidebar();
  const { open: contextOpen } = useContextBar();
  const { toggleSidebar, toggleContextBar } = useShellActions();

  return (
    <Group className={classes.root} h="100%" px="sm" gap="md" wrap="nowrap">
      <Tooltip
        label={sidebarDocked ? 'Sidebar: full, icons, hidden' : drawerOpen ? 'Close menu' : 'Open menu'}
      >
        <Burger
          size="sm"
          opened={drawerOpen}
          onClick={toggleSidebar}
          aria-label={sidebarDocked ? 'Change sidebar layout' : drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarDocked ? undefined : drawerOpen}
          color="var(--app-navbar-text)"
          className={classes.burger}
        />
      </Tooltip>

      <Group className={classes.center} justify="center">
        <Search />
      </Group>

      <Group gap={4} wrap="nowrap" className={classes.right} justify="flex-end">
        <AreaSelect />
        <ContextButton open={contextOpen} onClick={toggleContextBar} />
        <ColorSchemeToggle />
        <UserMenu />
      </Group>
    </Group>
  );
}

function AreaSelect() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

function ContextButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const count = useTotalBadgeCount(useContextTabs());

  return (
    <Tooltip label={open ? 'Close context panel' : 'Open context panel'}>
      <Indicator label={count > 9 ? '9+' : count} size={16} offset={6} disabled={count === 0} color="red">
        <ActionIcon
          variant="chrome"
          aria-label={open ? 'Close context panel' : 'Open context panel'}
          aria-pressed={open}
          data-active={open || undefined}
          onClick={onClick}
        >
          <IconHelpSquareRounded size={20} stroke={1.75} />
        </ActionIcon>
      </Indicator>
    </Tooltip>
  );
}
