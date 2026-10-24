import { BSON, MongoClient, type Document, type MongoClientOptions } from 'mongodb';
import { ConnectionString } from 'mongodb-connection-string-url';
import type { z } from 'zod';
import { recordsToFrame } from '../../src/core/data/columnsToFrame';
import { AppError, isAppError } from '../../src/core/errors/AppError';
import { findDeniedMongoOperator } from '../../src/core/relay/mongoOperators';
import type { mongoQuerySchema, mongoTestSchema } from '../../src/core/relay/relayContract';
import type { Driver } from './Driver';
import { checkHosts } from './hosts';
import { createPoolCache } from './poolCache';

/**
 * MongoDB and Atlas through the official driver. Only `aggregate` runs, with `$limit` appended and
 * `maxTimeMS` set; stages that write or run JavaScript are refused before anything is sent.
 */

export type MongoQuery = z.output<typeof mongoQuerySchema>;
export type MongoTest = z.output<typeof mongoTestSchema>;

/**
 * Options that would read files on the relay's machine, connect through another host, or sign in
 * with credentials that aren't in the string (the machine's cloud identity).
 */
const DENIED_OPTIONS = new Set([
  'tlscafile',
  'tlscertificatekeyfile',
  'tlscertificatekeyfilepassword',
  'tlscrlfile',
  'sslca',
  'sslcert',
  'sslkey',
  'proxyhost',
  'proxyport',
  'proxyusername',
  'proxypassword',
  'authmechanismproperties',
]);
const AUTH_MECHANISMS = new Set(['DEFAULT', 'SCRAM-SHA-1', 'SCRAM-SHA-256', 'PLAIN']);

const hostName = (host: string) =>
  host.startsWith('[') ? host.slice(1, host.indexOf(']')) : host.replace(/:\d+$/, '');

/**
 * Checks a connection string with the parser the driver itself uses, so the hosts checked are the
 * hosts it connects to: each seed host, or the SRV name, whose records must stay in its domain.
 */
export function checkMongoConnectionString(connectionString: string, allowedHosts: readonly string[]): void {
  let url: ConnectionString;
  try {
    url = new ConnectionString(connectionString);
  } catch (error) {
    throw new AppError('validation', `That isn't a MongoDB connection string: ${(error as Error).message}`, {
      isRetryable: false,
    });
  }
  checkHosts(url.hosts.map(hostName), allowedHosts);
  for (const [key, value] of url.searchParams) {
    const option = key.toLowerCase();
    if (DENIED_OPTIONS.has(option))
      throw new AppError('validation', `The relay doesn’t accept the ${key} option.`, { isRetryable: false });
    if (option === 'authmechanism' && !AUTH_MECHANISMS.has(value.toUpperCase()))
      throw new AppError(
        'validation',
        `Sign in with a user and password (SCRAM); the relay doesn’t use ${value}.`,
        { isRetryable: false },
      );
  }
}

/** A pipeline sent as Extended JSON, so `{"$date": …}` and `{"$oid": …}` become BSON values. */
export function parsePipeline(text: string): Document[] {
  let pipeline: unknown;
  try {
    pipeline = BSON.EJSON.parse(text, { relaxed: true });
  } catch (error) {
    throw new AppError('validation', `The pipeline isn't valid Extended JSON: ${(error as Error).message}`, {
      isRetryable: false,
    });
  }
  const isStage = (stage: unknown) =>
    Boolean(stage) &&
    typeof stage === 'object' &&
    !Array.isArray(stage) &&
    Object.keys(stage as object).length === 1 &&
    Object.keys(stage as object)[0]!.startsWith('$');
  if (!Array.isArray(pipeline) || !pipeline.every(isStage))
    throw new AppError(
      'validation',
      'A pipeline is a list of stages, each with one operator: [{"$match": {}}, {"$sort": {"_id": -1}}].',
      { isRetryable: false },
    );
  const denied = findDeniedMongoOperator(pipeline);
  if (denied)
    throw new AppError('validation', `The relay only reads, so pipelines can’t use ${denied}.`, {
      isRetryable: false,
    });
  return pipeline as Document[];
}

/**
 * A BSON value as plain JSON: ids and UUIDs as strings, 64-bit and decimal numbers as numbers (they
 * may lose precision), binary data as its size. Dates stay dates, so their fields read as times.
 */
