import { recordsToFrame } from '@/core/data/columnsToFrame';
import type { DataFrame } from '@/core/data/DataFrame';
import { replaceTimeTokens, timeMacroValue } from '@/core/data/timeMacros';
import type { DatasourceRuntime } from '@/plugins/OptionalPlugin';
import type { z } from 'zod';
import { googleFetch } from './googleApi';
import { SCOPES, getAccessToken } from './googleAuth';
import type { FirestoreSettings, GoogleSecrets, firestoreSpecSchema } from './googlePlugin';

/**
 * Firestore over its REST API: `runQuery` with the spec's structured query. Values that are exactly
 * "$__from" or "$__to" become timestamps; documents become rows, their id first.
 */

const SERVICE = 'Firestore';

/** A Firestore `Value` as plain JavaScript: timestamps as Dates, maps and arrays unwrapped. */
export function decodeFirestoreValue(value: Record<string, unknown> | undefined): unknown {
  if (!value) return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return new Date(String(value.timestampValue));
  if ('stringValue' in value) return value.stringValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) {
    const { values = [] } = (value.arrayValue ?? {}) as { values?: Record<string, unknown>[] };
    return values.map(decodeFirestoreValue);
  }
  if ('mapValue' in value) {
    const { fields = {} } = (value.mapValue ?? {}) as { fields?: Record<string, Record<string, unknown>> };
    return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return null;
}

interface RunQueryResult {
  document?: { name: string; fields?: Record<string, Record<string, unknown>> };
}

/** `runQuery`'s results as a DataFrame: `id` (the document id) first, then the fields. */
export function firestoreToFrame(results: RunQueryResult[]): DataFrame {
  const records = results.flatMap(({ document }) =>
    document
      ? [
          {
            id: document.name.split('/').at(-1) ?? document.name,
            ...Object.fromEntries(
              Object.entries(document.fields ?? {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
            ),
          },
        ]
      : [],
  );
  return recordsToFrame(records);
}

type Spec = z.infer<typeof firestoreSpecSchema>;

const databaseUrl = ({ projectId, databaseId }: FirestoreSettings) =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;

export const firestoreRuntime: DatasourceRuntime<FirestoreSettings, GoogleSecrets> = {
  async query({ settings, secrets }, input, ctx, signal) {
    const spec = input as Spec;
    const token = await getAccessToken(secrets, SCOPES.firestore, { signal });
    const structuredQuery = replaceTimeTokens(spec.structuredQuery, (macro) =>
      macro.endsWith('Ms')
        ? { integerValue: String(timeMacroValue(macro, ctx.range)) }
        : { timestampValue: timeMacroValue(macro, ctx.range) },
    ) as Record<string, unknown>;
    // Without a limit Firestore returns every match; the spec's maxRows caps it.
    const limit =
      typeof structuredQuery.limit === 'number'
        ? Math.min(structuredQuery.limit, spec.maxRows)
        : spec.maxRows;
    const parent = spec.parent ? `/${spec.parent.split('/').map(encodeURIComponent).join('/')}` : '';
    const results = await googleFetch<RunQueryResult[]>(`${databaseUrl(settings)}${parent}:runQuery`, {
      token,
      signal,
      service: SERVICE,
      body: { structuredQuery: { ...structuredQuery, limit } },
    });
    return [firestoreToFrame(results)];
  },

  async test({ settings, secrets }, signal) {
    const token = await getAccessToken(secrets, SCOPES.firestore, { signal });
    await googleFetch(`${databaseUrl(settings)}:listCollectionIds`, {
      token,
      signal,
      service: SERVICE,
      body: { pageSize: 1 },
    });
    return `Firestore database ${settings.databaseId} in project ${settings.projectId}`;
  },
};
