import { describe, expect, it } from 'vite-plus/test';
import { relayErrorSchema, relayFramesSchema, sqlServerQuerySchema } from './relayContract';

describe('relayContract', () => {
  it('defaults the row limit and caps it', () => {
    expect(sqlServerQuerySchema.parse({ connectionString: 'Server=x', sql: 'SELECT 1' }).maxRows).toBe(
      10_000,
    );
    expect(
      sqlServerQuerySchema.safeParse({ connectionString: 'Server=x', sql: 'SELECT 1', maxRows: 100_001 })
        .success,
    ).toBe(false);
    expect(sqlServerQuerySchema.safeParse({ connectionString: ' ', sql: 'SELECT 1' }).success).toBe(false);
  });

  it('reads frames and errors as the app knows them', () => {
    const frames = relayFramesSchema.parse({
      frames: [{ fields: [{ name: 'n', type: 'number', values: [1, 2] }] }],
    });
    expect(frames.frames[0]?.length).toBe(2);
    expect(
      relayErrorSchema.safeParse({ error: { code: 'datasource', message: 'Login failed.' } }).success,
    ).toBe(true);
    expect(relayErrorSchema.safeParse({ error: { code: 'teapot', message: '' } }).success).toBe(false);
  });
});
