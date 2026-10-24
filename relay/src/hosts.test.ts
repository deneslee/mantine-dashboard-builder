import { describe, expect, it } from 'vite-plus/test';
import { checkHosts, isHostAllowed, scrub } from './hosts';

const PATTERNS = ['*.database.windows.net', 'localhost'];

describe('isHostAllowed', () => {
  it('matches subdomains of a *. pattern, whatever the case or a trailing dot', () => {
    expect(isHostAllowed('shop.database.windows.net', PATTERNS)).toBe(true);
    expect(isHostAllowed('Shop.Database.Windows.Net.', PATTERNS)).toBe(true);
    expect(isHostAllowed('localhost', PATTERNS)).toBe(true);
  });

  it('refuses the bare domain, look-alikes and every other host', () => {
    for (const host of [
      'database.windows.net',
      'shop.database.windows.net.evil.example',
      'evildatabase.windows.net',
      'localhost.evil.example',
      '10.0.0.5',
      '',
    ])
      expect(isHostAllowed(host, PATTERNS), host).toBe(false);
  });
});

describe('checkHosts', () => {
  it('names the first refused host, and needs one', () => {
    expect(() => checkHosts(['localhost', '10.0.0.5'], PATTERNS)).toThrow(
      expect.objectContaining({ code: 'forbidden', message: expect.stringContaining('10.0.0.5') }),
    );
    expect(() => checkHosts([], PATTERNS)).toThrow(expect.objectContaining({ code: 'validation' }));
    expect(() => checkHosts(['shop.database.windows.net'], PATTERNS)).not.toThrow();
  });
});

describe('scrub', () => {
  it('removes the connection string and the password in it', () => {
    const connectionString =
      'Server=tcp:shop.database.windows.net,1433;User ID=reader;Password="p@ss;word!";Encrypt=True';
    expect(scrub(`Failed for ${connectionString}`, connectionString)).toBe('Failed for [connection string]');
    expect(scrub('Login failed: p@ss;word! was refused', connectionString)).toBe(
      'Login failed: [hidden] was refused',
    );
  });

  it('removes a MongoDB password, raw or percent-encoded', () => {
    const connectionString = 'mongodb+srv://reader:s%40cret99@cluster0.abc.mongodb.net/shop';
    expect(scrub('auth failed with s@cret99 and s%40cret99', connectionString)).toBe(
      'auth failed with [hidden] and [hidden]',
    );
  });

  it('removes anything that looks like credentials, even without the connection string', () => {
    expect(scrub('Cannot parse mongodb+srv://reader:s3cret@cluster0.abc.mongodb.net/?x')).toBe(
      'Cannot parse mongodb+srv://[hidden]@cluster0.abc.mongodb.net/?x',
    );
    expect(scrub('Bad option Password=hunter22;Encrypt=true')).toBe(
      'Bad option Password=[hidden];Encrypt=true',
    );
  });
});
