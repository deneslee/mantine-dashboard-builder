import { IconDatabase } from '@tabler/icons-react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { z } from 'zod';
import { createVaultStore } from '@/lib/vault/createVaultStore';
import { datasourceQuery } from '@/features/dashboards/data/dashboardQueries';
import { connectionFingerprint, connectionVaultKey } from '@/plugins/connectionDatasource';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { defineDatasourceType, defineOptionalPlugin, type Connection } from '@/plugins/OptionalPlugin';
import type { Plugins } from '@/plugins/usePlugins';
import { withConnections } from './withConnections';

const runtime = { query: vi.fn(async () => [{ length: 0, fields: [] }]), test: vi.fn(async () => 'ok') };
const [type] = defineOptionalPlugin('fixture', [
  defineDatasourceType({
    type: 'fixture-sql',
    name: 'Fixture SQL',
    description: '',
    icon: IconDatabase,
    fields: [],
    settingsSchema: z.object({ relayUrl: z.string() }),
    secretsSchema: z.object({ password: z.string() }),
    querySchema: z.object({ sql: z.string() }),
    example: { sql: 'SELECT 1' },
    isTimeAware: false,
    load: async () => runtime,
  }),
]).types;

const base: Plugins = {
  widgets: {},
  datasources: { mock: { id: 'mock', name: 'Mock', isTimeAware: true, query: async () => [] } },
  types: { 'fixture-sql': type! },
  build: { catalog: [] },
};

const connection = (patch: Partial<Connection> = {}): Connection => ({
  id: 'analytics',
  plugin: 'fixture',
  type: 'fixture-sql',
  name: 'Analytics',
  settings: { relayUrl: 'https://relay.example' },
  updatedAt: '2026-10-24T08:00:00.000Z',
  ...patch,
});

const SECRET = 'p4ssw0rd-never-leaks';

describe('withConnections', () => {
  it('adds a datasource per connection whose type is in the build, never over a built-in', () => {
    const vault = createVaultStore({ storage: undefined });
    const plugins = withConnections(
      base,
      [connection(), connection({ id: 'gone', type: 'not-in-build' }), connection({ id: 'mock' })],
      { lookup: vault.getState().actions.lookup, versions: {} },
    );
    expect(Object.keys(plugins.datasources)).toEqual(['mock', 'analytics']);
    expect(plugins.datasources.mock).toBe(base.datasources.mock);
    expect(plugins.datasources.analytics?.revision).toBe('2026-10-24T08:00:00.000Z:0');
  });

  it('reads the secrets when a query runs, and keeps them out of the datasource and its cache key', async () => {
    const vault = createVaultStore({ storage: undefined });
    const conn = connection();
    await vault.getState().actions.set(connectionVaultKey(conn.id), {
      secrets: { password: SECRET },
      fingerprint: connectionFingerprint(conn),
      isSaved: false,
    });
    const { lookup } = vault.getState().actions;
    const plugins = withConnections(base, [conn], { lookup, versions: vault.getState().versions });
    const datasource = plugins.datasources.analytics!;
    expect(datasource.revision).toBe('2026-10-24T08:00:00.000Z:1');
    expect(JSON.stringify(datasource)).not.toContain(SECRET);
    const time = { range: { from: 'now-1h', to: 'now' }, shifts: [], timeZone: 'UTC' };
    const options = datasourceQuery({ datasource: 'analytics', spec: { sql: 'SELECT 1' } }, time, {
      datasources: plugins.datasources,
      getNow: Date.now,
      source: 'Test',
    });
    expect(JSON.stringify(options.queryKey)).not.toContain(SECRET);

    await datasource.query({ sql: 'SELECT 1' }, {} as QueryContext);
    expect(runtime.query).toHaveBeenCalledWith(
      { settings: { relayUrl: 'https://relay.example' }, secrets: { password: SECRET } },
      { sql: 'SELECT 1' },
      {},
      undefined,
    );
  });

  it('refuses the secrets when the connection was changed outside the app', async () => {
    const vault = createVaultStore({ storage: undefined });
    const conn = connection();
    await vault.getState().actions.set(connectionVaultKey(conn.id), {
      secrets: { password: SECRET },
      fingerprint: connectionFingerprint(conn),
      isSaved: false,
    });
    // Another page on the origin points the stored connection at its own relay.
    const tampered = connection({ settings: { relayUrl: 'https://evil.example' } });
    const plugins = withConnections(base, [tampered], {
      lookup: vault.getState().actions.lookup,
      versions: {},
    });
    runtime.query.mockClear();
    await expect(
      plugins.datasources.analytics!.query({ sql: 'SELECT 1' }, {} as QueryContext),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
    expect(runtime.query).not.toHaveBeenCalled();
  });
});
