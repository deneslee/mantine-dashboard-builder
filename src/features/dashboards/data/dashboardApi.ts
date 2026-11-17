import { AppError, toAppError } from '@/core/errors/AppError';
import { loadRecordProvider } from '@/lib/records/activeRecordProvider';
import { notify } from '@/lib/notify/notify';
import { storageKey } from '@/lib/storage';
import { wait } from '@/utils/wait';
import {
  dashboardListSchema,
  dashboardSchema,
  orderWidgets,
  storedDashboardSchema,
  type Dashboard,
  type DashboardSummary,
} from '@/core/dashboard/dashboardSchema';
import type { RecordProvider, StoredRecord } from '@/core/records/RecordProvider';
import {
  DASHBOARDS_COLLECTION,
  documentOf,
  toRecordData,
  type DashboardSource,
  type LoadedDashboard,
} from './dashboardSource';
import { hasDraftV2, legacyDraftId, readLegacyDraft, removeLegacyDraft, writeDraft } from './drafts';

/**
 * The dashboards "backend". The files in `public/data/dashboards/` are the seed; a save is a record in
 * a place (browser storage, Convex, ...) that overrides its file. Every function takes the place it
 * works in, and a save goes to the place the dashboard was loaded from.
 */
const BASE = `${import.meta.env.BASE_URL}data/dashboards`;

/** Simulated latency so loading states are visible in development. */
const LATENCY = import.meta.env.DEV ? 600 : 0;

/** The old browser-only copy of a saved dashboard. Kept exported for the move into the browser place. */
export const savedKey = (id: string) => storageKey(`saved:${id}`);

/** The part of a place the API needs: which one, and what to call it in a message. */
export interface PlaceRef {
  id: string;
  name: string;
}

export interface DashboardList {
  items: DashboardSummary[];
  /** Set when the place could not be read: `items` are then the built-in dashboards only. */
  placeError?: { placeId: string; placeName: string; message: string };
}

function placeError(place: PlaceRef, cause: unknown) {
  if (cause instanceof DOMException && cause.name === 'AbortError') return cause;
  const error = toAppError(cause);
  return new AppError(error.code, `Couldn't read ${place.name}: ${error.message}`, {
    cause,
    isRetryable: error.isRetryable,
  });
}

async function providerOf(place: PlaceRef): Promise<RecordProvider> {
  try {
    return await loadRecordProvider(place.id);
  } catch (cause) {
    throw placeError(place, cause);
  }
}

async function getJson(url: string, notFound: string, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new AppError('network', 'Could not load dashboards. Check your connection.', { cause: e });
  }
  // The dev server answers unknown paths with index.html, so anything that isn't JSON is missing too.
  if (res.status === 404 || !res.headers.get('content-type')?.includes('json'))
    throw new AppError('not_found', notFound);
  if (!res.ok) throw new AppError('unknown', `Request failed with status ${res.status}.`);
  return res.json();
}

/** A stored record as a dashboard, or `undefined` when it is not one. */
function readDashboard(record: StoredRecord): Dashboard | undefined {
  const parsed = storedDashboardSchema.safeParse(documentOf(record.data));
  return parsed.success && parsed.data.id === record.id ? parsed.data : undefined;
}

const summaryOf = (dashboard: Dashboard): DashboardSummary => ({
  id: dashboard.id,
  title: dashboard.title,
  description: dashboard.description,
  tags: dashboard.tags,
  updatedAt: dashboard.updatedAt,
  widgetCount: Object.keys(dashboard.widgets).length,
});

/** Whether two documents are the same dashboard, whatever their key or widget order. */
const sameDocument = (a: Dashboard, b: Dashboard) =>
  JSON.stringify(orderWidgets(a)) === JSON.stringify(orderWidgets(b));

/**
 * The built-in dashboards, overlaid by the place's own: a saved dashboard replaces its file's summary,
 * and one the files do not have is added. A place that cannot be read leaves the built-in ones and says why.
 */
