import { AppError } from '@/core/errors/AppError';
import { googleError } from './googleApi';
import { serviceAccountKeySchema, type GoogleSecrets } from './googlePlugin';

/**
 * Tokens for Google APIs, in the browser. A service-account key signs a JWT with WebCrypto (RS256),
 * which Google's token endpoint exchanges for an access token; the token is kept in memory until 5
 * minutes before it expires. A pasted access token is used as it is.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const LIFETIME_S = 3600;
const EARLY_S = 300;

export const SCOPES = {
  bigquery: 'https://www.googleapis.com/auth/bigquery',
  firestore: 'https://www.googleapis.com/auth/datastore',
} as const;

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
const encodeJson = (value: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

/** The DER bytes of a PEM private key (`-----BEGIN PRIVATE KEY-----`). */
function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

/** A signed JWT asking for `scope`, for the OAuth JWT-bearer grant. */
export async function signServiceAccountJwt(keyText: string, scope: string, nowS: number): Promise<string> {
  const key = serviceAccountKeySchema.parse(JSON.parse(keyText));
  const header = { alg: 'RS256', typ: 'JWT', ...(key.private_key_id ? { kid: key.private_key_id } : {}) };
  const claims = { iss: key.client_email, scope, aud: TOKEN_URL, iat: nowS, exp: nowS + LIFETIME_S };
  const unsigned = `${encodeJson(header)}.${encodeJson(claims)}`;
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pemToDer(key.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  } catch (error) {
    throw new AppError('validation', "The service-account key's private key can't be read.", {
      cause: error,
      isRetryable: false,
    });
  }
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

/** Tokens by service account and scope; in memory only. */
const cache = new Map<string, { token: string; expiresAtS: number }>();

/** Forgets every token, e.g. when a test starts. */
export const clearTokenCache = () => cache.clear();

/** An access token for `scope` from the connection's secrets. Rejects with an AppError. */
export async function getAccessToken(
  secrets: GoogleSecrets,
  scope: string,
  { signal, nowS = Math.floor(Date.now() / 1000) }: { signal?: AbortSignal; nowS?: number } = {},
): Promise<string> {
  if (!secrets.serviceAccountKey) {
    if (secrets.accessToken) return secrets.accessToken;
    throw new AppError('forbidden', 'Add a service-account key or an access token.', { isRetryable: false });
  }
  const { client_email: email } = serviceAccountKeySchema.parse(JSON.parse(secrets.serviceAccountKey));
  const cacheKey = `${email} ${scope}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAtS - EARLY_S > nowS) return cached.token;

  const assertion = await signServiceAccountJwt(secrets.serviceAccountKey, scope, nowS);
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AppError('network', 'Could not reach Google to sign in. Check your connection.', {
      cause: error,
    });
  }
  const json = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  } | null;
  if (!res.ok || !json?.access_token)
    throw res.status === 400 || res.status === 401
      ? new AppError(
          'forbidden',
          `Google refused the service-account key: ${json?.error_description ?? res.status}`,
          {
            isRetryable: false,
          },
        )
      : googleError(res.status, json, 'Google sign-in');
  cache.set(cacheKey, { token: json.access_token, expiresAtS: nowS + (json.expires_in ?? LIFETIME_S) });
  return json.access_token;
}
