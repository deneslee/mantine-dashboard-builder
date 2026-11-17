import { createContext, use } from 'react';
import type { ActionPlugin } from './ActionPlugin';
import type { ContextPanelPlugin } from './ContextPanelPlugin';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import type { DatasourceType, PluginCatalogEntry } from '@/plugins/OptionalPlugin';
import type { RecordProviderPlugin } from './RecordProviderPlugin';
import type { WidgetPlugin } from '@/plugins/WidgetPlugin';

/** The optional plugins as this build knows them: what it has, and where it was built from. */
export interface BuildPlugins {
  /** Every known optional plugin, in this build or not; only names and descriptions, no code. */
  catalog: PluginCatalogEntry[];
  /** The repository and branch it was built from, when the build knew them (CI). */
  repository?: string;
  branch?: string;
}

/** Every plugin kind, each in one registry keyed by id. Built once in `app/plugins.ts`. */
export interface Plugins {
  /** Keyed by `type`, the widget's id. */
  widgets: Record<string, WidgetPlugin>;
  /** The built-in datasources and one per connection, keyed by the id queries name. */
  datasources: Record<string, DatasourcePlugin>;
  /** The datasource types of the optional plugins in this build, keyed by type. */
  types: Record<string, DatasourceType>;
  /** Where records can be saved; the active one is a user setting. */
  recordProviders: Record<string, RecordProviderPlugin>;
  /** Context-bar panels contributed by plugins. */
  panels: Record<string, ContextPanelPlugin>;
  actions: Record<string, ActionPlugin>;
  build: BuildPlugins;
}

/**
 * One registry: `items` keyed by `keyOf(item)`. Throws on a duplicate key, so a build with two
 * plugins of one kind under one id fails at startup instead of one silently replacing the other.
 */
export function toRegistry<T>(
  kind: string,
  items: readonly T[],
  keyOf: (item: T) => string,
): Record<string, T> {
  const registry: Record<string, T> = {};
  for (const item of items) {
    const key = keyOf(item);
    if (Object.hasOwn(registry, key)) {
      throw new Error(`Two ${kind} plugins have the id "${key}". Each id must be unique.`);
    }
    registry[key] = item;
  }
  return registry;
}

/** Set once in `app/Providers` from `app/plugins.ts`, so no feature imports a widget or a datasource. */
export const PluginsContext = createContext<Plugins | null>(null);

export function usePlugins(): Plugins {
  const plugins = use(PluginsContext);
  if (!plugins) throw new Error('usePlugins must be used inside app/Providers (PluginsContext).');
  return plugins;
}
