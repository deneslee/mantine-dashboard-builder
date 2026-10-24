import type { ComponentType } from 'react';
import type { z } from 'zod';
import type { DataFrame } from '@/core/data/DataFrame';
import type { QueryContext } from './DatasourcePlugin';

/**
 * Optional plugins: datasource plugins that are in the build only when `plugins.json` lists them
 * (`plugins.config.ts` builds the list; plan 11). Each provides datasource types, and a user turns a
 * type into a working datasource by creating a connection on the Data sources page.
 */

/** A field in a connection's form. Secret kinds are stored in the vault, never in the settings. */
export interface ConnectionField {
  name: string;
  label: string;
  kind: 'text' | 'url' | 'select' | 'secret' | 'secretFile';
  description?: string;
  placeholder?: string;
  isRequired?: boolean;
  /** For `select`. */
  options?: { value: string; label: string }[];
  /** For `secretFile`: the file types the picker offers, e.g. `application/json,.json`. */
  accept?: string;
}

/** A configured datasource of a type. Its secrets live in the vault, not here. */
export interface Connection {
  /** What queries name (`{ datasource: 'analytics', spec }`): a slug, unique, fixed once created. */
  id: string;
  plugin: string;
  type: string;
  name: string;
  /** The type's settings that aren't secret, as the user entered them. */
  settings: Record<string, unknown>;
  updatedAt: string;
}

/** A connection's settings and secrets, parsed by its type's schemas. */
export interface ConnectionValues<Settings = unknown, Secrets = unknown> {
  settings: Settings;
  secrets: Secrets;
}

/** A type's code: its own chunk, loaded the first time a connection of the type is queried or tested. */
export interface DatasourceRuntime<Settings = unknown, Secrets = unknown> {
  /** One query's frames. Rejects with an `AppError`; honours `signal`. */
  query(
    connection: ConnectionValues<Settings, Secrets>,
    spec: unknown,
    ctx: QueryContext,
    signal?: AbortSignal,
  ): Promise<DataFrame[]>;
  /**
   * A cheap request that proves the connection works. Resolves with what the server says about
   * itself (a version, a project); rejects with an `AppError` that says what to fix.
   */
  test(connection: ConnectionValues<Settings, Secrets>, signal?: AbortSignal): Promise<string>;
}

export interface DatasourceType<Settings = unknown, Secrets = unknown> {
  /** The optional plugin it comes with, e.g. `aws`; set by `defineOptionalPlugin`. */
  plugin: string;
  /** Unique across all plugins, e.g. `athena`. */
  type: string;
  name: string;
  description: string;
  icon: ComponentType<{ size?: number | string; stroke?: number }>;
  /** The connection form, in order. Secret fields go to the vault. */
  fields: ConnectionField[];
  settingsSchema: z.ZodType<Settings>;
  secretsSchema: z.ZodType<Secrets>;
  /** Checked when a query is written, imported and run, so it lives here rather than in the lazy runtime. */
  querySchema: z.ZodType;
  /** A query spec to copy into a widget. */
  example: unknown;
  isTimeAware: boolean;
  load: () => Promise<DatasourceRuntime<Settings, Secrets>>;
}

export interface OptionalPlugin {
  /** As `plugins.json` and `plugins.config.ts` list it, e.g. `aws`. */
  id: string;
  types: DatasourceType[];
}

/** An optional plugin as the build knows it: every known plugin, in this build or not. */
export interface PluginCatalogEntry {
  id: string;
  name: string;
  description: string;
  isInBuild: boolean;
}

/**
 * Checks that a type's schemas, form and runtime agree, then drops its type parameters so the types
 * of a plugin fit in one list. Connections are parsed with the same schemas before the runtime sees
 * them, so the pairing holds at runtime.
 */
export function defineDatasourceType<Settings, Secrets>(
  definition: Omit<DatasourceType<Settings, Secrets>, 'plugin'>,
): Omit<DatasourceType, 'plugin'> {
  return definition as unknown as Omit<DatasourceType, 'plugin'>;
}

export function defineOptionalPlugin(id: string, types: Omit<DatasourceType, 'plugin'>[]): OptionalPlugin {
  return { id, types: types.map((type) => ({ ...type, plugin: id })) };
}
