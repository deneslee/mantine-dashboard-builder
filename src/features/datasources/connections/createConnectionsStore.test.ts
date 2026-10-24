import { describe, expect, it } from 'vite-plus/test';
import { CONNECTIONS_STORAGE_KEY, createConnectionsStore } from './createConnectionsStore';

const draft = {
  id: 'analytics',
  plugin: 'aws',
  type: 'athena',
  name: 'Analytics',
  settings: { region: 'eu-west-1', workgroup: 'primary' },
};

describe('connections store', () => {
  it('adds a connection, then replaces it by id with a new updatedAt', async () => {
    const store = createConnectionsStore({ shouldPersist: false });
    const first = store.getState().actions.save(draft);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = store.getState().actions.save({ ...draft, name: 'Analytics (Athena)' });
    expect(store.getState().connections).toEqual([second]);
    expect(second.updatedAt > first.updatedAt).toBe(true);
    store.getState().actions.remove('analytics');
    expect(store.getState().connections).toEqual([]);
  });

  it('persists the settings and never anything else', () => {
    const store = createConnectionsStore();
    store.getState().actions.save(draft);
    const stored = JSON.parse(localStorage.getItem(CONNECTIONS_STORAGE_KEY) ?? '{}');
    expect(stored).toMatchObject({
      version: 1,
      state: { connections: [{ id: 'analytics', settings: draft.settings }] },
    });
    expect(Object.keys(stored.state)).toEqual(['connections']);
  });

  it('drops stored connections that no longer parse', () => {
    localStorage.setItem(
      CONNECTIONS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          connections: [{ ...draft, updatedAt: '2026-10-24T00:00:00.000Z' }, { id: 'Bad Id!' }, 'junk'],
        },
      }),
    );
    expect(
      createConnectionsStore()
        .getState()
        .connections.map((c) => c.id),
    ).toEqual(['analytics']);
  });
});
