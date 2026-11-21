---
title: 'Target contracts'
date: 2026-11-13
status: draft
decided-in: '10-decisions-data-plugins-state.md, decided 2026-11-13'
---

# Target contracts

The promises the parts of the builder make to each other. Each contract says who owns it, what goes in and out, the rules, and what is still open. Names are working names; exact types are settled when the work is done. Overview: [architecture.md](architecture.md).

| Contract             | In one line                                                           | Exists today                                                                            |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1. Widget data       | The only way a widget gets its frames                                 | Mostly; the rules are new                                                               |
| 2. Datasource        | Runs one query and returns frames                                     | Yes, unchanged                                                                          |
| 3. Record provider   | Reads and writes editable rows                                        | The contract, browser storage and Convex, both registered; dashboards save through it                  |
| 4. Plugin definition | How widgets, datasources and the new kinds are declared and collected | Partly                                                                                  |
| 5. State ownership   | Which place owns which state                                          | Mostly; one change                                                                      |

---

## 1. Widget data

**Owner:** one module in the dashboards feature. Today's starting point is `useWidgetData` with `dashboardQueries`.

|           |                                                                                      |
| --------- | ------------------------------------------------------------------------------------ |
| Goes in   | A widget's queries, its effective time, whether it may start                         |
| Comes out | Frames in query order, the first error, loading and fetching flags, a way to refetch |

**Rules**

- Nothing else calls a datasource's `query`. Inspect, the query editor preview and the route all go through this module. A lint rule and tests enforce it.
- One cache entry per datasource query. Two widgets with the same query share one request.
- The cache key is made in one place and covers: the datasource, its revision, the query, and the time for time-aware datasources.
- A result is fresh until its key changes, the user refreshes, or the refresh timer fires. Nothing refetches on focus or on mount.
- The route starts the queries of the widgets visible on load, without waiting. The rest start near the viewport.
- Visible on load means: in the saved `lg` layout, the widget's top row is above `FIRST_SCREEN_ROWS`, about 900 px of the grid's row height. With a full-screen widget in the URL, only that one. Edit mode starts nothing from the route.
- A widget's code loads alongside its data: the route and the tile call its `preload` when they start its queries.
- While new data loads, the widget keeps showing its last complete result.
- Every request can be cancelled.

**Open**

- Whether per-widget refresh stays next to refresh-all.

---

## 2. Datasource

**Owner:** each datasource plugin. Unchanged by these decisions.

|           |                                                                                               |
| --------- | --------------------------------------------------------------------------------------------- |
| Goes in   | A query spec, the time context (resolved range, range as written, time zone), a cancel signal |
| Comes out | One or more data frames, or an error that says what to fix                                    |

**Rules**

- A datasource declares whether it is time-aware and, when it has one, the schema of its query spec.
- A connection's revision changes when its settings or secrets change, so old results are never shown after an edit.
- Optional datasource types load their code the first time they are queried or tested.
- Datasources only read. Anything that writes is a record provider.

---

## 3. Record provider

**Owner:** a new part of the builder. Providers are plugins; Convex is the first, browser storage the second.

**Operations**

| Operation                      | Required                    | Notes                                                                                              |
| ------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------- |
| List records of a collection   | Yes                         | With search text, filters, sorting and paging                                                      |
| Get one record                 | Yes                         |                                                                                                    |
| Create, update, delete         | Yes for a writable provider | A read-only provider says so                                                                       |
| Subscribe to changes           | Optional                    | Convex pushes changes; browser storage does not                                                    |
| Export and import a collection | Yes                         | This is how data moves when the user switches storage                                              |
| Check status                   | Yes                         | Whether the place can be used now: ready, unreachable, not deployed or failed. Names no collection |

**Rules**

- Features use the contract, never Convex or browser storage directly.
- A provider reports what it supports. Calling something it does not support gives a clear "not supported" result.
- Records live in the same query cache as widget data. Keys are ordered from general to specific: provider, collection, kind of read (list or one), parameters. That makes "refresh every list of this collection" a single step.
- Each write declares what it makes stale. A provider that pushes changes updates the cache itself.
- The active provider is a user setting. Switching it does not move data; export, import and copy do (the Storage page).
- An import replaces a collection all or nothing. Ids and data are kept; each revision becomes the highest one the collection held before plus the record's own, so every revision after an import is above every one before it and an editor that was open on the old records gets a conflict on its next save. An export imported into an empty collection keeps its revisions.
- A read that gets no answer in 10 s fails. A write is never timed out: the UI shows that it is waiting and keeps waiting, and Convex retries it until it is confirmed, running it once.
- The engine behind the contract is the query cache today. TanStack DB may replace it later without changing what features see.

- Dashboards and other saved definitions are stored through the same provider. (D6.2) Exists today for dashboards: a dashboard is a record of the `dashboards` collection (its `data` is the dashboard document). A loaded dashboard carries its place and revision (`source`); the editor, its draft and its Save keep them, so a save goes to the place it was opened from, against that revision, whatever the setting says later. Without a record the built-in file is used and the first save creates the record.
- A collection's fields are described as stored data, edited in Studio, in a standard schema format: JSON Schema, draft 2020-12. A definition is itself a record, in the `collections` collection. Records are not yet checked against it. (D6.3, D6.4)
- A list request (`ListQuery`) has four optional parts: search text, filters that must all match (a field, an operator, a value), sorting by several fields in order with ties broken by id, and a page (a size and the cursor of the previous page). The result has the records, the next cursor unless it is the last page, and the total when the provider can count.
- Every record has a revision that goes up on each write. An update or delete can name the revision it was based on; when the record has changed since, the later edit is refused and the result carries the record as it is now. Without a revision the write overwrites.
- The outcomes a caller must handle are returned, not thrown: not supported, not found, conflict.
- The Convex provider keeps one table and one live query per collection, and filters, sorts and pages on the client. A collection reads at most 2000 records; above that the provider throws an error that says so. A record's fields are stored as a JSON string.
- The Convex functions are public and there is no sign-in: anyone with the deployment URL can read and write every record. This must be closed before real data.

