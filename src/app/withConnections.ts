import type { VaultLookup } from '@/lib/vault/createVaultStore';
import {
  connectionFingerprint,
  connectionVaultKey,
  createConnectionDatasource,
} from '@/plugins/connectionDatasource';
import type { Connection } from '@/plugins/OptionalPlugin';
import type { Plugins } from '@/plugins/usePlugins';

/**
 * The plugins plus one datasource per connection whose type is in this build. A connection can't
 * take a built-in's id. Its revision follows the connection and its vault entry, so the cache never
 * mixes results from before and after an edit; its secrets are read from the vault when a query
 * runs, never stored here.
 */
export function withConnections(
  base: Plugins,
  connections: Connection[],
  {
    lookup,
    versions,
  }: { lookup: (key: string, fingerprint: string) => VaultLookup; versions: Record<string, number> },
): Plugins {
  const datasources = { ...base.datasources };
  for (const connection of connections) {
    const type = base.types[connection.type];
    if (!type || type.plugin !== connection.plugin || Object.hasOwn(base.datasources, connection.id))
      continue;
    datasources[connection.id] = createConnectionDatasource(type, connection, {
      getSecrets: (current) => lookup(connectionVaultKey(current.id), connectionFingerprint(current)),
      revision: `${connection.updatedAt}:${versions[connectionVaultKey(connection.id)] ?? 0}`,
    });
  }
  return { ...base, datasources };
}
