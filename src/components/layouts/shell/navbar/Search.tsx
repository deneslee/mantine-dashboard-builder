import { Group, Input, Kbd } from '@mantine/core';
import { useOs } from '@mantine/hooks';
import { Spotlight, spotlight, type SpotlightActionData } from '@mantine/spotlight';
import { IconSearch } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { nav } from '../model/nav';
import classes from './Search.module.css';

/**
 * Navbar search. The trigger is Mantine `Input` rendered as a button; Spotlight is the search UI.
 * Actions today: navigation targets. Phase 3 adds dashboards and widgets through a registry.
 */
export function Search() {
  const navigate = useNavigate();
  const os = useOs();
  const modKey = os === 'macos' ? '⌘' : 'Ctrl';

  const actions = useMemo<SpotlightActionData[]>(
    () =>
      Object.values(nav)
        .flat()
        .flatMap((g) =>
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
    [navigate],
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
        leftSection={<IconSearch size={16} stroke={1.75} />}
        rightSectionWidth={72}
        rightSection={
          <Group gap={4} wrap="nowrap" visibleFrom="sm">
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
        searchProps={{ leftSection: <IconSearch size={18} stroke={1.75} />, placeholder: 'Search…' }}
      />
    </>
  );
}
