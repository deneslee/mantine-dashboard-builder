import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AppError, toAppError } from '@/core/errors/AppError';
import {
  COLLECTION_EXPORT_VERSION,
  WRITE_NOTICE_MS,
  type CollectionExport,
  type RecordProvider,
  type StoredRecord,
} from '@/core/records/RecordProvider';
import { loadRecordProvider } from '@/lib/records/activeRecordProvider';
import { notify } from '@/lib/notify/notify';
import { countLabel, type StorageCollection } from './collections';
import { countKey } from './useCollectionCount';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks a collection export before anything is replaced: its shape, that it is for this collection,
 * that every record is well-formed with a unique id, and the collection's own check of its records.
 * Any problem refuses the whole file, naming the first one.
 */
export function validateExport(value: unknown, collection: StorageCollection): CollectionExport {
  const problems: string[] = [];
  if (!isObject(value) || value.formatVersion !== COLLECTION_EXPORT_VERSION || !Array.isArray(value.records))
    problems.push('The file is not a collection export this version can read');
  else if (value.collection !== collection.id)
    problems.push(`The file holds "${String(value.collection)}", not "${collection.id}"`);
  else {
    const ids = new Set<string>();
    value.records.forEach((record: unknown, index) => {
      const isRecord =
        isObject(record) &&
        typeof record.id === 'string' &&
        record.id !== '' &&
        Number.isInteger(record.revision) &&
        (record.revision as number) >= 1 &&
        isObject(record.data);
      if (!isRecord) problems.push(`Record ${index + 1} is not a valid record`);
      else if (ids.has(record.id as string)) problems.push(`The id "${String(record.id)}" appears twice`);
      else ids.add(record.id as string);
    });
    if (problems.length === 0) problems.push(...collection.validate(value.records as StoredRecord[]));
  }
  const [first, ...rest] = problems;
  if (first !== undefined)
    throw new AppError(
      'validation',
      `Nothing was replaced. ${first}${rest.length > 0 ? `, and ${rest.length} more` : ''}.`,
      { isRetryable: false },
    );
  return value as unknown as CollectionExport;
}

/** The text of a file as a validated export for `collection`. */
export function parseExportFile(text: string, collection: StorageCollection): CollectionExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppError('validation', 'Nothing was replaced. The file is not JSON.', { isRetryable: false });
  }
  return validateExport(parsed, collection);
}

/** Replaces the destination's collection with `data`, all or nothing. Resolves with the new count. */
export async function replaceCollection(destination: RecordProvider, data: CollectionExport) {
  const result = await destination.importCollection(data);
  if (!result.ok) throw new AppError('unknown', 'This place cannot import.', { isRetryable: false });
  return result.value.count;
}

/** An export from `source` into `destination`, with the validation an imported file gets. */
export async function copyCollection(
  source: RecordProvider,
  destination: RecordProvider,
  collection: StorageCollection,
) {
  const exported = await source.exportCollection(collection.id);
  if (!exported.ok) throw new AppError('unknown', 'This place cannot export.', { isRetryable: false });
  return replaceCollection(destination, validateExport(exported.value, collection));
}

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export interface ActiveTransfer {
  kind: 'export' | 'import' | 'copy';
  /** The place whose collection is read or replaced. */
  placeId: string;
  collection: string;
  /** A write has not resolved after `noticeMs`: it keeps waiting, the page says so. */
  isWaiting: boolean;
}

/**
 * Export, import and copy of a collection between places. The places are fixed when a call starts
 * (the caller passes ids it showed in the confirmation), so a switch of the place in use meanwhile
 * changes nothing. A write is never cancelled: after `noticeMs` `active.isWaiting` turns on and the
 * page keeps showing it until the place answers. One transfer at a time.
 */
export function useCollectionTransfer({ noticeMs = WRITE_NOTICE_MS }: { noticeMs?: number } = {}) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveTransfer | null>(null);

  async function run(
    kind: ActiveTransfer['kind'],
    placeId: string,
    collection: StorageCollection,
    work: () => Promise<void>,
    failureTitle: string,
    describeFailure: (reason: string) => string,
  ) {
    if (active) return;
    setActive({ kind, placeId, collection: collection.id, isWaiting: false });
    const timer =
      kind === 'export'
        ? undefined
        : setTimeout(() => setActive((current) => current && { ...current, isWaiting: true }), noticeMs);
    try {
      await work();
    } catch (error) {
      notify.error({ title: failureTitle, message: describeFailure(toAppError(error).message) });
    } finally {
      clearTimeout(timer);
      setActive(null);
    }
  }

  const replaced = (placeId: string, collection: StorageCollection) => {
    void queryClient.invalidateQueries({ queryKey: countKey(placeId, collection.id) });
    collection.onReplaced?.(queryClient, placeId);
  };

  return {
    active,

    /** Downloads the place's collection as a file. */
    exportCollection: (placeId: string, collection: StorageCollection) =>
      run(
        'export',
        placeId,
        collection,
        async () => {
          const result = await (await loadRecordProvider(placeId)).exportCollection(collection.id);
          if (!result.ok) throw new AppError('unknown', 'This place cannot export.');
          download(`${collection.id}.json`, JSON.stringify(result.value, null, 2));
          notify.success({ title: `Exported ${countLabel(collection, result.value.records.length)}` });
        },
        'Export failed',
        (reason) => reason,
      ),

    /** Reads and validates a file. A bad file is reported and gives `undefined`; nothing is replaced. */
    async prepareImport(file: File, collection: StorageCollection): Promise<CollectionExport | undefined> {
      try {
        return parseExportFile(await file.text(), collection);
      } catch (error) {
        notify.error({ title: 'Import failed', message: toAppError(error).message });
        return undefined;
      }
    },

    /** Replaces the place's collection with an already validated file. */
    importData: (placeId: string, collection: StorageCollection, data: CollectionExport) =>
      run(
        'import',
        placeId,
        collection,
        async () => {
          const count = await replaceCollection(await loadRecordProvider(placeId), data);
          replaced(placeId, collection);
          notify.success({ title: `Imported ${countLabel(collection, count)}` });
        },
        'Import failed',
        (reason) => `${reason} Nothing was replaced.`,
      ),

    /** Replaces the destination's collection with the source's. Both places are the ones passed here. */
    copy: (sourceId: string, destination: { id: string; name: string }, collection: StorageCollection) =>
      run(
        'copy',
        destination.id,
        collection,
        async () => {
          const [from, to] = await Promise.all([
            loadRecordProvider(sourceId),
            loadRecordProvider(destination.id),
          ]);
          const count = await copyCollection(from, to, collection);
          replaced(destination.id, collection);
          notify.success({ title: `Copied ${countLabel(collection, count)} to ${destination.name}` });
        },
        'Copy failed',
        (reason) =>
          reason.startsWith('Nothing was replaced')
            ? reason
            : `${reason.replace(/\.$/, '')}; nothing was replaced.`,
      ),
  };
}
