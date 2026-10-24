import {
  DynamoDBClient,
  ExecuteStatementCommand,
  ListTablesCommand,
  type AttributeValue,
  type DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { z } from 'zod';
import { recordsToFrame } from '@/core/data/columnsToFrame';
import type { DataFrame } from '@/core/data/DataFrame';
import { expandTimeMacros, timeMacroValue } from '@/core/data/timeMacros';
import type { ResolvedRange } from '@/core/time/timeRange';
import type { DatasourceRuntime } from '@/plugins/OptionalPlugin';
import { awsCredentials, awsError } from './awsErrors';
import type { AwsSecrets, DynamoDbSettings, dynamodbSpecSchema } from './awsPlugin';

/**
 * DynamoDB: a PartiQL SELECT (the spec refuses anything else), page by page up to `maxRows`. Time
 * macros become `?` parameters: ISO strings, or epoch-millisecond numbers for `$__fromMs`.
 */

const SERVICE = 'DynamoDB';

/** The statement with `?` for each macro, and the parameters in order. */
export function dynamodbParameters(statement: string, range: ResolvedRange) {
  const { text, used } = expandTimeMacros(statement, () => '?');
  const parameters: AttributeValue[] = used.map((macro) =>
    macro.endsWith('Ms')
      ? { N: String(timeMacroValue(macro, range)) }
      : { S: String(timeMacroValue(macro, range)) },
  );
  return { statement: text, parameters };
}

/** Sets become arrays and binary becomes base64, so every value serializes. */
function plain(value: unknown): unknown {
  if (value instanceof Set) return [...value].map(plain);
  if (value instanceof Uint8Array) return btoa(String.fromCharCode(...value));
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
  return value;
}

/** Items as a DataFrame, one field per attribute; `timeFields` are read as times. */
export function dynamodbToFrame(
  items: Record<string, AttributeValue>[],
  timeFields: string[] = [],
): DataFrame {
  return recordsToFrame(
    items.map((item) => plain(unmarshall(item)) as Record<string, unknown>),
    { timeFields },
  );
}

type Spec = z.infer<typeof dynamodbSpecSchema>;
type MakeClient = (config: DynamoDBClientConfig) => Pick<DynamoDBClient, 'send'>;

export function createDynamoDbRuntime(makeClient: MakeClient = (config) => new DynamoDBClient(config)) {
  const clientFor = (settings: DynamoDbSettings, secrets: AwsSecrets) =>
    makeClient({ region: settings.region, credentials: awsCredentials(secrets) });

  const runtime: DatasourceRuntime<DynamoDbSettings, AwsSecrets> = {
    async query({ settings, secrets }, input, ctx, signal) {
      const spec = input as Spec;
      const client = clientFor(settings, secrets);
      const { statement, parameters } = dynamodbParameters(spec.statement, ctx.range);
      const items: Record<string, AttributeValue>[] = [];
      let token: string | undefined;
      try {
        do {
          const page = await client.send(
            new ExecuteStatementCommand({
              Statement: statement,
              ...(parameters.length ? { Parameters: parameters } : {}),
              NextToken: token,
            }),
            { abortSignal: signal },
          );
          items.push(...(page.Items ?? []));
          token = page.NextToken;
        } while (token && items.length < spec.maxRows);
      } catch (error) {
        throw awsError(error, SERVICE);
      }
      return [dynamodbToFrame(items.slice(0, spec.maxRows), spec.timeFields)];
    },
    async test({ settings, secrets }, signal) {
      try {
        await clientFor(settings, secrets).send(new ListTablesCommand({ Limit: 1 }), { abortSignal: signal });
      } catch (error) {
        throw awsError(error, SERVICE);
      }
      return `DynamoDB in ${settings.region}`;
    },
  };
  return runtime;
}

export const dynamodbRuntime = createDynamoDbRuntime();
