import { createContext, use } from 'react';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import type { WidgetPlugin } from '@/plugins/WidgetPlugin';

/** The widget and datasource plugins a dashboard can use, keyed by type. */
export interface Plugins {
  widgets: Record<string, WidgetPlugin>;
  datasources: Record<string, DatasourcePlugin>;
}

/**
 * Filled in by the app layer (`app/plugins.ts`), so this feature never imports a widget or a
 * datasource: `<PluginsContext value={plugins}>`.
 */
export const PluginsContext = createContext<Plugins | null>(null);

export function usePlugins(): Plugins {
  const plugins = use(PluginsContext);
  if (!plugins) throw new Error('Dashboards need a PluginsContext with the widget and datasource maps.');
  return plugins;
}
