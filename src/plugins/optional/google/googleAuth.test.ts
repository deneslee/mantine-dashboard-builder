import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { SCOPES, clearTokenCache, getAccessToken, signServiceAccountJwt } from './googleAuth';

let keyText: string;
let publicKey: CryptoKey;

/** A real RSA key, so the signature is checked with WebCrypto as Google would. */
beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  publicKey = pair.publicKey;
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const base64 = btoa(String.fromCharCode(...der)).replace(/(.{64})/g, '$1\n');
  keyText = JSON.stringify({
    type: 'service_account',
    project_id: 'my-dashboards-123',
    private_key_id: 'key-1',
    private_key: `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----\n`,
    client_email: 'reader@my-dashboards-123.iam.gserviceaccount.com',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearTokenCache();
});

const fromBase64Url = (text: string) =>
  Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
const decode = (part: string) => JSON.parse(new TextDecoder().decode(fromBase64Url(part)));

describe('signServiceAccountJwt', () => {
  it('signs an RS256 JWT for the scope that the key’s public half verifies', async () => {
    const jwt = await signServiceAccountJwt(keyText, SCOPES.bigquery, 1_800_000_000);
    const [header, claims, signature] = jwt.split('.') as [string, string, string];
    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'key-1' });
    expect(decode(claims)).toEqual({
      iss: 'reader@my-dashboards-123.iam.gserviceaccount.com',
      scope: SCOPES.bigquery,
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_800_000_000,
      exp: 1_800_003_600,
    });
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      fromBase64Url(signature),
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(isValid).toBe(true);
  });
});

describe('getAccessToken', () => {
  const tokenResponse = (body: object, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }));

  it('exchanges the JWT at Google’s token endpoint and reuses the token until 5 minutes before it expires', async () => {
    const fetch = tokenResponse({ access_token: 'ya29.token', expires_in: 3600 });
    vi.stubGlobal('fetch', fetch);
    const secrets = { serviceAccountKey: keyText };
    expect(await getAccessToken(secrets, SCOPES.bigquery, { nowS: 1000 })).toBe('ya29.token');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect((init.body as URLSearchParams).toString()).toContain(
      'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer',
    );
    await getAccessToken(secrets, SCOPES.bigquery, { nowS: 1000 + 3600 - 301 });
    expect(fetch).toHaveBeenCalledTimes(1);
    await getAccessToken(secrets, SCOPES.bigquery, { nowS: 1000 + 3600 - 299 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses a pasted access token as it is', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await getAccessToken({ accessToken: 'ya29.pasted' }, SCOPES.firestore)).toBe('ya29.pasted');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports a refused key as forbidden, with Google’s reason', async () => {
    vi.stubGlobal(
      'fetch',
      tokenResponse({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }, 400),
    );
    await expect(getAccessToken({ serviceAccountKey: keyText }, SCOPES.bigquery)).rejects.toMatchObject({
      code: 'forbidden',
      message: expect.stringContaining('Invalid JWT Signature.'),
    });
  });
});
