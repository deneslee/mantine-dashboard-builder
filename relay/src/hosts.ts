import { AppError } from '../../src/core/errors/AppError';

/**
 * The databases the relay may connect to (`RELAY_ALLOWED_HOSTS`), so a token can't turn it into a
 * way into other machines on its network.
 */

/** `x.database.windows.net` matches `*.database.windows.net`; other patterns match exactly. */
export function isHostAllowed(host: string, patterns: readonly string[]): boolean {
  const name = host.trim().toLowerCase().replace(/\.$/, '');
  if (!name) return false;
  return patterns.some((pattern) =>
    pattern.startsWith('*.')
      ? name.endsWith(pattern.slice(1)) && name.length > pattern.length - 1
      : name === pattern,
  );
}

/** Throws unless every host is allowed. */
export function checkHosts(hosts: readonly string[], patterns: readonly string[]): void {
  if (hosts.length === 0) throw new AppError('validation', 'The connection string names no server.');
  const refused = hosts.find((host) => !isHostAllowed(host, patterns));
  if (refused !== undefined)
    throw new AppError(
      'forbidden',
      `The relay doesn't connect to ${refused}. Whoever runs it can add the host to RELAY_ALLOWED_HOSTS.`,
      { isRetryable: false },
    );
}

/**
 * A driver's message without the connection string or anything in it that looks like a password,
 * so errors and logs never show one.
 */
export function scrub(text: string, connectionString?: string): string {
  let result = text;
  if (connectionString) {
    result = result.replaceAll(connectionString, '[connection string]');
    for (const secret of secretsIn(connectionString)) result = result.replaceAll(secret, '[hidden]');
  }
  return result
    .replace(/(mongodb(?:\+srv)?:\/\/)[^\s/@]*@/gi, '$1[hidden]@')
    .replace(/\b(password|pwd)(\s*=\s*)("[^"]*"|'[^']*'|[^;\s]*)/gi, '$1$2[hidden]');
}

/** Values in a connection string that are secret: the password in a URI, and keys like `Password=`. */
function secretsIn(connectionString: string): string[] {
  const values: string[] = [];
  const userinfo = /^mongodb(?:\+srv)?:\/\/([^/@]*)@/i.exec(connectionString.trim())?.[1];
  const password = userinfo?.split(':')[1];
  if (password) {
    values.push(password);
    try {
      values.push(decodeURIComponent(password));
    } catch {
      // Not percent-encoded: the raw value is enough.
    }
  }
  for (const [, value = ''] of connectionString.matchAll(
    /(?:^|;)\s*(?:password|pwd|client secret|token|msi secret)\s*=\s*("[^"]*"|'[^']*'|[^;]*)/gi,
  ))
    values.push(value.trim().replace(/^(["'])(.*)\1$/, '$2'));
  // Short values would blank out ordinary words.
  return values.filter((value) => value.length >= 4);
}
