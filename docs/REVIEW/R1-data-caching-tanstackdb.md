I checked `deneslee/mantine-dashboard-builder` at current `main` commit `e25254d` from October 28, 2026. The current architecture is actually quite clean: you have deliberately separated **remote/query data**, **editable application state**, and **persistent browser state**.

### How data is handled now

| Concern                             | Current owner                    | What happens                                                   |
| ----------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| Dashboard list / dashboard document | TanStack Query                   | Loaded through `dashboardQuery()` / `dashboardListQuery()`     |
| Widget datasource results           | TanStack Query                   | One cache entry per individual datasource query                |
| Dashboard being edited              | Zustand + Immer + zundo          | Separate store per open dashboard, with undo/redo              |
| Unsaved dashboard draft             | `localStorage`                   | Whole dashboard + baseline                                     |
| Saved dashboard                     | `localStorage`                   | Overrides the static JSON seed                                 |
| Connections                         | Zustand persist → `localStorage` | Settings only; secrets excluded                                |
| Secrets                             | custom vault                     | Encrypted local persistence                                    |
| URL/view state                      | TanStack Router search params    | time range, mode, editor, inspect, etc.                        |
| Future records/storage              | Not implemented yet              | Your roadmap says IndexedDB/files/Convex + a TanStack DB spike |

Your Query client has global `staleTime: 30s`, `gcTime: 5m`, `refetchOnWindowFocus: false`, `networkMode: 'offlineFirst'`, and a single retry only for retryable application errors. Importantly, **the Query cache itself isn't persisted across reloads**; durable state is stored separately. [queryClient.ts](https://github.com/deneslee/mantine-dashboard-builder/blob/e25254d974401d8df0438eccc75ca77de1cdbc48/src/app/queryClient.ts)

For widget data, this is the important part:

```text
['ds', datasource, revision?, query.spec, time?]
```

Time only enters the key for time-aware datasources. Connection revisions enter the key so an edited connection can't accidentally reuse old results. Two widgets issuing the exact same datasource query therefore share one request/cache entry. [dashboardQueries.ts](https://github.com/deneslee/mantine-dashboard-builder/blob/e25254d974401d8df0438eccc75ca77de1cdbc48/src/features/dashboards/data/dashboardQueries.ts)

