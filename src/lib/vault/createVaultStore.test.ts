import { describe, expect, it } from 'vite-plus/test';
import { VAULT_STORAGE_KEY, createVaultStore } from './createVaultStore';

// Fewer iterations keep the tests fast; the app uses PBKDF2_ITERATIONS.
const FAST = { iterations: 1_000 };
const PASSPHRASE = 'correct horse battery staple';

/** A store over its own fake localStorage, and a second store over the same storage: a reload. */
function setup() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as Storage;
  const create = () => createVaultStore({ storage, ...FAST });
  return { data, create, store: create() };
}

const saved = (secrets: Record<string, string>, fingerprint = 'fp') => ({
  secrets,
  fingerprint,
  isSaved: true,
});
const session = (secrets: Record<string, string>, fingerprint = 'fp') => ({
  secrets,
  fingerprint,
  isSaved: false,
});

describe('vault', () => {
  it('stores saved secrets only encrypted, and a reload finds them locked', async () => {
    const { data, store, create } = setup();
    await store.getState().actions.create(PASSPHRASE);
    await store.getState().actions.set('connection:analytics', saved({ password: 'hunter2-s3cr3t' }));
    const raw = data.get(VAULT_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('hunter2-s3cr3t');
    expect(JSON.parse(raw)).toMatchObject({ version: 1, keys: ['connection:analytics'] });

    const reloaded = create();
    expect(reloaded.getState()).toMatchObject({ hasVault: true, isLocked: true });
    expect(reloaded.getState().actions.lookup('connection:analytics', 'fp')).toEqual({ status: 'locked' });
    await reloaded.getState().actions.unlock(PASSPHRASE);
    expect(reloaded.getState().actions.lookup('connection:analytics', 'fp')).toEqual({
      status: 'ready',
      secrets: { password: 'hunter2-s3cr3t' },
    });
  });

  it('refuses a wrong passphrase and stays locked', async () => {
    const { store, create } = setup();
    await store.getState().actions.create(PASSPHRASE);
    const reloaded = create();
    await expect(reloaded.getState().actions.unlock('wrong')).rejects.toMatchObject({ code: 'forbidden' });
    expect(reloaded.getState().isLocked).toBe(true);
  });

  it('keeps session-only secrets out of storage, so a reload has lost them', async () => {
    const { data, store, create } = setup();
    await store.getState().actions.set('connection:temp', session({ token: 'only-this-tab' }));
    expect(store.getState().actions.lookup('connection:temp', 'fp')).toMatchObject({ status: 'ready' });
    expect([...data.values()].join()).not.toContain('only-this-tab');
    expect(create().getState().actions.lookup('connection:temp', 'fp')).toEqual({ status: 'missing' });
  });

  it('refuses secrets whose connection changed since they were saved', async () => {
    const { store } = setup();
    await store
      .getState()
      .actions.set('connection:analytics', session({ password: 'pw' }, 'relay=https://mine'));
    expect(store.getState().actions.lookup('connection:analytics', 'relay=https://evil')).toEqual({
      status: 'changed',
    });
  });

  it('needs an unlocked vault to save, and lock forgets only the saved secrets', async () => {
    const { store } = setup();
    await expect(store.getState().actions.set('k', saved({ a: '1' }))).rejects.toMatchObject({
      code: 'forbidden',
    });
    await store.getState().actions.create(PASSPHRASE);
    await store.getState().actions.set('saved', saved({ a: '1' }));
    await store.getState().actions.set('temp', session({ b: '2' }));
    store.getState().actions.lock();
    expect(store.getState().actions.lookup('saved', 'fp')).toEqual({ status: 'locked' });
    expect(store.getState().actions.lookup('temp', 'fp')).toMatchObject({ status: 'ready' });
  });

  it('bumps a key’s version whenever its secrets change', async () => {
    const { store } = setup();
    await store.getState().actions.set('k', session({ a: '1' }));
    await store.getState().actions.set('k', session({ a: '2' }));
    expect(store.getState().versions.k).toBe(2);
    await store.getState().actions.remove('k');
    expect(store.getState().versions.k).toBe(3);
    expect(store.getState().actions.lookup('k', 'fp')).toEqual({ status: 'missing' });
  });

  it('removes saved secrets from storage, but only while unlocked', async () => {
    const { data, store, create } = setup();
    await store.getState().actions.create(PASSPHRASE);
    await store.getState().actions.set('k', saved({ a: 'gone-soon' }));
    const locked = create();
    await expect(locked.getState().actions.remove('k')).rejects.toMatchObject({ code: 'forbidden' });
    await store.getState().actions.remove('k');
    expect(JSON.parse(data.get(VAULT_STORAGE_KEY) ?? '{}').keys).toEqual([]);
  });

  it('resets: deletes the vault and every saved secret', async () => {
    const { data, store, create } = setup();
    await store.getState().actions.create(PASSPHRASE);
    await store.getState().actions.set('k', saved({ a: '1' }));
    const reloaded = create();
    reloaded.getState().actions.reset();
    expect(data.has(VAULT_STORAGE_KEY)).toBe(false);
    expect(reloaded.getState()).toMatchObject({ hasVault: false, isLocked: false, savedKeys: [] });
    expect(reloaded.getState().actions.lookup('k', 'fp')).toEqual({ status: 'missing' });
  });

  it('reads a damaged vault as none', () => {
    const { data, create } = setup();
    data.set(VAULT_STORAGE_KEY, '{"version":1,"keys":"nope"}');
    expect(create().getState()).toMatchObject({ hasVault: false, isLocked: false });
  });
});
