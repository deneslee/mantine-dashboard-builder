import { ActionIcon, Badge, Group, Tabs, Tooltip } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { Suspense, useEffect } from 'react';
import { PanelSkeleton } from '@/features/loading';
import { useBadgeCount } from '../hooks/useBadgeCount';
import { useContextTabs } from '../hooks/useContextTabs';
import { useContextBar, useShellActions, useSidebar } from '../hooks/useShell';
import type { TabBadge } from '../model/contextTabs';
import { Panel } from '../panel/Panel';
import classes from './ContextBar.module.css';

/**
 * Context bar. Tabs come from the matched routes (`staticData.contextTabs`) plus the global
 * notifications tab, and sit in the header row. Inactive panels stay mounted: Mantine Tabs
 * hides them with React `Activity`, so their state survives switching.
 */
export function ContextBar() {
  const tabs = useContextTabs();
  const { activeTab, prefersDocked } = useContextBar();
  const { narrow } = useSidebar();
  const { setActiveTab, closeContextBar, setContextBarDocked } = useShellActions();

  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  // The stored tab may not exist on this route; fall back to the first one.
  useEffect(() => {
    if (active && active.id !== activeTab) setActiveTab(active.id);
  }, [active, activeTab, setActiveTab]);

  return (
    <Tabs
      value={active?.id ?? null}
      onChange={setActiveTab}
      keepMounted
      keepMountedMode="activity"
      classNames={{ root: classes.root, list: classes.list, tab: classes.tab, panel: classes.panel }}
    >
      <Group className={classes.header} gap={4} wrap="nowrap">
        <Tabs.List aria-label="Context">
          {tabs.map((tab) => {
            // Active tab shows its label; the rest are icons with tooltips so many tabs fit 280px.
            const isActive = tab.id === active?.id;
            return (
              <Tooltip key={tab.id} label={tab.label} disabled={isActive}>
                <Tabs.Tab
                  value={tab.id}
                  aria-label={tab.label}
                  leftSection={<tab.icon size={16} stroke={1.75} />}
                  rightSection={<TabCount badge={tab.badge} />}
                >
                  {isActive ? tab.label : null}
                </Tabs.Tab>
              </Tooltip>
            );
          })}
        </Tabs.List>
        <Group gap={2} wrap="nowrap" className={classes.actions}>
          {narrow ? null : <Panel.DockToggle docked={prefersDocked} onChange={setContextBarDocked} />}
          <Tooltip label="Close">
            <ActionIcon aria-label="Close context panel" onClick={closeContextBar}>
              <IconX size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {tabs.map((tab) => (
        <Tabs.Panel key={tab.id} value={tab.id}>
          <Panel.Body>
            <Suspense fallback={<PanelSkeleton />}>
              <tab.component />
            </Suspense>
          </Panel.Body>
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

function TabCount({ badge }: { badge?: TabBadge }) {
  const count = useBadgeCount(badge);
  return count ? (
    <Badge size="xs" circle color="red" variant="filled">
      {count > 9 ? '9+' : count}
    </Badge>
  ) : null;
}
