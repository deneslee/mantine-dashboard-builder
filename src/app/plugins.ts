import { build, optionalPlugins } from 'virtual:optional-plugins';
import type { ActionPlugin } from '@/plugins/ActionPlugin';
import type { ContextPanelPlugin } from '@/plugins/ContextPanelPlugin';
import type { RecordProviderPlugin } from '@/plugins/RecordProviderPlugin';
import { toRegistry, type Plugins } from '@/plugins/usePlugins';
import { localJsonDatasource } from '@/plugins/datasources/localJson/localJsonDatasource';
import { mockDatasource } from '@/plugins/datasources/mock/mockDatasource';
import { chartWidget } from '@/plugins/widgets/chart/chartWidget';
import { kpiWidget } from '@/plugins/widgets/kpi/kpiWidget';
import { tableWidget } from '@/plugins/widgets/table/tableWidget';

const RECORD_PROVIDERS: RecordProviderPlugin[] = [];
const PANELS: ContextPanelPlugin[] = [];
const ACTIONS: ActionPlugin[] = [];

/**
 * Every plugin the app ships. Each kind is one registry keyed by id; a duplicate id throws when
 * this module loads. Features meet here: `Providers` puts the registries in `PluginsContext`, so
 * no feature imports a plugin. Adding a plugin is one entry in a list. Static, no
 * `registerWidget()` side effects, so unused plugins tree-shake.
 * The optional plugins' types come from `virtual:optional-plugins`, which imports only those
 * `plugins.json` lists (plugins.config.ts); `useAppPlugins` adds a datasource per connection.
 */
export const plugins: Plugins = {
  widgets: toRegistry('widget', [kpiWidget, chartWidget, tableWidget], (w) => w.type),
  datasources: toRegistry('datasource', [mockDatasource, localJsonDatasource], (d) => d.id),
  types: toRegistry(
    'datasource type',
    optionalPlugins.flatMap((p) => p.types),
    (t) => t.type,
  ),
  recordProviders: toRegistry('record provider', RECORD_PROVIDERS, (p) => p.id),
  panels: toRegistry('context-bar panel', PANELS, (p) => p.id),
  actions: toRegistry('action', ACTIONS, (a) => a.id),
  build,
};
