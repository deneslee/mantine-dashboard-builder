import { useMemo, type ReactNode } from 'react';
import { useConnections } from '@/features/datasources/connections/useConnections';
import { useReadVault, useVaultVersions } from '@/lib/vault/useVault';
import { PluginsContext } from '@/plugins/usePlugins';
import { plugins } from './plugins';
import { withConnections } from './withConnections';

/**
 * Puts the plugins in context: the static ones from `plugins.ts`, plus a datasource per connection.
 * The value changes only when connections or vault versions do, so consumers don't re-render for nothing.
 */
export function PluginsProvider({ children }: { children: ReactNode }) {
  const connections = useConnections();
  const versions = useVaultVersions();
  const lookup = useReadVault();
  const value = useMemo(
    () => withConnections(plugins, connections, { lookup, versions }),
    [connections, lookup, versions],
  );
  return <PluginsContext value={value}>{children}</PluginsContext>;
}
