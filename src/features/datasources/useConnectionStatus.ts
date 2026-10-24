import { useVaultEntryStatus } from '@/lib/vault/useVault';
import { connectionFingerprint, connectionVaultKey } from '@/plugins/connectionDatasource';
import type { Connection } from '@/plugins/OptionalPlugin';
import { usePlugins } from '@/plugins/usePlugins';

export type ConnectionStatus = 'ready' | 'locked' | 'missing' | 'changed' | 'notInBuild';

/** How each status reads in a badge. */
export const CONNECTION_STATUS: Record<ConnectionStatus, { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'success' },
  locked: { label: 'Locked', color: 'warning' },
  missing: { label: 'Needs secrets', color: 'neutral' },
  changed: { label: 'Changed outside the app', color: 'danger' },
  notInBuild: { label: 'Plugin not in this build', color: 'neutral' },
};

/** Whether a connection can run: its type in this build, and its secrets in the vault. */
export function useConnectionStatus(connection: Connection): ConnectionStatus {
  const { types } = usePlugins();
  const vaultStatus = useVaultEntryStatus(
    connectionVaultKey(connection.id),
    connectionFingerprint(connection),
  );
  return types[connection.type]?.plugin === connection.plugin ? vaultStatus : 'notInBuild';
}