**Where it lives**

| Part                                     | File                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| The contract and its types               | `src/core/records/RecordProvider.ts`                                              |
| Query keys, and what a write makes stale | `src/core/records/recordKeys.ts`                                                  |
| The plugin definition                    | `src/plugins/RecordProviderPlugin.ts`                                             |
| The browser-storage provider             | `src/plugins/recordProviders/browserStorage/browserStorageProvider.ts`            |
| Filter, sort and page a collection       | `src/core/records/runListQuery.ts`, used by both providers                        |
| The Convex provider and its plugin       | `src/plugins/recordProviders/convex/`                                             |
| The Convex functions and table           | `convex/schema.ts`, `convex/records.ts`                                           |
| The active-provider setting and service  | `src/lib/records/activeRecordProvider.ts`, `watchRecords.ts`                      |
| Dashboards through a place               | `src/features/dashboards/data/dashboardApi.ts`, `dashboardSource.ts`, `drafts.ts` |
| The Storage pages, export, import, copy  | `src/features/storage/`; routes in `src/app/routes/storage/`                      |
| Registration                             | `src/app/recordProviders.ts`; Convex always; its URL is set on its Storage page   |
| The suite every provider passes          | `src/testing/recordProviderSuite.ts`                                              |

**Open**

- How the first collections are defined before the Studio screens exist.
- Sign-in for the Convex provider: none yet, see the rule above.

---

## 4. Plugin definition

**Owner:** `app/plugins.ts` collects; each plugin defines.

**Kinds**

| Kind                                      | Today                                                                   | Target                               |
| ----------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| Widgets                                   | Yes                                                                     | Extended, see below                  |
| Datasources and optional datasource types | Yes                                                                     | Unchanged                            |
| Record providers                          | Registry: browser storage, and Convex (its URL set on its Storage page) | Plugins add providers                |
| Context-bar panels                        | Declared per route; plugin registry, empty                              | Also contributed by plugins          |
| Actions                                   | Registry, empty                                                         | Plugins add actions                  |
| Pages, shared services                    | No                                                                      | Later, when the rehab app needs them |

A mounted page can add a context-bar tab with live content (`ContextBarPanel`); it lasts while the page is mounted.

**What a widget declares**

| Field                                | Today                                                                | Target                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Type, name, sizes, time-awareness    | Yes                                                                  | Kept; part of the metadata                                                                     |
| Options schema                       | Yes                                                                  | Kept                                                                                           |
| Component (lazy) and skeleton        | Yes, loading retried on failure                                      | Kept; loading is retried on failure                                                            |
| Options editor                       | Declared (optional lazy slot); options are edited as JSON until D6.1 | New, lazy. Generated from the options schema by field type; a widget can supply its own (D6.1) |
| Accepted query types                 | Declared (`queryTypes`)                                              | New; the editor offers only matching datasources                                               |
| Metadata usable without loading code | Declared (`WidgetMeta`, `listWidgetMeta`)                            | Separated: name, description, icon, sizes                                                      |

**Rules**

- Plugins are chosen at build time through static lists. No runtime installation.
- A plugin is one definition object listing everything it contributes, so setup and start steps can be added later without reshaping plugins.
- Each kind has one registry keyed by id. A duplicate id is an error at startup (`toRegistry`).
- `queryTypes` names datasource kinds: a built-in datasource's id or an optional plugin's `DatasourceType.type`, or `'any'`.
- An action is `{ id, label, icon, placements, load }`. `placements` is `'dashboard.header'` and/or `'widget.menu'`. Menus render one item per action whose placement matches and load its code on click; `run` receives an `ActionContext` of ids only (`dashboardId`, `widgetId`).
- A context-bar panel names the TanStack route ids it applies to in `routes` (such as `/dashboards/$id`); `app/` adds the panel to the tabs of those routes.
- Definitions are light and always loaded; components, editors and runtimes are lazy.
- Isolation is an error boundary per tile plus schema checks on options and queries. No sandbox.

---

## 5. State ownership

| State                                                             | Owner                                                                                                | Change from today                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Time range, refresh interval, time zone                           | The URL, always                                                                                      | None. The document keeps only its saved default, set with Use current time as default |
| Which pane, widget or tab is open                                 | The URL                                                                                              | None                                                                                  |
| Query results and records                                         | The query cache                                                                                      | Records are new                                                                       |
| The dashboard document while it is open, edit state, undo history | One store per open dashboard                                                                         | None                                                                                  |
| Drafts, shell layout, connections, user settings                  | Browser storage                                                                                      | None                                                                                  |
| The active record provider                                        | A user setting in browser storage (`record-provider`), read by `lib/records/activeRecordProvider.ts` | Done                                                                                  |

**Rules**

- Every piece of state has one owner. Other places read it; they do not keep a copy.
- A tile subscribes only to its own widget and its own time overrides.
- Undo covers the dashboard document, 50 steps, as today.
- The URL's time wins; without it, the dashboard's saved default applies, in view and edit mode.
- While editing, a time change replaces the current history entry, so Back does not step through time changes; in view mode each change is a history entry. The saved default changes only through Use current time as default, one undo step.

**Open**

- Memoization policy, deferred until renders are measured.
