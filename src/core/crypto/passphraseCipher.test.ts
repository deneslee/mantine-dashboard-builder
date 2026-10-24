import { describe, expect, it } from 'vite-plus/test';
import { PBKDF2_ITERATIONS, deriveKey, open, seal, unlock } from './passphraseCipher';

// Fewer iterations keep the tests fast; the store always uses PBKDF2_ITERATIONS.
const FAST = { iterations: 1_000 };

describe('passphraseCipher', () => {
  it('uses OWASP’s iteration count by default', async () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000);
    const key = await deriveKey('correct horse battery staple');
    expect(key.iterations).toBe(600_000);
    expect(key.key.extractable).toBe(false);
  });

  it('opens what it sealed, with the same passphrase only', async () => {
    const key = await deriveKey('correct horse battery staple', FAST);
    const box = await seal(key, '{"secret":"s3cr3t"}');
    expect(box.data).not.toContain('s3cr3t');
    expect(atob(box.data)).not.toContain('s3cr3t');
    expect((await unlock('correct horse battery staple', box)).text).toBe('{"secret":"s3cr3t"}');
    await expect(unlock('wrong horse', box)).rejects.toThrow();
  });

  it('uses a new IV for every seal and keeps the salt and iterations', async () => {
    const key = await deriveKey('passphrase', FAST);
    const [a, b] = await Promise.all([seal(key, 'same'), seal(key, 'same')]);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
    expect(a.salt).toBe(key.salt);
    expect(a.iterations).toBe(1_000);
    expect(await open(key, b)).toBe('same');
  });

  it('rejects a box that was changed', async () => {
    const key = await deriveKey('passphrase', FAST);
    const box = await seal(key, 'payload');
    const bytes = Uint8Array.from(atob(box.data), (c) => c.charCodeAt(0));
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    await expect(open(key, { ...box, data: btoa(String.fromCharCode(...bytes)) })).rejects.toThrow();
  });

  it('derives a new salt for each new key', async () => {
    const [a, b] = await Promise.all([deriveKey('same', FAST), deriveKey('same', FAST)]);
    expect(a.salt).not.toBe(b.salt);
  });
});
