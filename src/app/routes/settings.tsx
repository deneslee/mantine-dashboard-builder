import { createFileRoute } from '@tanstack/react-router';
import { parseSettingsTab, type SettingsTab } from '@/features/settings/settingsTabs';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const Route = createFileRoute('/settings')({
  staticData: { crumb: 'Settings' },
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => ({
    tab: parseSettingsTab(search.tab),
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { tab = 'general' } = Route.useSearch();
  return <SettingsPage tab={tab} />;
}
