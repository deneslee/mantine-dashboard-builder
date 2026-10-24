import type { ReactNode } from 'react';
import { useConnections } from '@/features/datasources/connections/useConnections';
import { useReadVault, useVaultVersions } from '@/lib/vault/useVault';
import { PluginsContext } from '@/plugins/usePlugins';
import { plugins } from './plugins';
import { withConnections } from './withConnections';

/** Puts the plugins in context: the static ones from `plugins.ts`, plus a datasource per connection. */
export function PluginsProvider({ children }: { children: ReactNode }) {
  const connections = useConnections();
  const versions = useVaultVersions();
  const lookup = useReadVault();
  return (
    <PluginsContext value={withConnections(plugins, connections, { lookup, versions })}>
      {children}
    </PluginsContext>
  );
}
