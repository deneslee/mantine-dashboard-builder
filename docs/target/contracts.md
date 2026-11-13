---
title: 'Target contracts'
date: 2026-11-13
status: draft
decided-in: '10-decisions-data-plugins-state.md, decided 2026-11-13'
---

# Target contracts

The promises the parts of the builder make to each other. Each contract says who owns it, what goes in and out, the rules, and what is still open. Names are working names; exact types are settled when the work is done. Overview: [architecture.md](architecture.md).

| Contract             | In one line                                                           | Exists today              |
| -------------------- | --------------------------------------------------------------------- | ------------------------- |
| 1. Widget data       | The only way a widget gets its frames                                 | Mostly; the rules are new |
| 2. Datasource        | Runs one query and returns frames                                     | Yes, unchanged            |
| 3. Record provider   | Reads and writes editable rows                                        | No                        |
| 4. Plugin definition | How widgets, datasources and the new kinds are declared and collected | Partly                    |
| 5. State ownership   | Which place owns which state                                          | Mostly; one change        |

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
- A widget's code loads alongside its data.
- While new data loads, the widget keeps showing its last complete result.
- Every request can be cancelled.

**Open**

- How the route knows which widgets are on the first screen (from the saved layout, or a fixed number).
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

| Operation                      | Required                    | Notes                                                 |
| ------------------------------ | --------------------------- | ----------------------------------------------------- |
| List records of a collection   | Yes                         | With search text, filters, sorting and paging         |
| Get one record                 | Yes                         |                                                       |
| Create, update, delete         | Yes for a writable provider | A read-only provider says so                          |
| Subscribe to changes           | Optional                    | Convex pushes changes; browser storage does not       |
| Export and import a collection | Yes                         | This is how data moves when the user switches storage |

**Rules**

- Features use the contract, never Convex or browser storage directly.
- A provider reports what it supports. Calling something it does not support gives a clear "not supported" result.
- Records live in the same query cache as widget data. Keys are ordered from general to specific: provider, collection, kind of read (list or one), parameters. That makes "refresh every list of this collection" a single step.
- Each write declares what it makes stale. A provider that pushes changes updates the cache itself.
- The active provider is a user setting. Switching it does not move data; export and import do.
- The engine behind the contract is the query cache today. TanStack DB may replace it later without changing what features see.

- Dashboards and other saved definitions are stored through the same provider. (D6.2)
- A collection's fields are described as stored data, edited in Studio, in a standard schema format. (D6.3, D6.4)

**Open**

- The exact shape of a list request (the earlier plans call it `ListQuery`).
- What happens when two edits collide: refuse the later one, or check it again.
- Which standard the field and definition format follows. A standard is required; the specific one is not picked.
- How the first collections are defined before the Studio screens exist.
- Whether sign-in is needed for the Convex provider in the hosted demo.

---

## 4. Plugin definition

**Owner:** `app/plugins.ts` collects; each plugin defines.

**Kinds**

| Kind                                      | Today                   | Target                               |
| ----------------------------------------- | ----------------------- | ------------------------------------ |
| Widgets                                   | Yes                     | Extended, see below                  |
| Datasources and optional datasource types | Yes                     | Unchanged                            |
| Record providers                          | No                      | New                                  |
| Context-bar panels                        | Declared per route only | Also contributed by plugins          |
| Actions                                   | No                      | New                                  |
| Pages, shared services                    | No                      | Later, when the rehab app needs them |

**What a widget declares**

| Field                                | Today                          | Target                                                                                         |
| ------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Type, name, sizes, time-awareness    | Yes                            | Kept; part of the metadata                                                                     |
| Options schema                       | Yes                            | Kept                                                                                           |
| Component (lazy) and skeleton        | Yes                            | Kept; loading is retried on failure                                                            |
| Options editor                       | No, options are edited as JSON | New, lazy. Generated from the options schema by field type; a widget can supply its own (D6.1) |
| Accepted query types                 | No                             | New; the editor offers only matching datasources                                               |
| Metadata usable without loading code | Mixed into the definition      | Separated: name, description, icon, sizes                                                      |

**Rules**

- Plugins are chosen at build time through static lists. No runtime installation.
- A plugin is one definition object listing everything it contributes, so setup and start steps can be added later without reshaping plugins.
- Each kind has one registry keyed by id. A duplicate id is an error at startup.
- Definitions are light and always loaded; components, editors and runtimes are lazy.
- Isolation is an error boundary per tile plus schema checks on options and queries. No sandbox.

**Open**

- What an action is (its inputs, where it can appear).
- How a context-bar panel says when it applies.

---

## 5. State ownership

| State                                                             | Owner                             | Change from today                      |
| ----------------------------------------------------------------- | --------------------------------- | -------------------------------------- |
| Time range, refresh interval, time zone                           | The URL, always                   | Today the store owns them in edit mode |
| Which pane, widget or tab is open                                 | The URL                           | None                                   |
| Query results and records                                         | The query cache                   | Records are new                        |
| The dashboard document while it is open, edit state, undo history | One store per open dashboard      | None                                   |
| Drafts, shell layout, connections, user settings                  | Browser storage                   | None                                   |
| The active record provider                                        | A user setting in browser storage | New                                    |

**Rules**

- Every piece of state has one owner. Other places read it; they do not keep a copy.
- A tile subscribes only to its own widget and its own time overrides.
- Undo covers the dashboard document, 50 steps, as today.

**Open**

- Memoization policy, deferred until renders are measured.
- How editing the time range in edit mode avoids filling the browser history.
