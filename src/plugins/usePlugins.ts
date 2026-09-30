import { createContext, use } from 'react';
import type { DatasourceDefinition } from '@/plugins/DatasourcePlugin';
import type { WidgetDefinition } from '@/plugins/WidgetPlugin';

/** The widget and datasource plugins a dashboard can use, keyed by type. */
export interface DashboardRegistry {
  widgets: Record<string, WidgetDefinition>;
  datasources: Record<string, DatasourceDefinition>;
}

/**
 * Filled in by the app layer (`app/registry.ts`), so this feature never imports a widget or a
 * datasource: `<DashboardRegistryContext value={registry}>`.
 */
export const DashboardRegistryContext = createContext<DashboardRegistry | null>(null);

export function useDashboardRegistry(): DashboardRegistry {
  const registry = use(DashboardRegistryContext);
  if (!registry)
    throw new Error('Dashboards need a DashboardRegistryContext with the widget and datasource maps.');
  return registry;
}
