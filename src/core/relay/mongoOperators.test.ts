import { describe, expect, it } from 'vite-plus/test';
import { findDeniedMongoOperator } from './mongoOperators';

describe('findDeniedMongoOperator', () => {
  it('finds operators that write or run code at any depth, and only as keys', () => {
    expect(findDeniedMongoOperator([{ $match: { total: { $gt: 1 } } }, { $sort: { total: -1 } }])).toBe(
      undefined,
    );
    expect(findDeniedMongoOperator([{ $match: {} }, { $out: 'copy' }])).toBe('$out');
    expect(
      findDeniedMongoOperator([
        { $lookup: { from: 'b', pipeline: [{ $match: { $expr: { $function: { body: '' } } } }], as: 'b' } },
      ]),
    ).toBe('$function');
    expect(findDeniedMongoOperator([{ $match: { note: '$out' } }])).toBe(undefined);
  });
});
