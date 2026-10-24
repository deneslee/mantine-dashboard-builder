import type { z } from 'zod';
import { expandTimeMacros } from '@/core/data/timeMacros';
import {
  RELAY_ROUTES,
  relayFramesSchema,
  relayTestResultSchema,
  type SqlServerQuery,
} from '@/core/relay/relayContract';
import type { DatasourceRuntime } from '@/plugins/OptionalPlugin';
import { relayRequest } from '../relay/relayClient';
import type { AzureSqlSecrets, AzureSqlSettings, azureSqlSpecSchema } from './azureSqlPlugin';

/**
 * Azure SQL through the relay. Time macros become the parameters the relay binds: `@__from` and
 * `@__to` (`datetime2`), `@__fromMs` and `@__toMs` (`bigint`).
 */

type Spec = z.infer<typeof azureSqlSpecSchema>;

export const azureSqlRuntime: DatasourceRuntime<AzureSqlSettings, AzureSqlSecrets> = {
  async query({ settings, secrets }, input, ctx, signal) {
    const spec = input as Spec;
    const body: SqlServerQuery = {
      connectionString: secrets.connectionString,
      sql: expandTimeMacros(spec.sql, (macro) => `@__${macro}`).text,
      range: { from: ctx.range.from.toISOString(), to: ctx.range.to.toISOString() },
      maxRows: spec.maxRows,
    };
    const { frames } = await relayRequest({
      relayUrl: settings.relayUrl,
      token: secrets.relayToken,
      route: RELAY_ROUTES.sqlServerQuery,
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
      route: RELAY_ROUTES.sqlServerTest,
      body: { connectionString: secrets.connectionString },
      schema: relayTestResultSchema,
      signal,
    });
    return server;
  },
};
