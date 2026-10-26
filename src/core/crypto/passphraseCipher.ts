/**
 * Encryption with a key derived from a passphrase, on WebCrypto alone: PBKDF2-SHA256 at OWASP's
 * 600,000 iterations (WebCrypto has no Argon2id), then AES-GCM-256, which also detects tampering.
 * The key is non-extractable, so nothing can read it back out of memory as bytes.
 * Research: https://github.com/deneslee/mantine-dashboard-builder/blob/0e400dd/.agents/planning/research/browser-secrets.md.
 */

export const PBKDF2_ITERATIONS = 600_000;

/** What gets stored: everything needed to decrypt `data` except the passphrase. */
export interface SealedBox {
  version: 1;
  iterations: number;
  /** Base64. */
  salt: string;
  /** Base64; a new one for every seal. */
  iv: string;
  /** Base64 ciphertext with the GCM tag. */
  data: string;
}

/** A passphrase-derived key and the salt and iterations it came from, which every seal stores. */
export interface VaultKey {
  key: CryptoKey;
  salt: string;
  iterations: number;
}

/** In chunks: spreading a large array into `fromCharCode` exceeds the argument limit. */
function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

/** Derives the key from a passphrase; with no salt, a new random one (creating a vault). */
export async function deriveKey(
  passphrase: string,
  {
    salt = toBase64(randomBytes(16)),
    iterations = PBKDF2_ITERATIONS,
  }: { salt?: string; iterations?: number } = {},
): Promise<VaultKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { key, salt, iterations };
}

/** Encrypts text under the key, with a fresh IV. */
export async function seal({ key, salt, iterations }: VaultKey, text: string): Promise<SealedBox> {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return { version: 1, iterations, salt, iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

/** Decrypts a box. Rejects when the key is wrong or the box was changed. */
export async function open({ key }: VaultKey, box: SealedBox): Promise<string> {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(box.iv) },
    key,
    fromBase64(box.data),
  );
  return new TextDecoder().decode(data);
}

/** Derives the key from the box's salt and iterations, then opens it: unlocking. Rejects on a wrong passphrase. */
export async function unlock(passphrase: string, box: SealedBox): Promise<{ key: VaultKey; text: string }> {
  const key = await deriveKey(passphrase, { salt: box.salt, iterations: box.iterations });
  return { key, text: await open(key, box) };
}
