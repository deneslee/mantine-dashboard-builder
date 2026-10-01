import { EmptyState, Tabs } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { settingsTabs, type SettingsTab } from './settingsTabs';
import { AppearanceForm } from './AppearanceForm';

/** Settings page. The active tab lives in the URL (`?tab=`), so tabs are real, shareable links. */
export function SettingsPage({ tab }: { tab: SettingsTab }) {
  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>Settings</Page.Title>
        <Page.Description>Workspace and appearance preferences.</Page.Description>
      </Page.Header>
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
              color="neutral"
              icon={<IconAdjustments size={iconSize.lg} stroke={iconStroke} />}
              title="No general settings yet"
              description="Workspace and member settings will live here."
            />
          </Tabs.Panel>

          <Tabs.Panel value="appearance">
            <AppearanceForm />
          </Tabs.Panel>
        </Tabs>
      </Page.Body>
    </Page.Root>
  );
}
