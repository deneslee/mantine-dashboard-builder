import { serve } from '@hono/node-server';
import { createRelay } from './app';
import { readEnv, type RelayEnv } from './env';
import { createMongoDriver } from './mongo';
import { createSqlServerDriver } from './sqlServer';

/** Starts the relay: `vp run relay` in development, `node dist/server.mjs` once built. */

try {
  process.loadEnvFile();
} catch {
  // No .env file: the environment alone configures the relay.
}

let env: RelayEnv;
try {
  env = readEnv(process.env);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const drivers = { sqlServer: createSqlServerDriver(env), mongo: createMongoDriver(env) };
const app = createRelay({ env, drivers });
const host = env.host.includes(':') ? `[${env.host}]` : env.host;

const server = serve({ fetch: app.fetch, hostname: env.host, port: env.port }, ({ port }) => {
  console.log(
    `Relay on http://${host}:${port}, ${env.token ? 'token required' : 'this machine only'}, for ${env.allowedOrigins.join(', ')}`,
  );
});

const stop = () => {
  server.close();
  void Promise.allSettled([drivers.sqlServer.close(), drivers.mongo.close()]).then(() => process.exit(0));
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
