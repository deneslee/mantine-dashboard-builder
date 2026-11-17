import { Tabs } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { settingsTabs, type SettingsTab } from './settingsTabs';
import { AppearanceForm } from './AppearanceForm';
import { StorageForm } from './StorageForm';

/** Settings page. The active tab lives in the URL (`?tab=`), so tabs are real, shareable links. */
export function SettingsPage({ tab }: { tab: SettingsTab }) {
  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>Settings</Page.Title>
        <Page.Description>Storage and appearance preferences.</Page.Description>
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
            <StorageForm />
          </Tabs.Panel>

          <Tabs.Panel value="appearance">
            <AppearanceForm />
          </Tabs.Panel>
        </Tabs>
      </Page.Body>
    </Page.Root>
  );
}
