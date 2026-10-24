import {
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StartQueryExecutionCommand,
  StopQueryExecutionCommand,
  type AthenaClient,
} from '@aws-sdk/client-athena';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { athenaQuery, athenaToFrame, createAthenaRuntime } from './athenaRuntime';

const range = { from: new Date('2026-10-24T00:00:00Z'), to: new Date('2026-10-25T00:00:00Z') };
const ctx = { range } as QueryContext;
const connection = {
  settings: { region: 'eu-west-1', workgroup: 'primary', catalog: 'AwsDataCatalog', database: 'shop' },
  secrets: { accessKeyId: 'AKIAABCDEFGHIJKLMNOP', secretAccessKey: 'secret-secret-secret' },
};
const columns = [
  { Name: 'day', Type: 'date' },
  { Name: 'orders', Type: 'bigint' },
  { Name: 'at', Type: 'timestamp with time zone' },
];

/** A fake client that answers by command, recording what it was sent. */
function fake(states: string[], pages: object[]) {
  const send = vi.fn(async (command: object) => {
    if (command instanceof StartQueryExecutionCommand) return { QueryExecutionId: 'q1' };
    if (command instanceof GetQueryExecutionCommand) {
      const state = states.shift() ?? 'SUCCEEDED';
      return { QueryExecution: { Status: { State: state, StateChangeReason: 'SYNTAX_ERROR: line 1:8' } } };
    }
    if (command instanceof GetQueryResultsCommand) return pages.shift() ?? {};
    if (command instanceof StopQueryExecutionCommand) return {};
    throw new Error(`unexpected ${command.constructor.name}`);
  });
  const runtime = createAthenaRuntime(() => ({ send }) as unknown as Pick<AthenaClient, 'send'>);
  return { send, runtime };
}

const row = (...values: (string | undefined)[]) => ({
  Data: values.map((VarCharValue) => ({ VarCharValue })),
});

describe('athenaQuery', () => {
  it('writes time macros as literals from the range', () => {
    expect(athenaQuery('WHERE at BETWEEN $__from AND $__to AND ms > $__fromMs', range)).toBe(
      "WHERE at BETWEEN from_iso8601_timestamp('2026-10-24T00:00:00.000Z') AND from_iso8601_timestamp('2026-10-25T00:00:00.000Z') AND ms > 1792800000000",
    );
  });
});

describe('athenaToFrame', () => {
  it('types columns and reads Athena’s strings, UTC timestamps included', () => {
    const frame = athenaToFrame(columns, [
      row('2026-10-24', '42', '2026-10-24 09:30:00.000 UTC'),
      row(undefined, '7', undefined),
    ]);
    expect(frame.fields.map((field) => [field.name, field.type, field.values])).toEqual([
      ['day', 'time', [Date.parse('2026-10-24T00:00:00Z'), null]],
      ['orders', 'number', [42, 7]],
      ['at', 'time', [Date.parse('2026-10-24T09:30:00Z'), null]],
    ]);
  });
});

describe('athenaRuntime', () => {
  it('starts the query, waits for it, and reads every page up to maxRows, skipping the header row', async () => {
    const { send, runtime } = fake(
      ['RUNNING'],
      [
        {
          ResultSet: {
            ResultSetMetadata: { ColumnInfo: columns },
            Rows: [row('day', 'orders', 'at'), row('2026-10-24', '1', undefined)],
          },
          NextToken: 't2',
        },
        { ResultSet: { Rows: [row('2026-10-25', '2', undefined), row('2026-10-26', '3', undefined)] } },
      ],
    );
    const frames = await runtime.query(
      connection,
      { sql: 'SELECT * FROM orders WHERE at > $__from', maxRows: 2 },
      ctx,
    );
    expect(frames[0]?.fields[1]?.values).toEqual([1, 2]);
    const start = send.mock.calls[0]?.[0] as StartQueryExecutionCommand;
    expect(start.input).toMatchObject({
      QueryString: "SELECT * FROM orders WHERE at > from_iso8601_timestamp('2026-10-24T00:00:00.000Z')",
      WorkGroup: 'primary',
      QueryExecutionContext: { Catalog: 'AwsDataCatalog', Database: 'shop' },
    });
  });

  it('reports a failed query with Athena’s reason', async () => {
    const { runtime } = fake(['FAILED'], []);
    await expect(runtime.query(connection, { sql: 'SELEC 1', maxRows: 10 }, ctx)).rejects.toMatchObject({
      code: 'datasource',
      message: 'Athena: SYNTAX_ERROR: line 1:8',
    });
  });

  it('stops the query when the widget no longer needs it', async () => {
    const { send, runtime } = fake(['RUNNING', 'RUNNING', 'RUNNING'], []);
    const controller = new AbortController();
    const query = runtime.query(connection, { sql: 'SELECT 1', maxRows: 10 }, ctx, controller.signal);
    await vi.waitFor(() =>
      expect(send).toHaveBeenCalledWith(expect.any(GetQueryExecutionCommand), expect.anything()),
    );
    controller.abort();
    await expect(query).rejects.toThrow();
    expect(send.mock.calls.some(([command]) => command instanceof StopQueryExecutionCommand)).toBe(true);
  });
});
