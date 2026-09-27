import type { DashboardRegistry } from '@/features/dashboards/registry';
import { localJsonDatasource } from '@/features/datasources/local-json/localJsonDatasource';
import { mockDatasource } from '@/features/datasources/mock/mockDatasource';
import { chartWidget } from '@/features/widgets/chart/chartWidget';
import { kpiWidget } from '@/features/widgets/kpi/kpiWidget';
import { tableWidget } from '@/features/widgets/table/tableWidget';

const byType = <T extends { type: string }>(plugins: T[]) =>
  Object.fromEntries(plugins.map((plugin) => [plugin.type, plugin]));

/**
 * Every widget and datasource the app ships, keyed by type. Features meet here: dashboards get
 * the maps through `DashboardRegistryContext` and never import a plugin. Adding a plugin is one
 * entry in a list. Static, no `registerWidget()` side effects, so unused plugins tree-shake.
 */
export const registry: DashboardRegistry = {
  widgets: byType([kpiWidget, chartWidget, tableWidget]),
  datasources: byType([mockDatasource, localJsonDatasource]),
};
