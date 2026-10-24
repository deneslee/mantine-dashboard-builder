import { describe, expect, it } from 'vite-plus/test';
import { isLoopback, readEnv } from './env';

const TOKEN = 'x'.repeat(32);

describe('readEnv', () => {
  it('listens on this machine for the dev server by default, with the free database hosts allowed', () => {
    expect(readEnv({})).toEqual({
      host: '127.0.0.1',
      port: 8787,
      token: undefined,
      allowedOrigins: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
      ],
      allowedHosts: ['*.database.windows.net', '*.mongodb.net', 'localhost', '127.0.0.1'],
      maxRows: 10_000,
      timeoutMs: 30_000,
    });
  });

  it('reads lists and numbers, takes the port container hosts set, and treats empty values as unset', () => {
    expect(
      readEnv({
        RELAY_HOST: '0.0.0.0',
        PORT: '10000',
        RELAY_TOKEN: TOKEN,
        RELAY_ALLOWED_ORIGINS: 'https://dashboards.example.com, https://deneslee.github.io',
        RELAY_ALLOWED_HOSTS: '*.Database.Windows.Net',
        RELAY_MAX_ROWS: '500',
        RELAY_TIMEOUT_MS: '',
      }),
    ).toEqual({
      host: '0.0.0.0',
      port: 10_000,
      token: TOKEN,
      allowedOrigins: ['https://dashboards.example.com', 'https://deneslee.github.io'],
      allowedHosts: ['*.database.windows.net'],
      maxRows: 500,
      timeoutMs: 30_000,
    });
    expect(readEnv({ RELAY_PORT: '9000', PORT: '10000' }).port).toBe(9000);
  });

  it('refuses to listen beyond this machine without a long token', () => {
    expect(() => readEnv({ RELAY_HOST: '0.0.0.0' })).toThrow(/Set a token to listen on 0\.0\.0\.0/);
    expect(() => readEnv({ RELAY_TOKEN: 'short' })).toThrow(/at least 32 characters/);
  });

  it('refuses origins with a path and row limits over the app’s', () => {
    expect(() => readEnv({ RELAY_ALLOWED_ORIGINS: 'http://localhost:5173/' })).toThrow(/isn't an origin/);
    expect(() => readEnv({ RELAY_MAX_ROWS: '100001' })).toThrow(/RELAY_MAX_ROWS/);
  });
});

describe('isLoopback', () => {
  it('knows this machine’s names', () => {
    expect(['localhost', '127.0.0.1', '127.1.2.3', '::1', '[::1]'].every(isLoopback)).toBe(true);
    expect(['0.0.0.0', 'relay.example.com', '10.0.0.1', '127.0.0.1.example.com'].some(isLoopback)).toBe(
      false,
    );
  });
});