export async function listDashboards(place: PlaceRef, signal?: AbortSignal): Promise<DashboardList> {
  await settledMigration();
  await wait(LATENCY, signal);
  const parsed = dashboardListSchema.safeParse(
    await getJson(`${BASE}/index.json`, 'Dashboard list not found.', signal),
  );
  if (!parsed.success)
    throw new AppError('validation', 'Dashboard list has an unexpected format.', {
      details: parsed.error.issues,
    });
  const saved = new Map<string, DashboardSummary>();
  let failure: DashboardList['placeError'];
  try {
    const provider = await providerOf(place);
    const result = await provider.list(DASHBOARDS_COLLECTION, {}, signal);
    if (!result.ok) throw new AppError('unknown', `${place.name} cannot list dashboards.`);
    for (const record of result.value.records) {
      // An unreadable record keeps the file's summary; opening the dashboard reports it.
      const dashboard = readDashboard(record);
      if (dashboard) saved.set(dashboard.id, summaryOf(dashboard));
    }
  } catch (cause) {
    if (signal?.aborted) throw cause;
    saved.clear();
    failure = { placeId: place.id, placeName: place.name, message: toAppError(cause).message };
  }
  const items = parsed.data.items.map((item) => saved.get(item.id) ?? item);
  const seedIds = new Set(parsed.data.items.map((item) => item.id));
  for (const [id, summary] of saved) if (!seedIds.has(id)) items.push(summary);
  return failure ? { items, placeError: failure } : { items };
}

/**
 * One dashboard from the place: its record, or the built-in file when the place has no such record.
 * A place that cannot be read is an error naming the place; it is not the same as "no such record".
 */
export async function getDashboard(
  id: string,
  place: PlaceRef,
  signal?: AbortSignal,
): Promise<LoadedDashboard> {
  await settledMigration();
  const provider = await providerOf(place);
  let found;
  try {
    found = await provider.get(DASHBOARDS_COLLECTION, id, signal);
  } catch (cause) {
    throw placeError(place, cause);
  }
  if (found.ok) {
    const document = readDashboard(found.value);
    if (!document)
      throw new AppError('validation', `The saved "${id}" dashboard in ${place.name} is invalid.`, {
        isRetryable: false,
      });
    return { document, source: { kind: 'record', placeId: place.id, revision: found.value.revision } };
  }
  if (found.reason !== 'notFound')
    throw new AppError('unknown', `${place.name} could not read the "${id}" dashboard.`);

  await wait(LATENCY, signal);
  const json = await getJson(
    `${BASE}/${encodeURIComponent(id)}.json`,
    `No dashboard with id "${id}".`,
    signal,
  );
  const parsed = storedDashboardSchema.safeParse(json);
  if (!parsed.success)
    throw new AppError('validation', 'This dashboard has an unexpected format.', {
      details: parsed.error.issues,
    });
  return { document: parsed.data, source: { kind: 'seed', placeId: place.id } };
}

/**
 * Saves into the place the dashboard was loaded from, never the one in use now. A record is updated
 * against exactly the revision it was loaded or last saved at; a built-in dashboard is created. A change
 * made elsewhere meanwhile is a `conflict` error. Resolves with the new source.
 */
export async function saveDashboard(document: Dashboard, source: DashboardSource): Promise<DashboardSource> {
  const data = orderWidgets(dashboardSchema.parse(document));
  const provider = await loadRecordProvider(source.placeId).catch((cause: unknown) => {
    throw toAppError(cause);
  });
  const result =
    source.kind === 'record'
      ? await provider.update(DASHBOARDS_COLLECTION, data.id, toRecordData(data), {
          expectedRevision: source.revision,
        })
      : await provider.create(DASHBOARDS_COLLECTION, toRecordData(data), { id: data.id });
  if (result.ok) return { kind: 'record', placeId: source.placeId, revision: result.value.revision };
  if (result.reason === 'conflict' || result.reason === 'notFound')
    throw new AppError(
      'conflict',
      'This dashboard was changed elsewhere. Export the JSON to keep your edits, then reload.',
      { isRetryable: false },
    );
  throw new AppError('unknown', 'This place cannot save dashboards.', { isRetryable: false });
}