export function bsonToPlain(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(bsonToPlain);
  switch ((value as { _bsontype?: string })._bsontype) {
    case undefined:
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, bsonToPlain(item)]));
    case 'ObjectId':
      return (value as BSON.ObjectId).toHexString();
    case 'Long':
      return (value as BSON.Long).toNumber();
    case 'Decimal128':
      return Number((value as BSON.Decimal128).toString());
    case 'Double':
    case 'Int32':
      return (value as BSON.Double).valueOf();
    case 'Timestamp':
      return new Date((value as BSON.Timestamp).t * 1000);
    case 'Binary': {
      const binary = value as BSON.Binary;
      return binary.sub_type === BSON.Binary.SUBTYPE_UUID
        ? binary.toUUID().toHexString()
        : `${binary.length()} bytes`;
    }
    default:
      return BSON.EJSON.stringify(value as Document, { relaxed: true });
  }
}

/** A driver error as an `AppError` that says what to fix. */
export function mongoError(error: unknown): AppError {
  if (isAppError(error)) return error;
  const {
    name = '',
    code,
    message = 'MongoDB failed.',
  } = error as { name?: string; code?: unknown; message?: string };
  if (name === 'MongoServerError') {
    if (code === 18 || (code === 8000 && /auth/i.test(message)))
      return new AppError('forbidden', `MongoDB refused the sign-in: ${message}`, { isRetryable: false });
    if (code === 13)
      return new AppError('forbidden', `MongoDB denied access: ${message}`, { isRetryable: false });
    if (code === 50)
      return new AppError('timeout', `The pipeline ran too long and was stopped: ${message}`, {
        isRetryable: false,
      });
    return new AppError('datasource', `MongoDB: ${message}`, { isRetryable: false });
  }
  if (['MongoParseError', 'MongoInvalidArgumentError', 'MongoAPIError'].includes(name))
    return new AppError('validation', `MongoDB: ${message}`, { isRetryable: false });
  if (name === 'MongoNetworkTimeoutError')
    return new AppError('timeout', `MongoDB didn’t answer in time: ${message}`);
  if (
    name.startsWith('MongoNetwork') ||
    name === 'MongoServerSelectionError' ||
    name === 'MongoTopologyClosedError'
  )
    return new AppError('network', `Could not reach MongoDB: ${message}`);
  return new AppError('datasource', `MongoDB: ${message}`);
}

/** What the driver uses of a connected client; tests pass a fake. */
export type MongoConnection = Pick<MongoClient, 'db' | 'close'>;

export function createMongoDriver({
  allowedHosts,
  timeoutMs,
  connect = (connectionString, options) => new MongoClient(connectionString, options).connect(),
}: {
  allowedHosts: readonly string[];
  timeoutMs: number;
  connect?: (connectionString: string, options: MongoClientOptions) => Promise<MongoConnection>;
}): Driver<MongoQuery, MongoTest> {
  const clients = createPoolCache<MongoConnection>({
    open: async (connectionString) => {
      checkMongoConnectionString(connectionString, allowedHosts);
      return connect(connectionString, {
        appName: 'dashboard-relay',
        serverSelectionTimeoutMS: Math.min(timeoutMs, 15_000),
        connectTimeoutMS: Math.min(timeoutMs, 10_000),
        maxPoolSize: 5,
        maxIdleTimeMS: 60_000,
      });
    },
    close: (client) => client.close(),
  });
  const clientFor = (connectionString: string) =>
    clients.get(connectionString).catch((error: unknown) => {
      throw mongoError(error);
    });

  return {
    async query({ connectionString, database, collection, pipeline, maxRows }, signal) {
      const stages = parsePipeline(pipeline);
      const client = await clientFor(connectionString);
      const cursor = client
        .db(database)
        .collection(collection)
        .aggregate([...stages, { $limit: maxRows }], { maxTimeMS: timeoutMs });
      const stop = () => void cursor.close().catch(() => {});
      signal?.addEventListener('abort', stop, { once: true });
      try {
        const documents = await cursor.toArray();
        return [
          recordsToFrame(
            documents.map((document) => bsonToPlain(document) as Record<string, unknown>),
            { name: collection },
          ),
        ];
      } catch (error) {
        throw mongoError(error);
      } finally {
        signal?.removeEventListener('abort', stop);
      }
    },
    async test({ connectionString, database }) {
      const client = await clientFor(connectionString);
      try {
        const { version } = await client.db('admin').command({ buildInfo: 1 });
        if (!database) return `MongoDB ${String(version)}`;
        const collections = await client
          .db(database)
          .listCollections({}, { nameOnly: true, authorizedCollections: true })
          .toArray();
        return `MongoDB ${String(version)}, database ${database} (${collections.length} collections)`;
      } catch (error) {
        throw mongoError(error);
      }
    },
    close: () => clients.closeAll(),
  };
}
