import { type ExecuteStatementCommand as RdsExecute, type RDSDataClient } from '@aws-sdk/client-rds-data';
import {
  DescribeStatementCommand,
  ExecuteStatementCommand as RedshiftExecute,
  GetStatementResultCommand,
  type RedshiftDataClient,
} from '@aws-sdk/client-redshift-data';
import {
  type ExecuteStatementCommand as PartiqlExecute,
  type DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { auroraParameters, createAuroraRuntime } from './auroraRuntime';
import { dynamodbSpecSchema } from './awsPlugin';
import { createDynamoDbRuntime, dynamodbParameters, dynamodbToFrame } from './dynamodbRuntime';
import { createRedshiftRuntime, redshiftParameters } from './redshiftRuntime';

const range = { from: new Date('2026-10-24T00:00:00Z'), to: new Date('2026-10-25T00:00:00Z') };
const ctx = { range } as QueryContext;
const secrets = { accessKeyId: 'AKIAABCDEFGHIJKLMNOP', secretAccessKey: 'secret-secret-secret' };

afterEach(() => vi.useRealTimers());

describe('Aurora', () => {
  const settings = {
    region: 'eu-west-1',
    resourceArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:shop',
    secretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:shop-reader',
    database: 'shop',
  };

  it('binds time macros as typed named parameters, each once', () => {
    expect(
      auroraParameters('WHERE at >= $__from AND at < $__to AND ms > $__fromMs OR at < $__to', range),
    ).toEqual({
      sql: 'WHERE at >= :__from AND at < :__to AND ms > :__fromMs OR at < :__to',
      parameters: [
        { name: '__from', typeHint: 'TIMESTAMP', value: { stringValue: '2026-10-24 00:00:00.000' } },
        { name: '__to', typeHint: 'TIMESTAMP', value: { stringValue: '2026-10-25 00:00:00.000' } },
        { name: '__fromMs', value: { longValue: 1792800000000 } },
      ],
    });
  });

  it('waits while a paused cluster resumes, then returns its rows', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const send = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('resuming'), { name: 'DatabaseResumingException' }))
      .mockResolvedValueOnce({
        columnMetadata: [{ name: 'n', typeName: 'int4' }],
        records: [[{ longValue: 1 }]],
      });
    const runtime = createAuroraRuntime(() => ({ send }) as unknown as Pick<RDSDataClient, 'send'>);
    const frames = runtime.query({ settings, secrets }, { sql: 'SELECT 1 AS n', maxRows: 10 }, ctx);
    await vi.advanceTimersByTimeAsync(5000);
    expect((await frames)[0]?.fields[0]?.values).toEqual([1]);
    expect((send.mock.calls[1]?.[0] as RdsExecute | undefined)?.input).toMatchObject({
      resourceArn: settings.resourceArn,
      secretArn: settings.secretArn,
      database: 'shop',
      includeResultMetadata: true,
    });
  });
});

describe('Redshift', () => {
  it('casts string parameters to the macro’s type', () => {
    expect(redshiftParameters('WHERE at > $__from AND ms < $__toMs', range)).toEqual({
      sql: 'WHERE at > CAST(:__from AS TIMESTAMP) AND ms < CAST(:__toMs AS BIGINT)',
      parameters: [
        { name: '__from', value: '2026-10-24 00:00:00.000' },
        { name: '__toMs', value: '1792886400000' },
      ],
    });
  });

  it('runs the statement to the end and reads its pages', async () => {
    const send = vi.fn(async (command: object) => {
      if (command instanceof RedshiftExecute) return { Id: 's1' };
      if (command instanceof DescribeStatementCommand) return { Status: 'FINISHED', HasResultSet: true };
      if (command instanceof GetStatementResultCommand)
        return command.input.NextToken
          ? { Records: [[{ longValue: 2 }]] }
          : {
              ColumnMetadata: [{ name: 'n', typeName: 'int8' }],
              Records: [[{ longValue: 1 }]],
              NextToken: 'p2',
            };
      throw new Error('unexpected');
    });
    const runtime = createRedshiftRuntime(() => ({ send }) as unknown as Pick<RedshiftDataClient, 'send'>);
    const frames = await runtime.query(
      { settings: { region: 'eu-west-1', workgroupName: 'default', database: 'dev' }, secrets },
      { sql: 'SELECT n FROM t', maxRows: 10 },
      ctx,
    );
    expect(frames[0]?.fields[0]).toEqual({ name: 'n', type: 'number', values: [1, 2] });
    expect((send.mock.calls[0]?.[0] as RedshiftExecute | undefined)?.input).toMatchObject({
      WorkgroupName: 'default',
      Database: 'dev',
    });
  });
});

describe('DynamoDB', () => {
  it('only runs SELECT statements', () => {
    expect(dynamodbSpecSchema.safeParse({ statement: 'SELECT * FROM "t"' }).success).toBe(true);
    expect(dynamodbSpecSchema.safeParse({ statement: 'DELETE FROM "t" WHERE pk = 1' }).success).toBe(false);
    expect(dynamodbSpecSchema.safeParse({ statement: 'UPDATE "t" SET a = 1' }).success).toBe(false);
  });

  it('turns macros into ? parameters in order', () => {
    expect(dynamodbParameters('SELECT * FROM "t" WHERE at > $__from AND ms < $__toMs', range)).toEqual({
      statement: 'SELECT * FROM "t" WHERE at > ? AND ms < ?',
      parameters: [{ S: '2026-10-24T00:00:00.000Z' }, { N: '1792886400000' }],
    });
  });

  it('unmarshalls items, with sets as arrays and time fields as times', () => {
    const frame = dynamodbToFrame(
      [
        { pk: { S: 'a' }, total: { N: '10' }, tags: { SS: ['x', 'y'] }, at: { S: '2026-10-24T09:30:00Z' } },
        { pk: { S: 'b' }, total: { N: '5' } },
      ],
      ['at'],
    );
    expect(frame.fields.map((field) => [field.name, field.type, field.values])).toEqual([
      ['pk', 'string', ['a', 'b']],
      ['total', 'number', [10, 5]],
      ['tags', 'string', ['["x","y"]', null]],
      ['at', 'time', [Date.parse('2026-10-24T09:30:00Z'), null]],
    ]);
  });

  it('pages through results up to maxRows', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ Items: [{ pk: { S: 'a' } }], NextToken: 'n' })
      .mockResolvedValueOnce({ Items: [{ pk: { S: 'b' } }, { pk: { S: 'c' } }] });
    const runtime = createDynamoDbRuntime(() => ({ send }) as unknown as Pick<DynamoDBClient, 'send'>);
    const frames = await runtime.query(
      { settings: { region: 'eu-west-1' }, secrets },
      { statement: 'SELECT * FROM "t"', maxRows: 2 },
      ctx,
    );
    expect(frames[0]?.length).toBe(2);
    expect((send.mock.calls[1]?.[0] as PartiqlExecute | undefined)?.input.NextToken).toBe('n');
  });
});