let migrating: Promise<number> | undefined;

/** Reads wait for a move that is running, so they never miss a dashboard that is only being moved. */
async function settledMigration() {
  if (migrating) await migrating;
}

function warnLeftInPlace(id: string, message: string) {
  notify.warning({
    title: 'An old saved dashboard was left in place',
    message: `"${id}": ${message}`,
    source: 'Dashboards',
    dedupeKey: `legacy-saved:${id}`,
  });
}

/** Moves one `saved:<id>` copy into the browser place; the old key goes only once the record is there. */
async function moveSaved(provider: RecordProvider, key: string): Promise<number> {
  const id = key.slice(savedKey('').length);
  let document: Dashboard;
  try {
    document = storedDashboardSchema.parse(JSON.parse(localStorage.getItem(key) ?? ''));
    if (document.id !== id) throw new Error('Dashboard id does not match');
  } catch {
    warnLeftInPlace(
      id,
      'the saved copy is not a valid dashboard. It was kept; export it before clearing it.',
    );
    return 0;
  }
  const existing = await provider.get(DASHBOARDS_COLLECTION, id);
  if (existing.ok) {
    const current = readDashboard(existing.value);
    if (current && sameDocument(current, document)) localStorage.removeItem(key);
    else
      warnLeftInPlace(
        id,
        'This browser already holds a different version. The old copy was kept; open the dashboard to compare.',
      );
    return 0;
  }
  if (existing.reason !== 'notFound') return 0;
  const created = await provider.create(DASHBOARDS_COLLECTION, toRecordData(orderWidgets(document)), { id });
  if (!created.ok) return 0;
  localStorage.removeItem(key);
  return 1;
}

/**
 * Moves a draft in the old format (`draft:<id>`) to the current one, in the browser place. Its revision
 * is the browser record's only when that record still equals the draft's baseline; otherwise the draft
 * keeps revision 0, which no record has, so saving it is a conflict. With no record it starts from the seed.
 */
async function moveDraft(provider: RecordProvider, id: string): Promise<void> {
  const legacy = readLegacyDraft(id);
  if (!legacy) return;
  if (!hasDraftV2('browser', id)) {
    const record = await provider.get(DASHBOARDS_COLLECTION, id);
    let source: DashboardSource;
    if (record.ok) {
      const current = readDashboard(record.value);
      source = {
        kind: 'record',
        placeId: 'browser',
        revision: current && sameDocument(current, legacy.baseline) ? record.value.revision : 0,
      };
    } else if (record.reason === 'notFound') source = { kind: 'seed', placeId: 'browser' };
    else return;
    writeDraft({ source, baseline: legacy.baseline, document: legacy.document });
  }
  removeLegacyDraft(id);
}

async function migrate(): Promise<number> {
  let keys: string[];
  try {
    keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '');
  } catch {
    return 0;
  }
  const saved = keys.filter((key) => key.startsWith(savedKey('')));
  const drafts = keys.flatMap((key) => legacyDraftId(key) ?? []);
  if (saved.length === 0 && drafts.length === 0) return 0;
  let provider: RecordProvider;
  try {
    provider = await loadRecordProvider('browser');
  } catch {
    return 0;
  }
  let moved = 0;
  // A storage error on one dashboard leaves its old key as it is and does not stop the rest.
  for (const key of saved) moved += await moveSaved(provider, key).catch(() => 0);
  for (const id of drafts) await moveDraft(provider, id).catch(() => undefined);
  return moved;
}

/**
 * Moves the old browser-only saves (`saved:<id>`) and drafts (`draft:<id>`) into the browser place, once
 * at startup. A key is removed only after its record is stored (or already equal); a record that
 * differs is left alone with its key and a warning. Running it again changes nothing. Resolves with how
 * many dashboards it created, so the caller can refresh what it shows.
 */
export function migrateLegacyDashboards(): Promise<number> {
  const run = migrate()
    .catch(() => 0)
    .finally(() => {
      if (migrating === run) migrating = undefined;
    });
  migrating = run;
  return run;
}
