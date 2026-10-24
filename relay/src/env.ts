import { z } from 'zod';
import { DEFAULT_ROWS, MAX_ROWS } from '../../src/core/data/maxRows';

/**
 * The relay's settings, from environment variables (`.env.example` lists them). It listens on this
 * machine only unless it has a token, so nothing else on the network can use it.
 */

export interface RelayEnv {
  host: string;
  port: number;
  /** Required beyond this machine: every query must carry it as a bearer token. */
  token?: string;
  /** Origins whose pages may call the relay, e.g. `https://dashboards.example.com`. */
  allowedOrigins: string[];
  /** Database hosts the relay connects to; `*.` matches subdomains. */
  allowedHosts: string[];
  /** The most rows one query returns, whatever it asks for. */
  maxRows: number;
  timeoutMs: number;
}

export const isLoopback = (host: string) =>
  ['localhost', '::1', '[::1]'].includes(host.toLowerCase()) || /^127\.\d+\.\d+\.\d+$/.test(host);

const list = z.string().transform((text) =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

const port = z.coerce.number().int().min(1).max(65_535);

const envSchema = z
  .object({
    RELAY_HOST: z.string().trim().default('127.0.0.1'),
    RELAY_PORT: port.optional(),
    /** What most container hosts set. */
    PORT: port.optional(),
    RELAY_TOKEN: z.string().trim().optional(),
    RELAY_ALLOWED_ORIGINS: list.default([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ]),
    RELAY_ALLOWED_HOSTS: list.default(['*.database.windows.net', '*.mongodb.net', 'localhost', '127.0.0.1']),
    RELAY_MAX_ROWS: z.coerce.number().int().positive().max(MAX_ROWS).default(DEFAULT_ROWS),
    RELAY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300_000).default(30_000),
  })
  .superRefine((env, ctx) => {
    if (env.RELAY_TOKEN !== undefined && env.RELAY_TOKEN.length < 32)
      ctx.addIssue({
        code: 'custom',
        path: ['RELAY_TOKEN'],
        message: 'Use at least 32 characters, e.g. from `openssl rand -base64 32`.',
      });
    if (env.RELAY_TOKEN === undefined && !isLoopback(env.RELAY_HOST))
      ctx.addIssue({
        code: 'custom',
        path: ['RELAY_TOKEN'],
        message: `Set a token to listen on ${env.RELAY_HOST}: without one, anyone who can reach the relay can use it.`,
      });
    for (const origin of env.RELAY_ALLOWED_ORIGINS)
      if (URL.parse(origin)?.origin !== origin)
        ctx.addIssue({
          code: 'custom',
          path: ['RELAY_ALLOWED_ORIGINS'],
          message: `${origin} isn't an origin: give a scheme, a host and maybe a port, with no path.`,
        });
  });

/** The relay's settings from `env`. Throws with every problem when they're wrong. */
export function readEnv(env: Record<string, string | undefined>): RelayEnv {
  // An empty variable (`RELAY_TOKEN=`) counts as unset.
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const parsed = envSchema.safeParse(present);
  if (!parsed.success)
    throw new Error(
      `The relay's settings are wrong:\n${parsed.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n')}`,
    );
  const { data } = parsed;
  return {
    host: data.RELAY_HOST,
    port: data.RELAY_PORT ?? data.PORT ?? 8787,
    token: data.RELAY_TOKEN,
    allowedOrigins: data.RELAY_ALLOWED_ORIGINS,
    allowedHosts: data.RELAY_ALLOWED_HOSTS.map((host) => host.toLowerCase()),
    maxRows: data.RELAY_MAX_ROWS,
    timeoutMs: data.RELAY_TIMEOUT_MS,
  };
}
