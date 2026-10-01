import { createContext, use } from 'react';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import type { WidgetPlugin } from '@/plugins/WidgetPlugin';

/** The widget and datasource plugins a dashboard can use, keyed by type. */
export interface Plugins {
  widgets: Record<string, WidgetPlugin>;
  datasources: Record<string, DatasourcePlugin>;
}

/** Set once in `app/Providers` from `app/plugins.ts`, so no feature imports a widget or a datasource. */
export const PluginsContext = createContext<Plugins | null>(null);

export function usePlugins(): Plugins {
  const plugins = use(PluginsContext);
  if (!plugins) throw new Error('usePlugins must be used inside app/Providers (PluginsContext).');
  return plugins;
}
