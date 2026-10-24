import { createContext, use } from 'react';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import type { DatasourceType, PluginCatalogEntry } from '@/plugins/OptionalPlugin';
import type { WidgetPlugin } from '@/plugins/WidgetPlugin';

/** The optional plugins as this build knows them: what it has, and where it was built from. */
export interface BuildPlugins {
  /** Every known optional plugin, in this build or not; only names and descriptions, no code. */
  catalog: PluginCatalogEntry[];
  /** The repository and branch it was built from, when the build knew them (CI). */
  repository?: string;
  branch?: string;
}

/** The widget and datasource plugins a dashboard can use, keyed by type. */
export interface Plugins {
  widgets: Record<string, WidgetPlugin>;
  /** The built-in datasources and one per connection, keyed by the id queries name. */
  datasources: Record<string, DatasourcePlugin>;
  /** The datasource types of the optional plugins in this build, keyed by type. */
  types: Record<string, DatasourceType>;
  build: BuildPlugins;
}

/** Set once in `app/Providers` from `app/plugins.ts`, so no feature imports a widget or a datasource. */
export const PluginsContext = createContext<Plugins | null>(null);

export function usePlugins(): Plugins {
  const plugins = use(PluginsContext);
  if (!plugins) throw new Error('usePlugins must be used inside app/Providers (PluginsContext).');
  return plugins;
}
