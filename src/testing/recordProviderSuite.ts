import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  DEFINITIONS_COLLECTION,
  JSON_SCHEMA_DIALECT,
  type CollectionDefinition,
  type RecordCapabilities,
  type RecordData,
  type RecordProvider,
  type RecordResult,
} from '@/core/records/RecordProvider';

interface Patient extends RecordData {
  name: string;
  ward: string;
  age: number;
}

const PATIENTS = [
  { name: 'Anna Kovacs', ward: 'north', age: 71 },
  { name: 'Bela Nagy', ward: 'south', age: 64 },
  { name: 'Csilla Toth', ward: 'north', age: 58 },
  { name: 'Denes Szabo', ward: 'north', age: 64 },
  { name: 'Eva Kiss', ward: 'south', age: 80 },
] as const satisfies readonly Patient[];

const COLLECTION = 'patients';

/** The value of a result that must have succeeded. */
function valueOf<T>(result: RecordResult<T>): T {
  if (!result.ok) throw new Error(`Expected a value, got "${result.reason}".`);
  return result.value;
}

/**
 * The checks every record provider must pass. A provider's own test calls this with a function that
 * gives a new, empty provider for each test:
 *
 *     describeRecordProvider('browser storage', () => createProvider())
 *
 * The checks follow the provider's `capabilities`: what it says it cannot do must give "not
 * supported", the rest must work. A check that does not apply to the provider is skipped.
 */