`useWidgetData()` then uses `useQueries()` to combine several datasource queries. Because changing the time range creates new query observers, you've added your own small "last complete result" mechanism so charts don't disappear while the new keys load. [useWidgetData.ts](https://github.com/deneslee/mantine-dashboard-builder/blob/e25254d974401d8df0438eccc75ca77de1cdbc48/src/features/dashboards/data/useWidgetData.ts)

Dashboard persistence is separate from Query:

```text
seed JSON
   ↓
saved localStorage copy if one exists
   ↓
TanStack Query cache
   ↓
DashboardProvider
   ↓
Zustand editable copy
```

On Save, Zustand calls `saveDashboard()`, which currently writes the whole dashboard to `localStorage`. Then `EditToolbar` manually updates `['dashboards', id]` and invalidates the dashboard list. [dashboardApi.ts](https://github.com/deneslee/mantine-dashboard-builder/blob/e25254d974401d8df0438eccc75ca77de1cdbc48/src/features/dashboards/data/dashboardApi.ts)

Draft handling is also intentionally outside Query. Every meaningful edit causes the current document + original baseline to be written under `dashboard-builder:draft:<id>`. That is what allows reload → restore edit session. [drafts.ts](https://github.com/deneslee/mantine-dashboard-builder/blob/e25254d974401d8df0438eccc75ca77de1cdbc48/src/features/dashboards/data/drafts.ts)

So conceptually you currently have:

```text
TanStack Query = asynchronous read/cache lifecycle

Zustand = working/editing state + undo/redo

localStorage = persistence backend

Router = navigable/shareable state
```

I would **keep that separation**.

## Would TanStack DB improve it?

**Yes—but not by replacing your current Query architecture.** I think your roadmap's existing idea of a **TanStack DB spike specifically for P4 Records** is exactly the right boundary.

TanStack itself describes DB as an extension around Query: collections, live relational queries and optimistic mutations, with Query Collections able to use the existing `QueryClient`. Query still owns freshness, retries, invalidation and GC. [TanStack](https://tanstack.com/db/latest/docs/overview?utm_source=chatgpt.com)

For your project, I'd make the architecture:

```text
                 ┌─ Dashboard documents ─ Query + Zustand editor
StorageProvider ─┤
                 └─ Record collections ── TanStack DB
                                         │
                                         ├─ useLiveQuery()
                                         ├─ joins
                                         ├─ filters/sort/search
                                         └─ optimistic CRUD
```

That is substantially better than putting everything into DB.

### Where DB would genuinely simplify your code

Your planned `patients`, `exercises`, schemas, collections, bindings, provenance, etc. are almost textbook TanStack DB data. They are **entities with stable IDs**, used in lots of different views and relationships.

Imagine:

```text
patients
exercises
therapyPlans
therapySessions
assessments
schemas
collections
bindings
```

Then you can locally express views such as:

```text
patient
  JOIN assessments
  JOIN therapyPlans
  JOIN sessions
  WHERE patient.id = X
  ORDER BY session.date
```

or:

```text
exercises
WHERE bodyRegion = 'upper-limb'
AND difficulty <= patientLevel
ORDER BY name
```

without inventing another Query key/cache shape for each UI. Live queries update incrementally when relevant records change and support filtering, joining, projection, grouping and aggregation. [TanStack](https://tanstack.com/db/latest/docs/guides/live-queries?utm_source=chatgpt.com)

This is particularly attractive for your future **table/search/data catalog** work.

Instead of:

```text
Query:
['records', collectionId, filter, sort, page]

plus
client filtering

plus
selectors

plus
manually synchronizing caches after CRUD
```

you could have:

```text
collection: exercises

useLiveQuery(
  exercises
    .where(...)
    .orderBy(...)
    .limit(...)
)
```

TanStack DB can also use **on-demand sync**, where the predicates/order/limit coming from a live query are forwarded to the loader. That's very interesting for your planned `ListQuery` abstraction because the application's filtering model can become the driver of remote requests rather than every screen defining a bespoke Query key. [TanStack](https://tanstack.com/db/latest/docs/overview?utm_source=chatgpt.com)

### CRUD gets noticeably nicer

This is probably the clearest simplification.

With Query alone, optimistic mutation usually means some combination of:

```text
cancelQueries
snapshot cache
setQueryData
mutation
rollback
invalidateQueries
```

TanStack DB keeps optimistic mutations separately from synchronized collection data and automatically rolls them back when persistence fails. [TanStack](https://tanstack.com/db/latest/docs/guides/mutations?utm_source=chatgpt.com)

That would remove quite a lot of future CRUD plumbing from your patient/exercise/record editors.

For example your current dashboard save needs:

```text
save
→ local persistence
→ setQueryData(detail)
→ invalidate list
```

For entity-style records, DB can own much more of that reconciliation.

## Where I would NOT use DB

**Widget datasource results:** keep your current TanStack Query implementation.

Your widget results are not really "database entities." They are often:

```text
query specification
    ↓
time window
    ↓
DataFrame[]
```

with request cancellation, freshness, retry, auto-refresh and per-query timing metadata.

That is exactly what TanStack Query is good at.

Putting something like:

```text
Azure SQL query
Prometheus query
CSV query
BigQuery query
```

through DB Collections just because DB exists would create:

```text
TanStack Query cache
    ↓
TanStack DB collection
    ↓
DataFrame[]
```

without giving you much.

It could actually make your current elegant query identity more difficult, especially because a time-window datasource frequently returns **a subset rather than the authoritative complete contents of an entity collection**. Query Collections have explicit reconciliation semantics around complete collection state and subset/on-demand loading, so careless use here could produce undesirable removal/reconciliation behaviour. [TanStack](https://tanstack.com/db/latest/docs/collections/query-collection?utm_source=chatgpt.com)

Keep:

```text
datasourceQuery()
useQueries()
DataFrame[]
```

for analytics/widget queries.

## I also wouldn't replace the dashboard Zustand store

Your dashboard editor has:

```text
editable aggregate document
baseline
dirty state
undo/redo
draft
layout transactions
discard
explicit Save
```

That's not really a server-record cache problem.

Your current:

```text
Zustand
+ Immer
+ zundo
```

is a better representation of a document editor.

TanStack DB does now have manual transactions that can accumulate optimistic edits and later commit/rollback, including explicit draft-style workflows. [TanStack](https://tanstack.com/db/latest/docs/guides/mutations?utm_source=chatgpt.com)

So technically you **could** model dashboard editing using DB. But you'd be replacing a very small, understandable editor store with a much more general data engine, and you would still need specialized undo semantics. I don't see a win currently.

## StorageProvider should still exist

This is important.

Your roadmap currently says:

```text
StorageProvider

Browser / IndexedDB
Files
Convex
future backend
```

I would **not replace that abstraction with TanStack DB**.

TanStack DB answers:

> How does my client model/query/react to collections of records?

Your `StorageProvider` answers:

> Where does this application's durable data physically live?

Those are different layers.

A very good future design would be:

```text
                    ┌─ IndexedDBStorageProvider
                    ├─ FileStorageProvider
StorageProvider ────┼─ ConvexStorageProvider
                    ├─ RESTStorageProvider
                    └─ ...

                            ↓

                     TanStack DB
                  record collections
                            ↓
                       UI/views
```

Alternatively, for backends that integrate directly with DB, the collection adapter can bypass some of that plumbing.

TanStack DB already includes LocalStorage, in-memory and IndexedDB Collections; IndexedDB in particular is much more appropriate than `localStorage` for actual collections of records. [TanStack](https://tanstack.com/db/latest/docs/installation?utm_source=chatgpt.com)

## What I'd change in your roadmap

Your current P4 already says:

> “A TanStack DB spike for the records layer.”

I would make that a stronger architectural decision:

```text
P3 — Persistence

StorageProvider
├─ IndexedDB
├─ files
└─ Convex

Dashboard documents continue:
Query → Zustand editor → StorageProvider


P4 — Structured application data

TanStack DB
├─ CollectionDefinition
├─ Schema / JSON Schema metadata
├─ Record collections
├─ LiveQuery
├─ optimistic CRUD
└─ adapters
    ├─ StorageProvider-backed
    ├─ QueryCollection
    └─ future sync engines
```

And specifically **do not put DataFrames/widget query results into DB in P4**.

Your resulting ownership model becomes very clean:

| Data                                     | Owner               |
| ---------------------------------------- | ------------------- |
| SQL/metrics/chart query results          | **TanStack Query**  |
| Dashboard fetched document               | **TanStack Query**  |
| Dashboard currently being edited         | **Zustand + zundo** |
| Navigation/search params                 | **TanStack Router** |
| Patients/exercises/therapy plans/records | **TanStack DB**     |
| Persistent physical storage              | **StorageProvider** |
| Component-only interaction               | React state         |

That is the architecture I'd choose.

The main benefit of adding TanStack DB therefore isn't "better caching." **Your caching is already good.** The big win is that when your application starts getting a genuine domain-data layer—patients, exercises, plans, assessments, schemas, relationships—you won't end up building a second mini database/query system yourself out of Query keys, Zustand selectors, table filters and CRUD invalidation.

In that part of `mantine-dashboard-builder`, I think TanStack DB would **meaningfully simplify the architecture**. For the dashboard/dataframe code that exists today, it would mostly add complexity. [TanStack](https://tanstack.com/db/latest/docs/overview?utm_source=chatgpt.com)
