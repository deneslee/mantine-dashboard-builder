import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { relayTestResultSchema } from '@/core/relay/relayContract';
import { relayRequest } from './relayClient';
import { isRelayUrl } from './relayFields';

afterEach(() => vi.unstubAllGlobals());

const request = (signal?: AbortSignal) =>
  relayRequest({
    relayUrl: 'http://localhost:8787/',
    token: 'relay-token',
    route: '/v1/sqlserver/test',
    body: { connectionString: 'Server=x' },
    schema: relayTestResultSchema,
    signal,
  });

describe('relayRequest', () => {
  it('posts JSON with the token and reads the answer', async () => {
    const fetch = vi.fn(
      async (_url: string, _init: RequestInit) => new Response('{"ok":true,"server":"SQL Server 2022"}'),
    );
    vi.stubGlobal('fetch', fetch);
    await expect(request()).resolves.toEqual({ ok: true, server: 'SQL Server 2022' });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('http://localhost:8787/v1/sqlserver/test');
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer relay-token' },
      body: '{"connectionString":"Server=x"}',
    });
  });

  it('passes on the relay’s own errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            '{"error":{"code":"forbidden","message":"SQL Server refused the sign-in.","isRetryable":false}}',
            {
              status: 403,
            },
          ),
      ),
    );
    await expect(request()).rejects.toMatchObject({
      code: 'forbidden',
      message: 'SQL Server refused the sign-in.',
      isRetryable: false,
    });
  });

  it('says when the relay can’t be reached or answers something else', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(request()).rejects.toMatchObject({
      code: 'network',
      message: expect.stringContaining('vp run relay'),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Bad gateway', { status: 502 })),
    );
    await expect(request()).rejects.toMatchObject({ code: 'datasource', message: 'The relay answered 502.' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"ok":true}')),
    );
    await expect(request()).rejects.toMatchObject({ code: 'datasource', isRetryable: false });
  });

  it('lets the caller cancel', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
          ),
      ),
    );
    const pending = request(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('isRelayUrl', () => {
  it('takes https anywhere and http only on this machine', () => {
    expect(
      [
        'https://relay.example.com',
        'https://example.com/relay',
        'http://localhost:8787',
        'http://127.0.0.1:8787',
        'http://[::1]:8787',
      ].every(isRelayUrl),
    ).toBe(true);
    expect(
      [
        'http://relay.example.com',
        'ftp://localhost',
        'https://u:p@relay.example.com',
        'https://relay.example.com/?x=1',
        'relay',
      ].some(isRelayUrl),
    ).toBe(false);
  });
});
