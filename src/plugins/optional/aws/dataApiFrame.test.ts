import { describe, expect, it } from 'vite-plus/test';
import { awsError } from './awsErrors';
import { dataApiToFrame, sqlTypeToFieldType } from './dataApiFrame';

describe('sqlTypeToFieldType', () => {
  it.each([
    ['int4', 'number'],
    ['INT UNSIGNED', 'number'],
    ['DECIMAL(10,2)', 'number'],
    ['float8', 'number'],
    ['double precision', 'number'],
    ['interval', 'string'],
    ['bool', 'boolean'],
    ['BIT', 'boolean'],
    ['timestamptz', 'time'],
    ['timestamp with time zone', 'time'],
    ['DATETIME', 'time'],
    ['date', 'time'],
    ['time', 'string'],
    ['varchar', 'string'],
    [undefined, 'string'],
  ])('%s is %s', (typeName, type) => {
    expect(sqlTypeToFieldType(typeName)).toBe(type);
  });
});

describe('dataApiToFrame', () => {
  it('reads each Field union and names columns by label', () => {
    const frame = dataApiToFrame(
      [
        { name: 'day', typeName: 'timestamp' },
        { name: 'count', label: 'orders', typeName: 'int8' },
        { name: 'isPaid', typeName: 'bool' },
        { name: 'note', typeName: 'text' },
      ],
      [
        [{ stringValue: '2026-10-24 00:00:00' }, { longValue: 42 }, { booleanValue: true }, { isNull: true }],
        [
          { stringValue: '2026-10-25 00:00:00' },
          { longValue: 7 },
          { booleanValue: false },
          { stringValue: 'hi' },
        ],
      ],
    );
    expect(frame.fields.map((field) => [field.name, field.type, field.values])).toEqual([
      ['day', 'time', [Date.parse('2026-10-24T00:00:00Z'), Date.parse('2026-10-25T00:00:00Z')]],
      ['orders', 'number', [42, 7]],
      ['isPaid', 'boolean', [true, false]],
      ['note', 'string', [null, 'hi']],
    ]);
  });
});

describe('awsError', () => {
  it.each([
    ['UnrecognizedClientException', 'forbidden'],
    ['AccessDeniedException', 'forbidden'],
    ['ExpiredTokenException', 'forbidden'],
    ['ValidationException', 'validation'],
    ['ResourceNotFoundException', 'datasource'],
    ['ThrottlingException', 'datasource'],
  ])('maps %s to %s, with AWS’s message', (name, code) => {
    expect(awsError(Object.assign(new Error('the details'), { name }), 'Athena')).toMatchObject({
      code,
      message: expect.stringContaining('the details'),
    });
  });

  it('passes aborts through', () => {
    const abort = new DOMException('Aborted', 'AbortError');
    expect(awsError(abort, 'Athena')).toBe(abort);
  });
});
