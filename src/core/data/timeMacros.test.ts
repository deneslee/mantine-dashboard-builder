import { describe, expect, it } from 'vite-plus/test';
import { expandTimeMacros, replaceTimeTokens, timeMacroValue, toSqlTimestamp } from './timeMacros';

const range = { from: new Date('2026-10-24T00:00:00Z'), to: new Date('2026-10-25T00:00:00Z') };

describe('expandTimeMacros', () => {
  it('replaces each macro and lists them in order, repeats included', () => {
    const { text, used } = expandTimeMacros(
      'SELECT * FROM t WHERE ts >= $__from AND ts < $__to AND ms > $__fromMs AND ts < $__to',
      (macro) => `@__${macro}`,
    );
    expect(text).toBe('SELECT * FROM t WHERE ts >= @__from AND ts < @__to AND ms > @__fromMs AND ts < @__to');
    expect(used).toEqual(['from', 'to', 'fromMs', 'to']);
  });

  it("leaves longer words alone and doesn't read $__fromMs as $__from", () => {
    const { text, used } = expandTimeMacros('$__fromX $__toMs $__tomorrow', () => '?');
    expect(text).toBe('$__fromX ? $__tomorrow');
    expect(used).toEqual(['toMs']);
  });

  it('returns the text unchanged when there are no macros', () => {
    expect(expandTimeMacros('SELECT 1', () => '?')).toEqual({ text: 'SELECT 1', used: [] });
  });
});

describe('replaceTimeTokens', () => {
  it('replaces string values that are exactly a macro, at any depth', () => {
    const pipeline = [
      { $match: { at: { $gte: '$__from', $lt: '$__to' }, note: 'from $__from' } },
      { $limit: 10 },
    ];
    expect(replaceTimeTokens(pipeline, (macro) => ({ $date: timeMacroValue(macro, range) }))).toEqual([
      {
        $match: {
          at: { $gte: { $date: '2026-10-24T00:00:00.000Z' }, $lt: { $date: '2026-10-25T00:00:00.000Z' } },
          note: 'from $__from',
        },
      },
      { $limit: 10 },
    ]);
  });
});

describe('timeMacroValue', () => {
  it('gives ISO timestamps for from and to, epoch milliseconds for the Ms forms', () => {
    expect(timeMacroValue('from', range)).toBe('2026-10-24T00:00:00.000Z');
    expect(timeMacroValue('toMs', range)).toBe(range.to.getTime());
  });
});

it('writes a SQL timestamp literal in UTC', () => {
  expect(toSqlTimestamp(range.from)).toBe('2026-10-24 00:00:00.000');
});
