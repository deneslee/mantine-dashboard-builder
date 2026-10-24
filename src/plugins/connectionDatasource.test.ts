import { IconDatabase } from '@tabler/icons-react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { z } from 'zod';
import { AppError } from '@/core/errors/AppError';
import type { QueryContext } from './DatasourcePlugin';
import { createConnectionDatasource, type SecretsLookup } from './connectionDatasource';
import { defineDatasourceType, defineOptionalPlugin, type Connection } from './OptionalPlugin';

const runtime = {
  query: vi.fn(async () => [{ length: 0, fields: [] }]),
  test: vi.fn(async () => 'ok'),
};
const load = vi.fn(async () => runtime);

const [type] = defineOptionalPlugin('fixture', [
  defineDatasourceType({
    type: 'fixture-sql',
    name: 'Fixture SQL',
    description: 'A test type.',
    icon: IconDatabase,
    fields: [],
    settingsSchema: z.object({ host: z.string() }),
    secretsSchema: z.object({ password: z.string().min(1) }),
    querySchema: z.object({ sql: z.string() }),
    example: { sql: 'SELECT 1' },
    isTimeAware: true,
    load,
  }),
]).types;

const connection: Connection = {
  id: 'analytics',
  plugin: 'fixture',
  type: 'fixture-sql',
  name: 'Analytics',
  settings: { host: 'db.example.com' },
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const ctx = {} as QueryContext;
const datasource = (lookup: SecretsLookup, conn = connection) =>
  createConnectionDatasource(type!, conn, { getSecrets: () => lookup, revision: 'r1' });

describe('createConnectionDatasource', () => {
  it('is keyed by the connection id and carries the type and revision', () => {
    const ds = datasource({ status: 'missing' });
    expect(ds).toMatchObject({ id: 'analytics', name: 'Analytics', isTimeAware: true, revision: 'r1' });
    expect(type?.plugin).toBe('fixture');
  });

  it('hands the parsed settings, secrets and spec to the runtime, loaded on first query', async () => {
    const ds = datasource({ status: 'ready', secrets: { password: 'pw' } });
    expect(load).not.toHaveBeenCalled();
    await ds.query({ sql: 'SELECT 1' }, ctx);
    expect(runtime.query).toHaveBeenCalledWith(
      { settings: { host: 'db.example.com' }, secrets: { password: 'pw' } },
      { sql: 'SELECT 1' },
      ctx,
      undefined,
    );
  });

  it.each([
    ['locked', { status: 'locked' } as const, /is locked/],
    ['missing', { status: 'missing' } as const, /needs its secrets/],
    ['changed outside the app', { status: 'changed' } as const, /changed outside this app/],
    ['incomplete', { status: 'ready', secrets: { password: '' } } as const, /needs its secrets/],
  ])('refuses to run when the secrets are %s, as forbidden', async (_, lookup, message) => {
    const error = await datasource(lookup)
      .query({ sql: 'SELECT 1' }, ctx)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: 'forbidden',
      isRetryable: false,
      message: expect.stringMatching(message),
    });
  });

  it('rejects invalid settings and specs as validation errors, before loading anything', async () => {
    load.mockClear();
    const broken = datasource(
      { status: 'ready', secrets: { password: 'pw' } },
      { ...connection, settings: {} },
    );
    await expect(broken.query({ sql: 'SELECT 1' }, ctx)).rejects.toMatchObject({ code: 'validation' });
    const ds = datasource({ status: 'ready', secrets: { password: 'pw' } });
    await expect(ds.query({ nope: true }, ctx)).rejects.toMatchObject({ code: 'validation' });
    expect(load).not.toHaveBeenCalled();
  });
});
