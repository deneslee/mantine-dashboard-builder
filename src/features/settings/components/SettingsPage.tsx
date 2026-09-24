import { EmptyState, Tabs } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { Page } from '@/design-system/components/Page/Page';
import { settingsTabs, type SettingsTab } from '../model/tabs';
import { AppearanceSettings } from './AppearanceSettings';

/** Settings page. The active tab lives in the URL (`?tab=`), so tabs are real, shareable links. */
export function SettingsPage({ tab }: { tab: SettingsTab }) {
  return (
    <Page.Root>
      <Page.Header title="Settings" description="Workspace and appearance preferences." />
      <Page.Body>
        <Tabs value={tab}>
          <Tabs.List mb="lg">
            {settingsTabs.map((t) => (
              <Tabs.Tab
                key={t.value}
                value={t.value}
                renderRoot={(props) => <Link to="/settings" search={{ tab: t.value }} {...props} />}
              >
                {t.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <Tabs.Panel value="general">
            <EmptyState
              variant="light"
              color="gray"
              icon={<IconAdjustments size={22} stroke={1.75} />}
              title="No general settings yet"
              description="Workspace and member settings will live here."
            />
          </Tabs.Panel>

          <Tabs.Panel value="appearance">
            <AppearanceSettings />
          </Tabs.Panel>
        </Tabs>
      </Page.Body>
    </Page.Root>
  );
}
