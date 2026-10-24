import {
  BSON,
  MongoNetworkError,
  MongoNetworkTimeoutError,
  MongoParseError,
  MongoServerError,
  type MongoClientOptions,
} from 'mongodb';
import { describe, expect, it, vi } from 'vite-plus/test';
import {
  bsonToPlain,
  checkMongoConnectionString,
  createMongoDriver,
  mongoError,
  parsePipeline,
  type MongoConnection,
} from './mongo';

const HOSTS = ['*.mongodb.net', 'localhost'];
const ATLAS = 'mongodb+srv://reader:secret@cluster0.abcde.mongodb.net/shop?retryWrites=true&w=majority';

describe('checkMongoConnectionString', () => {
  it('accepts Atlas SRV strings and seed lists of allowed hosts', () => {
    expect(() => checkMongoConnectionString(ATLAS, HOSTS)).not.toThrow();
    expect(() =>
      checkMongoConnectionString('mongodb://localhost:27017,[::1]:27018/shop', [...HOSTS, '::1']),
    ).not.toThrow();
  });

  it('refuses any host off the allowlist, even one in a seed list', () => {
    expect(() => checkMongoConnectionString('mongodb://localhost,10.0.0.5:27017/', HOSTS)).toThrow(
      expect.objectContaining({ code: 'forbidden', message: expect.stringContaining('10.0.0.5') }),
    );
  });

  it('refuses options that read the relay’s files, use a proxy or sign in as its machine', () => {
    for (const options of [
      'tlsCAFile=/etc/passwd',
      'proxyHost=10.0.0.1',
      'authMechanism=MONGODB-AWS',
      'authMechanism=MONGODB-OIDC',
    ])
      expect(() => checkMongoConnectionString(`${ATLAS}&${options}`, HOSTS), options).toThrow(
        expect.objectContaining({ code: 'validation' }),
      );
    expect(() => checkMongoConnectionString(`${ATLAS}&authMechanism=SCRAM-SHA-256`, HOSTS)).not.toThrow();
  });

  it('says when the string isn’t one', () => {
    expect(() => checkMongoConnectionString('postgres://localhost/shop', HOSTS)).toThrow(
      expect.objectContaining({ code: 'validation' }),
    );
  });
});

describe('parsePipeline', () => {
  it('reads Extended JSON, so dates and ids become BSON values', () => {
    const [match] = parsePipeline(
      '[{"$match": {"createdAt": {"$gte": {"$date": "2026-10-24T00:00:00Z"}}, "customer": {"$oid": "65a1b2c3d4e5f60718293a4b"}}}]',
    );
    expect(match?.$match.createdAt.$gte).toEqual(new Date('2026-10-24T00:00:00Z'));
    expect(match?.$match.customer).toBeInstanceOf(BSON.ObjectId);
  });

  it('refuses anything that isn’t a list of one-operator stages', () => {
    for (const text of [
      '{"$match": {}}',
      '[{"$match": {}, "$sort": {"a": 1}}]',
      '[{"match": {}}]',
      '[1]',
      'not json',
    ])
      expect(() => parsePipeline(text), text).toThrow(expect.objectContaining({ code: 'validation' }));
  });

  it('refuses stages that write or run code, at any depth', () => {
    expect(() => parsePipeline('[{"$match": {}}, {"$merge": {"into": "copy"}}]')).toThrow(
      /can’t use \$merge/,
    );
    expect(() =>
      parsePipeline('[{"$lookup": {"from": "b", "as": "b", "pipeline": [{"$match": {"$where": "true"}}]}}]'),
    ).toThrow(/can’t use \$where/);
  });
});

describe('bsonToPlain', () => {
  it('turns BSON values into values a frame holds', () => {
    const id = new BSON.ObjectId('65a1b2c3d4e5f60718293a4b');
    const uuid = new BSON.UUID('3b241101-e2bb-4255-8caf-4136c566a962');
    expect(
      bsonToPlain({
        _id: id,
        createdAt: new Date('2026-10-24T09:30:00Z'),
        total: BSON.Long.fromNumber(42),
        price: BSON.Decimal128.fromString('9.99'),
        token: uuid.toBinary(),
        photo: new BSON.Binary(Buffer.from('jpeg!')),
        seenAt: new BSON.Timestamp({ t: 1_792_800_000, i: 1 }),
        items: [{ sku: 'a', qty: new BSON.Int32(2) }],
        note: null,
      }),
    ).toEqual({
      _id: '65a1b2c3d4e5f60718293a4b',
      createdAt: new Date('2026-10-24T09:30:00Z'),
      total: 42,
      price: 9.99,
      token: '3b241101-e2bb-4255-8caf-4136c566a962',
      photo: '5 bytes',
      seenAt: new Date(1_792_800_000_000),
      items: [{ sku: 'a', qty: 2 }],
      note: null,
    });
  });
});

