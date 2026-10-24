import { canonicalJson } from '@/core/data/canonicalJson';
import { AppError } from '@/core/errors/AppError';
import type { DatasourcePlugin } from './DatasourcePlugin';
import type { Connection, ConnectionValues, DatasourceType } from './OptionalPlugin';

/** Where the vault keeps a connection's secrets. */
export const connectionVaultKey = (id: string) => `connection:${id}`;

/**
 * What a connection's secrets were saved for: its plugin, type and settings. The vault stores it with
 * the secrets, and a connection whose fingerprint differs (another page on the origin rewrote its
 * relay URL, say) gets `changed` instead of its secrets.
 */
export const connectionFingerprint = ({ plugin, type, settings }: Connection) =>
  canonicalJson({ plugin, type, settings });

/** What the vault holds for a connection: its secrets, or why there are none. */
export type SecretsLookup =
  | { status: 'ready'; secrets: unknown }
  /** Saved on this device, and the vault is locked. */
  | { status: 'locked' }
  /** Never entered, or entered for a session that has ended. */
  | { status: 'missing' }
  /** The connection's settings changed outside the app since its secrets were saved. */
  | { status: 'changed' };

const MESSAGES = {
  locked: (name: string) => `“${name}” is locked. Unlock your saved connections under Data sources.`,
  missing: (name: string) => `“${name}” needs its secrets. Enter them under Data sources.`,
  changed: (name: string) =>
    `“${name}” changed outside this app, so its secrets weren't used. Check it under Data sources and save it again.`,
};

/**
 * A stored connection's settings and secrets, parsed by its type, ready for the runtime. Throws an
 * `AppError` that says what to fix; `forbidden` errors aren't reported to Sentry.
 */
export function resolveConnection(
  type: DatasourceType,
  connection: Connection,
  lookup: SecretsLookup,
): ConnectionValues {
  const settings = type.settingsSchema.safeParse(connection.settings);
  if (!settings.success)
    throw new AppError(
      'validation',
      `“${connection.name}” has invalid settings. Fix them under Data sources.`,
      { details: settings.error.issues, isRetryable: false },
    );
  if (lookup.status !== 'ready')
    throw new AppError('forbidden', MESSAGES[lookup.status](connection.name), { isRetryable: false });
  const secrets = type.secretsSchema.safeParse(lookup.secrets);
  if (!secrets.success)
    throw new AppError('forbidden', MESSAGES.missing(connection.name), { isRetryable: false });
  return { settings: settings.data, secrets: secrets.data };
}

/**
 * A connection as a datasource. A query checks the settings, the spec and the secrets, then goes to
 * the type's runtime, whose chunk loads on first use. Secrets are read from the vault when the query
 * runs, so they never sit in this object, a query key or the cache.
 */
export function createConnectionDatasource(
  type: DatasourceType,
  connection: Connection,
  { getSecrets, revision }: { getSecrets: (connection: Connection) => SecretsLookup; revision: string },
): DatasourcePlugin {
  return {
    id: connection.id,
    name: connection.name,
    querySchema: type.querySchema,
    isTimeAware: type.isTimeAware,
    revision,
    async query(spec, ctx, signal) {
      const values = resolveConnection(type, connection, getSecrets(connection));
      const parsed = type.querySchema.safeParse(spec);
      if (!parsed.success)
        throw new AppError('validation', `This query doesn't fit ${type.name}.`, {
          details: parsed.error.issues,
          isRetryable: false,
        });
      const runtime = await type.load();
      return runtime.query(values, parsed.data, ctx, signal);
    },
  };
}
