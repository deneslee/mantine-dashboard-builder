import { createFileRoute } from '@tanstack/react-router';
import { parseSettingsTab, SettingsPage, type SettingsTab } from '@/features/settings';

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => ({
    tab: parseSettingsTab(search.tab),
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { tab = 'general' } = Route.useSearch();
  return <SettingsPage tab={tab} />;
}