describe('mongoError', () => {
  it('says what to fix for each kind of failure', () => {
    const cases: [Error, string, boolean][] = [
      [new MongoServerError({ message: 'bad auth : authentication failed', code: 8000 }), 'forbidden', false],
      [new MongoServerError({ message: 'Authentication failed.', code: 18 }), 'forbidden', false],
      [
        new MongoServerError({ message: 'not authorized on shop to execute command', code: 13 }),
        'forbidden',
        false,
      ],
      [new MongoServerError({ message: 'operation exceeded time limit', code: 50 }), 'timeout', false],
      [
        new MongoServerError({ message: "Unrecognized pipeline stage name: '$mtch'", code: 40324 }),
        'datasource',
        false,
      ],
      [new MongoParseError('Invalid scheme'), 'validation', false],
      [new MongoNetworkTimeoutError('connection timed out'), 'timeout', true],
      [new MongoNetworkError('connect ECONNREFUSED 127.0.0.1:27017'), 'network', true],
    ];
    for (const [error, code, isRetryable] of cases)
      expect(mongoError(error), error.message).toMatchObject({ code, isRetryable });
  });
});

describe('createMongoDriver', () => {
  /** A client whose aggregate answers with `documents`, recording what it was asked. */
  function fakeClient(documents: object[]) {
    const aggregate = vi.fn((_pipeline: object[], _options: object) => ({
      toArray: async () => documents,
      close: async () => {},
    }));
    const command = vi.fn(async (_command: object) => ({ version: '8.0.4' }));
    const listCollections = vi.fn(() => ({
      toArray: async () => [{ name: 'orders' }, { name: 'customers' }],
    }));
    const db = vi.fn((_name: string) => ({ collection: () => ({ aggregate }), command, listCollections }));
    return { aggregate, db, client: { db, close: async () => {} } as unknown as MongoConnection };
  }

  it('runs the pipeline with a limit and a time limit, and returns its documents as a frame', async () => {
    const { aggregate, db, client } = fakeClient([
      {
        _id: new BSON.ObjectId('65a1b2c3d4e5f60718293a4b'),
        createdAt: new Date('2026-10-24T00:00:00Z'),
        total: 3,
      },
    ]);
    const connect = vi.fn(async (_uri: string, _options: MongoClientOptions) => client);
    const driver = createMongoDriver({ allowedHosts: HOSTS, timeoutMs: 30_000, connect });
    const [frame] = await driver.query({
      connectionString: ATLAS,
      database: 'shop',
      collection: 'orders',
      pipeline: '[{"$match": {"total": {"$gt": 1}}}]',
      maxRows: 500,
    });
    expect(db).toHaveBeenCalledWith('shop');
    expect(aggregate).toHaveBeenCalledWith([{ $match: { total: { $gt: 1 } } }, { $limit: 500 }], {
      maxTimeMS: 30_000,
    });
    expect(connect.mock.calls[0]?.[1]).toMatchObject({
      appName: 'dashboard-relay',
      serverSelectionTimeoutMS: 15_000,
    });
    expect(frame?.fields.map(({ name, type, values }) => [name, type, values])).toEqual([
      ['_id', 'string', ['65a1b2c3d4e5f60718293a4b']],
      ['createdAt', 'time', [Date.parse('2026-10-24T00:00:00Z')]],
      ['total', 'number', [3]],
    ]);
  });

  it('checks the pipeline before connecting', async () => {
    const connect = vi.fn(async () => fakeClient([]).client);
    const driver = createMongoDriver({ allowedHosts: HOSTS, timeoutMs: 30_000, connect });
    await expect(
      driver.query({
        connectionString: ATLAS,
        database: 'shop',
        collection: 'orders',
        pipeline: '[{"$out": "x"}]',
        maxRows: 10,
      }),
    ).rejects.toMatchObject({ code: 'validation' });
    expect(connect).not.toHaveBeenCalled();
  });

  it('tests a connection with the server’s version and the collections it can read', async () => {
    const driver = createMongoDriver({
      allowedHosts: HOSTS,
      timeoutMs: 30_000,
      connect: async () => fakeClient([]).client,
    });
    await expect(driver.test({ connectionString: ATLAS })).resolves.toBe('MongoDB 8.0.4');
    await expect(driver.test({ connectionString: ATLAS, database: 'shop' })).resolves.toBe(
      'MongoDB 8.0.4, database shop (2 collections)',
    );
  });
});
