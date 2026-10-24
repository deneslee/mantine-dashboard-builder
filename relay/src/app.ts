import { createHash, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';
import { toAppError, type AppErrorCode } from '../../src/core/errors/AppError';
import {
  RELAY_ROUTES,
  mongoQuerySchema,
  mongoTestSchema,
  sqlServerQuerySchema,
  sqlServerTestSchema,
  type RelayError,
} from '../../src/core/relay/relayContract';
import type { Driver } from './Driver';
import { isLoopback, type RelayEnv } from './env';
import { scrub } from './hosts';
import type { MongoQuery, MongoTest } from './mongo';
import type { SqlServerQuery, SqlServerTest } from './sqlServer';

/**
 * The relay's HTTP API (routes in `relayContract.ts`). It keeps nothing: each request carries its
 * connection string, which never reaches a log or an error message.
 */

export interface Drivers {
  sqlServer: Driver<SqlServerQuery, SqlServerTest>;
  mongo: Driver<MongoQuery, MongoTest>;
}

const STATUS: Record<AppErrorCode, ContentfulStatusCode> = {
  validation: 400,
  forbidden: 403,
  not_found: 404,
  timeout: 504,
  datasource: 502,
  network: 502,
  unknown: 500,
};

const MAX_BODY = 256 * 1024;

const failure = (code: AppErrorCode, message: string, isRetryable = false): RelayError => ({
  error: { code, message, isRetryable },
});

const digest = (text: string) => createHash('sha256').update(text).digest();

export function createRelay({
  env,
  drivers,
  log = console.log,
}: {
  env: RelayEnv;
  drivers: Drivers;
  log?: (line: string) => void;
}) {
  const app = new Hono();
  const token = env.token === undefined ? undefined : digest(env.token);

  // One line per request, never its body.
  app.use('*', async (c, next) => {
    const started = performance.now();
    await next();
    log(`${c.req.method} ${c.req.path} ${c.res.status} ${Math.round(performance.now() - started)}ms`);
  });

  app.use('*', async (c, next) => {
    const origin = c.req.header('origin');
    if (origin !== undefined && !env.allowedOrigins.includes(origin))
      return c.json(
        failure(
          'forbidden',
          `The relay doesn’t answer pages from ${origin}. Whoever runs it can add the origin to RELAY_ALLOWED_ORIGINS.`,
        ),
        403,
      );
    // Without a token the relay serves this machine only. A site that points its own name at this
    // machine (DNS rebinding) still uses that name, so it's refused here.
    if (token === undefined && !isLoopback(new URL(c.req.url).hostname))
      return c.json(failure('forbidden', 'Without a token, the relay only answers on localhost.'), 403);
    // Chrome asks before a public site reaches a private address (Private Network Access).
    if (c.req.method === 'OPTIONS' && c.req.header('access-control-request-private-network') === 'true')
      c.res.headers.set('access-control-allow-private-network', 'true');
    await next();
  });

  app.use(
    '*',
    cors({
      origin: env.allowedOrigins,
      allowMethods: ['GET', 'POST'],
      allowHeaders: ['authorization', 'content-type'],
      maxAge: 600,
    }),
  );

  app.get(RELAY_ROUTES.health, (c) => c.json({ ok: true }));

  app.use('/v1/*', async (c, next) => {
    if (token === undefined) return next();
    const given = /^Bearer (.+)$/i.exec(c.req.header('authorization') ?? '')?.[1] ?? '';
    if (!timingSafeEqual(digest(given), token))
      return c.json(
        failure('forbidden', 'The relay token is missing or wrong. Check the connection’s relay token.'),
        401,
      );
    await next();
  });

  app.use(
    '/v1/*',
    bodyLimit({
      maxSize: MAX_BODY,
      onError: (c) => c.json(failure('validation', 'The request is over 256 KB.'), 413),
    }),
  );

  /** A POST route: the body parsed with `schema`, driver errors as relay errors without secrets. */
  const route = <S extends z.ZodType<{ connectionString: string }>>(
    path: string,
    schema: S,
    handle: (input: z.output<S>, signal: AbortSignal) => Promise<object>,
  ) =>
    app.post(path, async (c) => {
      const json: unknown = await c.req.json().catch(() => undefined);
      if (json === undefined) return c.json(failure('validation', 'Send a JSON body.'), 400);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        const [issue] = parsed.error.issues;
        return c.json(
          failure('validation', `${issue?.path.join('.') || 'body'}: ${issue?.message ?? 'invalid'}`),
          400,
        );
      }
      try {
        return c.json(await handle(parsed.data, c.req.raw.signal));
      } catch (error) {
        const { code, message, isRetryable } = toAppError(error);
        const text = scrub(message, parsed.data.connectionString);
        if (code === 'unknown') log(`  ${text}`);
        return c.json(failure(code, text, isRetryable), STATUS[code]);
      }
    });

  /** The row limit: what the query asks for, never more than the relay allows. */
  const capped = <T extends { maxRows: number }>(input: T): T => ({
    ...input,
    maxRows: Math.min(input.maxRows, env.maxRows),
  });

  route(RELAY_ROUTES.sqlServerQuery, sqlServerQuerySchema, async (input, signal) => ({
    frames: await drivers.sqlServer.query(capped(input), signal),
  }));
  route(RELAY_ROUTES.sqlServerTest, sqlServerTestSchema, async (input, signal) => ({
    ok: true,
    server: await drivers.sqlServer.test(input, signal),
  }));
  route(RELAY_ROUTES.mongoQuery, mongoQuerySchema, async (input, signal) => ({
    frames: await drivers.mongo.query(capped(input), signal),
  }));
  route(RELAY_ROUTES.mongoTest, mongoTestSchema, async (input, signal) => ({
    ok: true,
    server: await drivers.mongo.test(input, signal),
  }));

  app.notFound((c) => c.json(failure('not_found', `The relay has no ${c.req.method} ${c.req.path}.`), 404));
  app.onError((error, c) => {
    log(`  ${scrub(error instanceof Error ? (error.stack ?? error.message) : String(error))}`);
    return c.json(failure('unknown', 'The relay failed; its log says more.'), 500);
  });

  return app;
}