export function describeRecordProvider(
  name: string,
  createProvider: () => RecordProvider | Promise<RecordProvider>,
) {
  describe(`record provider contract: ${name}`, () => {
    let provider: RecordProvider;

    beforeEach(async () => {
      provider = await createProvider();
    });

    /** A check that runs only when the provider's capabilities say it applies. */
    const itWhen = (
      applies: (capabilities: RecordCapabilities) => boolean,
      title: string,
      check: () => Promise<void> | void,
    ) =>
      it(title, async (context) => {
        if (!applies(provider.capabilities)) context.skip();
        await check();
      });
    const canWrite = (c: RecordCapabilities) => c.canWrite;

    const seed = async () => {
      for (const [i, patient] of PATIENTS.entries())
        valueOf(await provider.create(COLLECTION, patient, { id: `p${i + 1}` }));
    };
    const names = (records: { data: RecordData }[]) => records.map((r) => r.data.name);
    const sortedNames = (records: { data: RecordData }[]) =>
      records.map((r) => String(r.data.name)).toSorted((x, y) => x.localeCompare(y));

    it('reports what it supports', () => {
      expect(provider.id).not.toBe('');
      expect(provider.capabilities).toEqual({
        canWrite: expect.any(Boolean),
        canSubscribe: expect.any(Boolean),
        canSearchText: expect.any(Boolean),
        canCount: expect.any(Boolean),
      });
    });

    it('is ready when asked for its status', async () => {
      expect(await provider.checkStatus()).toMatchObject({ state: 'ready', message: expect.any(String) });
    });

    it('lists an empty collection and misses an unknown record', async () => {
      expect(valueOf(await provider.list(COLLECTION)).records).toEqual([]);
      expect(await provider.get(COLLECTION, 'nobody')).toEqual({ ok: false, reason: 'notFound' });
    });

    describe('writing', () => {
      itWhen(canWrite, 'creates a record at revision 1 and reads it back', async () => {
        const created = valueOf(await provider.create<Patient>(COLLECTION, PATIENTS[0]));
        expect(created.id).not.toBe('');
        expect(created.revision).toBe(1);
        expect(created.data).toEqual(PATIENTS[0]);
        expect(valueOf(await provider.get(COLLECTION, created.id))).toEqual(created);
        expect(valueOf(await provider.list(COLLECTION)).records).toEqual([created]);
      });

      itWhen(canWrite, 'gives each record its own id, and refuses a taken one', async () => {
        const first = valueOf(await provider.create(COLLECTION, PATIENTS[0]));
        const second = valueOf(await provider.create(COLLECTION, PATIENTS[1]));
        expect(second.id).not.toBe(first.id);
        expect(await provider.create(COLLECTION, PATIENTS[2], { id: first.id })).toEqual({
          ok: false,
          reason: 'conflict',
          current: first,
        });
      });

      itWhen(canWrite, 'keeps collections apart', async () => {
        await seed();
        expect(valueOf(await provider.list('visits')).records).toEqual([]);
      });

      itWhen(canWrite, 'lists with filters, all of which must match', async () => {
        await seed();
        const north = valueOf(
          await provider.list(COLLECTION, { filters: [{ field: 'ward', operator: 'eq', value: 'north' }] }),
        );
        expect(sortedNames(north.records)).toEqual(['Anna Kovacs', 'Csilla Toth', 'Denes Szabo']);

        const both = valueOf(
          await provider.list(COLLECTION, {
            filters: [
              { field: 'ward', operator: 'eq', value: 'north' },
              { field: 'age', operator: 'gte', value: 64 },
            ],
          }),
        );
        expect(sortedNames(both.records)).toEqual(['Anna Kovacs', 'Denes Szabo']);

        const some = valueOf(
          await provider.list(COLLECTION, {
            filters: [{ field: 'id', operator: 'in', value: ['p2', 'p5'] }],
          }),
        );
        expect(sortedNames(some.records)).toEqual(['Bela Nagy', 'Eva Kiss']);
      });

      itWhen(canWrite, 'sorts in the order given, ties broken by id', async () => {
        await seed();
        const sorted = valueOf(
          await provider.list(COLLECTION, {
            sort: [
              { field: 'age', direction: 'desc' },
              { field: 'name', direction: 'asc' },
            ],
          }),
        );
        expect(names(sorted.records)).toEqual([
          'Eva Kiss',
          'Anna Kovacs',
          'Bela Nagy',
          'Denes Szabo',
          'Csilla Toth',
        ]);

        const byWard = valueOf(
          await provider.list(COLLECTION, { sort: [{ field: 'ward', direction: 'asc' }] }),
        );
        expect(byWard.records.map((r) => r.id)).toEqual(['p1', 'p3', 'p4', 'p2', 'p5']);
      });

      itWhen(canWrite, 'pages through a sorted list with the cursor', async () => {
        await seed();
        const query = { sort: [{ field: 'name', direction: 'asc' } as const] };
        const seen: unknown[] = [];
        let cursor: string | undefined;
        let pages = 0;
        do {
          const page = valueOf(await provider.list(COLLECTION, { ...query, page: { size: 2, cursor } }));
          expect(page.records.length).toBeLessThanOrEqual(2);
          if (provider.capabilities.canCount) expect(page.total).toBe(PATIENTS.length);
          seen.push(...names(page.records));
          cursor = page.nextCursor;
          pages += 1;
        } while (cursor !== undefined && pages < 10);
        expect(pages).toBe(3);
        expect(seen).toEqual(PATIENTS.map((p) => p.name));
      });

      itWhen(canWrite, 'filters, sorts and pages in one request', async () => {
        await seed();
        const page = valueOf(
          await provider.list(COLLECTION, {
            filters: [{ field: 'ward', operator: 'eq', value: 'north' }],
            sort: [{ field: 'age', direction: 'asc' }],
            page: { size: 2 },
          }),
        );
        expect(names(page.records)).toEqual(['Csilla Toth', 'Denes Szabo']);
        expect(page.nextCursor).toBeDefined();
        const rest = valueOf(
          await provider.list(COLLECTION, {
            filters: [{ field: 'ward', operator: 'eq', value: 'north' }],
            sort: [{ field: 'age', direction: 'asc' }],
            page: { size: 2, cursor: page.nextCursor },
          }),
        );
        expect(names(rest.records)).toEqual(['Anna Kovacs']);
        expect(rest.nextCursor).toBeUndefined();
      });

      itWhen(canWrite, 'updates a record: merges the patch and raises the revision', async () => {
        await seed();
        const updated = valueOf(await provider.update<Patient>(COLLECTION, 'p2', { ward: 'north' }));
        expect(updated).toEqual({ id: 'p2', revision: 2, data: { ...PATIENTS[1], ward: 'north' } });
        expect(valueOf(await provider.get(COLLECTION, 'p2'))).toEqual(updated);
        expect(await provider.update(COLLECTION, 'nobody', { ward: 'north' })).toEqual({
          ok: false,
          reason: 'notFound',
        });
      });

      itWhen(canWrite, 'refuses the later of two edits based on the same revision', async () => {
        await seed();
        const base = valueOf(await provider.get<Patient>(COLLECTION, 'p1'));
        const first = valueOf(
          await provider.update<Patient>(COLLECTION, 'p1', { age: 72 }, { expectedRevision: base.revision }),
        );
        const second = await provider.update<Patient>(
          COLLECTION,
          'p1',
          { ward: 'south' },
          { expectedRevision: base.revision },
        );
        expect(second).toEqual({ ok: false, reason: 'conflict', current: first });
        expect(valueOf(await provider.get(COLLECTION, 'p1'))).toEqual(first);

        expect(await provider.delete(COLLECTION, 'p1', { expectedRevision: base.revision })).toEqual({
          ok: false,
          reason: 'conflict',
          current: first,
        });
        expect(valueOf(await provider.get(COLLECTION, 'p1'))).toEqual(first);
      });

      itWhen(canWrite, 'overwrites when no revision is expected', async () => {
        await seed();
        valueOf(await provider.update<Patient>(COLLECTION, 'p1', { age: 72 }));
        const second = valueOf(await provider.update<Patient>(COLLECTION, 'p1', { ward: 'south' }));
        expect(second).toEqual({ id: 'p1', revision: 3, data: { ...PATIENTS[0], age: 72, ward: 'south' } });
      });

      itWhen(canWrite, 'deletes a record', async () => {
        await seed();
        expect(await provider.delete(COLLECTION, 'p3')).toEqual({ ok: true, value: { id: 'p3' } });
        expect(await provider.get(COLLECTION, 'p3')).toEqual({ ok: false, reason: 'notFound' });
        expect(valueOf(await provider.list(COLLECTION)).records).toHaveLength(PATIENTS.length - 1);
        expect(await provider.delete(COLLECTION, 'p3')).toEqual({ ok: false, reason: 'notFound' });
      });

      itWhen(canWrite, 'gives the same records after an export and an import', async () => {
        await seed();
        valueOf(await provider.update<Patient>(COLLECTION, 'p4', { age: 65 }));
        const sort = [{ field: 'id', direction: 'asc' } as const];
        const before = valueOf(await provider.list(COLLECTION, { sort })).records;

        const exported = valueOf(await provider.exportCollection(COLLECTION));
        // An export is data: it survives being written to a file and read back.
        const file = JSON.parse(JSON.stringify(exported));

        const target = await createProvider();
        // A fresh provider may share its storage with the first one, so empty the collection first.
        for (const record of before) valueOf(await provider.delete(COLLECTION, record.id));
        expect(valueOf(await target.list(COLLECTION)).records).toEqual([]);

        expect(await target.importCollection(file)).toEqual({ ok: true, value: { count: before.length } });
        expect(valueOf(await target.list(COLLECTION, { sort })).records).toEqual(before);
      });

      itWhen(canWrite, 'replaces what the collection held on import', async () => {
        await seed();
        const exported = valueOf(await provider.exportCollection(COLLECTION));
        valueOf(await provider.create(COLLECTION, { name: 'Late Arrival', ward: 'south', age: 30 }));
        valueOf(await provider.importCollection(exported));
        expect(valueOf(await provider.list(COLLECTION)).records).toHaveLength(PATIENTS.length);
      });

      itWhen(canWrite, 'raises every revision above the old maximum when it replaces records', async () => {
        await seed();
        valueOf(await provider.update<Patient>(COLLECTION, 'p1', { age: 72 }));
        valueOf(await provider.update<Patient>(COLLECTION, 'p1', { age: 73 }));
        const exported = valueOf(await provider.exportCollection(COLLECTION));
        const previousMax = Math.max(...exported.records.map((record) => record.revision));
        expect(previousMax).toBe(3);

        valueOf(await provider.importCollection(exported));
        const after = valueOf(await provider.list(COLLECTION)).records;
        expect(after.map((record) => record.id).toSorted()).toEqual(
          exported.records.map((r) => r.id).toSorted(),
        );
        for (const record of after) {
          const original = exported.records.find((r) => r.id === record.id);
          expect(record.data).toEqual(original?.data);
          expect(record.revision).toBe(previousMax + (original?.revision ?? 0));
        }
      });

      itWhen(canWrite, 'leaves the collection as it was when an import is refused', async () => {
        await seed();
        const before = valueOf(await provider.exportCollection(COLLECTION));
        const twice = { ...before, records: [before.records[0]!, before.records[0]!] };
        await expect(provider.importCollection(twice)).rejects.toMatchObject({ code: 'validation' });
        expect(valueOf(await provider.exportCollection(COLLECTION))).toEqual(before);
      });

      itWhen(canWrite, 'stores a collection definition as a record', async () => {
        const definition: CollectionDefinition = {
          id: COLLECTION,
          name: 'Patients',
          schemaVersion: 1,
          fields: {
            $schema: JSON_SCHEMA_DIALECT,
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
              ward: { type: 'string', enum: ['north', 'south'] },
              age: { type: 'integer', minimum: 0 },
            },
            required: ['name'],
          },
        };
        valueOf(await provider.create(DEFINITIONS_COLLECTION, definition, { id: definition.id }));
        const stored = valueOf(await provider.get<CollectionDefinition>(DEFINITIONS_COLLECTION, COLLECTION));
        expect(stored.data).toEqual(definition);
      });
    });

    describe('text search', () => {
      itWhen(
        (c) => c.canWrite && c.canSearchText,
        'finds records by text, whatever the case',
        async () => {
          await seed();
          const found = valueOf(await provider.list(COLLECTION, { text: 'KOVACS' }));
          expect(names(found.records)).toEqual(['Anna Kovacs']);
        },
      );
    });

    describe('what it does not support', () => {
      itWhen(
        (c) => !c.canWrite,
        'says so for every write, and writes nothing',
        async () => {
          expect(await provider.create(COLLECTION, PATIENTS[0])).toEqual({
            ok: false,
            reason: 'notSupported',
            operation: 'create',
          });
          expect(await provider.update(COLLECTION, 'p1', {})).toEqual({
            ok: false,
            reason: 'notSupported',
            operation: 'update',
          });
          expect(await provider.delete(COLLECTION, 'p1')).toEqual({
            ok: false,
            reason: 'notSupported',
            operation: 'delete',
          });
          expect(
            await provider.importCollection({ formatVersion: 1, collection: COLLECTION, records: [] }),
          ).toEqual({ ok: false, reason: 'notSupported', operation: 'import' });
        },
      );

      itWhen(
        (c) => !c.canSubscribe,
        'says so for subscribe',
        () => {
          let calls = 0;
          const result = provider.subscribe(COLLECTION, () => {
            calls += 1;
          });
          expect(result).toEqual({ ok: false, reason: 'notSupported', operation: 'subscribe' });
          expect(calls).toBe(0);
        },
      );

      itWhen(
        (c) => !c.canSearchText,
        'says so for a text search',
        async () => {
          expect(await provider.list(COLLECTION, { text: 'anna' })).toEqual({
            ok: false,
            reason: 'notSupported',
            operation: 'list',
          });
        },
      );
    });

    describe('subscribing', () => {
      itWhen(
        (c) => c.canWrite && c.canSubscribe,
        'tells a subscriber about a change until it stops listening',
        async () => {
          const changes: unknown[] = [];
          const stop = valueOf(provider.subscribe(COLLECTION, (change) => changes.push(change)));
          const created = valueOf(await provider.create(COLLECTION, PATIENTS[0]));
          await expect.poll(() => changes).toContainEqual({ collection: COLLECTION, id: created.id });
          stop();
          const count = changes.length;
          valueOf(await provider.create(COLLECTION, PATIENTS[1]));
          expect(changes).toHaveLength(count);
        },
      );
    });
  });
}
