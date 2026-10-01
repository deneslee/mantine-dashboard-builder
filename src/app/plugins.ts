import type { Plugins } from '@/plugins/usePlugins';
import { localJsonDatasource } from '@/plugins/datasources/localJson/localJsonDatasource';
import { mockDatasource } from '@/plugins/datasources/mock/mockDatasource';
import { chartWidget } from '@/plugins/widgets/chart/chartWidget';
import { kpiWidget } from '@/plugins/widgets/kpi/kpiWidget';
import { tableWidget } from '@/plugins/widgets/table/tableWidget';

const byType = <T extends { type: string }>(plugins: T[]) =>
  Object.fromEntries(plugins.map((plugin) => [plugin.type, plugin]));

/**
 * Every widget and datasource the app ships, keyed by type. Features meet here: `Providers` puts
 * the maps in `PluginsContext`, so no feature imports a plugin. Adding a plugin is one
 * entry in a list. Static, no `registerWidget()` side effects, so unused plugins tree-shake.
 */
export const plugins: Plugins = {
  widgets: byType([kpiWidget, chartWidget, tableWidget]),
  datasources: byType([mockDatasource, localJsonDatasource]),
};
