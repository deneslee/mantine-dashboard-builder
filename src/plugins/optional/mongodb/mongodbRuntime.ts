import type { z } from 'zod';
import { replaceTimeTokens, timeMacroValue } from '@/core/data/timeMacros';
import { AppError } from '@/core/errors/AppError';
import type { ResolvedRange } from '@/core/time/timeRange';
import {
  RELAY_ROUTES,
  relayFramesSchema,
  relayTestResultSchema,
  type MongoQuery,
} from '@/core/relay/relayContract';
import type { DatasourceRuntime } from '@/plugins/OptionalPlugin';
import { relayRequest } from '../relay/relayClient';
import type { MongodbSecrets, MongodbSettings, mongodbSpecSchema } from './mongodbPlugin';

/**
 * MongoDB through the relay. The pipeline goes as Extended JSON, with `"$__from"` and `"$__to"` as
 * `{"$date": …}` and `"$__fromMs"` and `"$__toMs"` as numbers.
 */

type Spec = z.infer<typeof mongodbSpecSchema>;

/** The pipeline as Extended JSON text, its time macros replaced with the range. */
export function mongoPipeline(pipeline: Spec['pipeline'], range: ResolvedRange): string {
  return JSON.stringify(
    replaceTimeTokens(pipeline, (macro) =>
      macro.endsWith('Ms') ? timeMacroValue(macro, range) : { $date: timeMacroValue(macro, range) },
    ),
  );
}

export const mongodbRuntime: DatasourceRuntime<MongodbSettings, MongodbSecrets> = {
  async query({ settings, secrets }, input, ctx, signal) {
    const spec = input as Spec;
    const database = spec.database ?? settings.database;
    if (!database)
      throw new AppError('validation', 'Name the database, in the query or in the connection.', {
        isRetryable: false,
      });
    const body: MongoQuery = {
      connectionString: secrets.connectionString,
      database,
      collection: spec.collection,
      pipeline: mongoPipeline(spec.pipeline, ctx.range),
      maxRows: spec.maxRows,
    };
    const { frames } = await relayRequest({
      relayUrl: settings.relayUrl,
      token: secrets.relayToken,
      route: RELAY_ROUTES.mongoQuery,
      body,
      schema: relayFramesSchema,
      signal,
    });
    return frames;
  },
  async test({ settings, secrets }, signal) {
    const { server } = await relayRequest({
      relayUrl: settings.relayUrl,
      token: secrets.relayToken,
      route: RELAY_ROUTES.mongoTest,
      body: { connectionString: secrets.connectionString, database: settings.database },
      schema: relayTestResultSchema,
      signal,
    });
    return server;
  },
};
