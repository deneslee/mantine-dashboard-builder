import { Group, Input, Kbd } from '@mantine/core';
import { useOs } from '@mantine/hooks';
import { Spotlight, spotlight, type SpotlightActionData } from '@mantine/spotlight';
import { IconSearch } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { useNav } from '../useShell';
import classes from './Search.module.css';

/**
 * Navbar search. The trigger is Mantine `Input` rendered as a button; Spotlight is the search UI.
 * Actions today: navigation targets. Phase 3 adds dashboards and widgets through a plugins.
 */
export function Search() {
  const navigate = useNavigate();
  const os = useOs();
  const modKey = os === 'macos' ? '⌘' : 'Ctrl';
  const nav = useNav();

  const actions = useMemo<SpotlightActionData[]>(
    () =>
      [...nav.main, ...nav.bottom].flatMap((g) =>
        g.items.flatMap((item) => [
          {
            id: item.id,
            label: item.label,
            description: item.to,
            leftSection: <item.icon size={18} stroke={1.75} />,
            onClick: () => void navigate({ to: item.to }),
          },
          ...(item.children ?? []).map((c) => ({
            id: `${item.id}.${c.id}`,
            label: c.label,
            description: c.to,
            onClick: () => void navigate({ to: c.to }),
          })),
        ]),
      ),
    [nav, navigate],
  );

  return (
    <>
      <Input
        component="button"
        type="button"
        pointer
        size="sm"
        radius="md"
        onClick={spotlight.open}
        aria-label="Search"
        classNames={{ wrapper: classes.wrapper, input: classes.input, section: classes.section }}
        leftSection={<IconSearch size={iconSize.sm} stroke={iconStroke} />}
        rightSectionWidth={72}
        rightSection={
          <Group gap="2xs" wrap="nowrap" visibleFrom="sm">
            <Kbd size="xs">{modKey}</Kbd>
            <Kbd size="xs">K</Kbd>
          </Group>
        }
      >
        <Input.Placeholder>Search dashboards, data, settings</Input.Placeholder>
      </Input>

      <Spotlight
        actions={actions}
        shortcut={['mod + K', '/']}
        nothingFound="Nothing matches that"
        highlightQuery
        limit={8}
        searchProps={{
          leftSection: <IconSearch size={iconSize.md} stroke={iconStroke} />,
          placeholder: 'Search…',
        }}
      />
    </>
  );
}
