# Architecture audit — mantine-dashboard-builder

Branch `review` @ `5798337`, 2026-11-21. Read-only audit: no source changed.
Evidence = code, import graph (qartez index + grep, tests/stories excluded unless stated), configs, CI.
Existing docs, archived AGENTS rules and the ChatGPT conversation were treated as hypotheses.

Legend: **[F]** observed fact · **[R]** recommendation · **[S]** subjective/preference · **[?]** open question

---

## 1. Current-state audit

### 1.1 What actually exists

**[F] Repo topology**

| Path                                                                    | What it is                                                                   | Notes                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (root `package.json` = `dashboard-builder`)                         | The web app itself                                                           | Root mixes workspace config and app-only config: `vite.config.ts`, `index.html`, `plugins.config.ts`, `plugins.json`, `tsconfig.app.json`, `postcss.config.cjs`, `.stylelintrc.json`, `.storybook/`, `public/` |
| `relay/`                                                                | Only workspace package (`dashboard-relay`, Hono + mssql + mongodb)           | Stateless query proxy for drivers browsers can't run                                                                                                                                                           |
| `convex/`                                                               | Convex functions (`records.ts`, `schema.ts`)                                 | Root location is Convex default; no `convex.json`                                                                                                                                                              |
| `apps/docs/`                                                            | **Not a package.** YAML capability catalog + generator script + generated md | Name implies a deployable app; it isn't one                                                                                                                                                                    |
| `lint/`                                                                 | Custom oxlint JS plugin, rule tests, fixtures mirroring `src/<layer>`        | Tied to current folder names                                                                                                                                                                                   |
| `docs/`                                                                 | `STATUS.md`, `current-state.md`, `archive/`                                  |                                                                                                                                                                                                                |
| `scripts/new-worktree.ps1`                                              | Dev helper                                                                   |                                                                                                                                                                                                                |
| `.agents/skills`, `.claude`, `.codex`, `.rtk`, `.vscode`, `.vite-hooks` | Agent/IDE tooling                                                            |                                                                                                                                                                                                                |

**[F] `src/` layers** (enforced by `oxlint.config.ts` `layer()` rules + `lint/rules.test.ts` fixtures):

```
utils → core → ui → lib → plugins → shell → features → app      (testing/ = tests & stories only)
```

| Layer       | Files       | Real content                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core/`     | 30          | Framework-free domain: `DataFrame`, dashboard schema/layout, time ranges, `AppError`, `RecordProvider` contract, relay wire contract, crypto, build-info schema                                                                                                                                                                                                    |
| `ui/`       | 45          | Design system: tokens, Mantine theme overrides, ~7 shared components                                                                                                                                                                                                                                                                                               |
| `lib/`      | 23          | Grab-bag: notify, sentry, vault (secret store), records (active-provider selection), storage keys, density/motion hooks, current user                                                                                                                                                                                                                              |
| `plugins/`  | 60          | Plugin **contracts** (`WidgetPlugin`, `DatasourcePlugin`, `OptionalPlugin`, `RecordProviderPlugin`, `ActionPlugin`, `ContextPanelPlugin`), the **registry + React context** (`usePlugins.ts`), `connectionDatasource.ts`, and all **implementations** (widgets, mock/localJson, optional/aws·google·azureSql·mongodb·relay, recordProviders/browserStorage·convex) |
| `shell/`    | 45          | App chrome: sidebar, navbar, context bar, breadcrumbs, shell store                                                                                                                                                                                                                                                                                                 |
| `features/` | 95          | dashboards, datasources, storage, settings, integrations (Sentry), notifications, debug, node-studio (only an `AGENTS.md`)                                                                                                                                                                                                                                         |
| `app/`      | 23 + routes | Bootstrap, providers, router, query client, plugin registry assembly, record-provider list, composition glue, nav config, error pages — **flat**                                                                                                                                                                                                                   |

**[F] Import graph health (production code only).** Counted imports per layer, tests/stories excluded:

| From \ to | core | ui  | lib | plugins       | shell | features | app |
| --------- | ---- | --- | --- | ------------- | ----- | -------- | --- |
| features  | 70   | 52  | 45  | 36            | 15    | –        | 0   |
| app       | 3    | 13  | 16  | 18            | 6     | 29       | –   |
| plugins   | 68   | 6   | 0   | (28 internal) | 0     | 0        | 0   |
| shell     | 0    | 15  | 2   | 0             | –     | 0        | 0   |
| lib       | 7    | 1   | –   | 0             | 0     | 0        | 0   |

Zero layer violations in production code. `import/no-cycle` on. This is the repo's biggest structural **strength** and must survive any move.

**[F] Code health.** qartez: 6 small clone groups, no real dead-code cluster (its 198 "unreachable" symbols are route components, JSX handlers, `.mjs` scripts — false positives). God components: `features/dashboards/DashboardPage.tsx` (CC 30, 233 lines), `grid/WidgetHeader.tsx` (274 lines), `datasources/buildList/AddToBuildDialog.tsx` (236), `integrations/sentry/SentryVerificationCard.tsx` (504). Hotspots concentrate in `features/dashboards/data/` and `DashboardPage`.

**Conclusion:** the problem is not chaos in the import graph. It is that **folder names describe layers, not responsibilities**, and the **extension model is two unrelated mechanisms** wearing the word "plugin".

### 1.2 Objective structural problems

**P1 — Two unrelated extension/selection mechanisms. [F]**

| Thing                                                         | How included                                                                                     | How selected                             | Where                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------- |
| Widgets                                                       | Hardcoded list                                                                                   | All active                               | `app/plugins.ts`                                                |
| Built-in datasources (mock, localJson)                        | Hardcoded list                                                                                   | All active                               | `app/plugins.ts`                                                |
| Optional datasource _types_ (aws, google, azure-sql, mongodb) | **Build-time**: `plugins.json` → `virtual:optional-plugins` (Vite plugin in `plugins.config.ts`) | User creates a _connection_              | `plugins.config.ts`, `features/datasources/buildList/*`         |
| Record providers (browser, convex)                            | Hardcoded `createRecordProviders()`                                                              | **Runtime**: one global localStorage key | `app/recordProviders.ts`, `lib/records/activeRecordProvider.ts` |
| Actions, context panels                                       | Contracts exist, registries empty                                                                | –                                        | `plugins/ActionPlugin.ts`, `plugins/ContextPanelPlugin.ts`      |

- `OptionalPlugin` = `{ id, types: DatasourceType[] }`. It **can only carry datasource types** — an "AWS plugin" could not also ship a record provider or a settings panel. Your preference #3 (several implementations built in, chosen at runtime) is only true for record providers, and only by hand-wiring.
- "Plugin" names five different things: `WidgetPlugin` (definition), `DatasourcePlugin` (a _runtime instance_, including one per user connection), `OptionalPlugin` (a datasource-type bundle), `RecordProviderPlugin` (definition + loader), `ActionPlugin`/`ContextPanelPlugin` (unused).

**P2 — Contracts live inside the implementations folder. [F]** `src/plugins/` holds the platform API (contracts + `usePlugins` registry/context) next to vendor code. Features import `@/plugins/usePlugins` 21×, `DatasourcePlugin` 5×, `OptionalPlugin` 7× (for `Connection`/`ConnectionField`). The connection model lives in `OptionalPlugin.ts`. Lint must special-case `@/plugins/widgets/**` etc. to stop features importing implementations — a sign the folder holds two things.

**P3 — Platform runtime is hidden in `lib/`. [F]** `lib/records/activeRecordProvider.ts` (capability selection), `lib/records/placeSetting.ts` (provider config), `lib/vault/*` (secret store) are platform services; they sit beside `useDensity`, `notify`, `sentry`. `lib/` cannot import `plugins/`, so `activeRecordProvider` keeps a structural copy of the plugin type (`RecordProviderEntries`) — the layer order is fighting the concept.

**P4 — Selection state is a module singleton with a load-time side effect. [F]** `app/plugins.ts` calls `configureRecordProviders(...)` at import; `activeRecordProvider.ts` holds `let entries`, a `loading` map and listeners at module scope; storage keys are hard-prefixed `dashboard-builder:` (`lib/storage.ts`). For a multi-app platform: two apps can't have different provider sets in one test/process, and the prefix is app-branded.

**P5 — The relay depends on the web app's source tree. [F]** `relay/src/app.ts`, `mongo.ts`, `env.ts`, `hosts.ts`, `Driver.ts` import `../../src/core/...` by relative path. `core/` is de-facto a shared package already; it just isn't one.

**P6 — `app/` is flat and mixes four jobs. [F]** bootstrap (`App`, `AppCrash`, `Devtools`), React providers (`Providers`, `PluginsProvider`), composition glue (`plugins.ts`, `recordProviders.ts`, `withConnections.ts`, `recordSync.ts`, `storageCollections.ts`), app config (`nav.ts`, `router.ts`, `queryClient.ts`), error pages (`NotFound`, `RouteError`). Composition files reach into feature internals (`PluginsProvider` → `features/datasources/connections/useConnections`; `recordSync`, `storageCollections` → `features/dashboards/data/*`). Legit for a composition root, but invisible in a flat folder.

**P7 — One concept, three names; one folder, three concepts. [F]**

- Record storage is "storage" (route `/storage`, `features/storage`), "place" (`StoragePlacePage`, `placeSetting`, `ResolvedPlace`, `PlaceSetupForm`) and "record provider" (`RecordProvider`, `activeRecordProvider`).
- `features/datasources/` = connections CRUD + vault UI (`vault/`) + build-list management that commits `plugins.json` to GitHub (`buildList/githubBuildList.ts`) + built-in list. Route `/datasources/$id` edits a _connection_.
- `DatasourcePlugin` is the queryable instance, `DatasourceType` the plugin's type, registry key is just `types`.

**P8 — Speculative scaffolding with no consumer. [F]** `ActionPlugin`/`ContextPanelPlugin` + empty `panels`/`actions` registries (only `app/plugins.test.ts` reads them); `lib/records/watchRecords.ts` (no importer); `CollectionDefinition`/`DEFINITIONS_COLLECTION`/`FieldsSchema` in `core/records/RecordProvider.ts` (tests only); placeholder routes `explore.tsx`, `templates.tsx`; `features/node-studio/` (only `AGENTS.md`).

**P9 — App identity hardcoded in "platform-ish" places. [F]** `app/nav.ts` contains demo dashboards (`sales`, `ops`); dashboards seed from `public/data/dashboards`; `storageKey()` prefix; Vite `base: '/mantine-dashboard-builder/'`.

**P10 — Branch baseline is not green. [F]** After the archive commit, `README.md`, `docs/STATUS.md`, `docs/current-state.md` link `docs/target/*`, which now lives in `docs/archive/target/`. `lint/docs.test.ts` checks every relative md link → expected to fail. Many code comments cite "plan 11" at an old commit. Fix before any structural stage, or every stage's verification is ambiguous.

**P11 — Tooling is keyed to paths. [F]** `oxlint.config.ts` (`layer()` per folder, `barrels` list, overrides by path), `lint/fixtures/src/<layer>/` + `lint/rules.test.ts`, `vite.config.ts` (`routesDirectory`, `generatedRouteTree`, fmt ignores, cache inputs), stylelint glob `src/**/*.css`, `vitest.config.ts` includes, CI `dist/` path (`github-pages.yaml`: `cp dist/index.html dist/404.html`, default upload path). Every move must update these **in the same commit**.

### 1.3 Subjective / preference issues (not defects)

- **[S] Flatness.** `app/` (P6) is genuinely hard to scan. `features/dashboards/` root has 9 files; `features/datasources/` root 11. Elsewhere, features already use concern subfolders (`data/`, `editor/`, `grid/`, `header/`, `state/`) — that is closer to good than a generic `components/ hooks/` split would be.
- **[S] Folder casing** is camelCase (`contextBar`, `recordProviders`, `localJson`, `azureSql`). Fine, but mixes poorly with kebab-case ids (`azure-sql`) and package names.
- **[S] Repeated names** (`dashboards` in routes/features/core, `data` vs `core/data`) are layer-qualified and mostly fine; the real confusion is P7.

### 1.4 Strengths to keep

- Production import graph clean; lint-enforced with fixture tests (keep the _mechanism_, re-key the paths).
- "Definitions are light, code is lazy" (`load: () => import(...)`) across widgets, datasource types, record providers.
- `toRegistry` duplicate-id check; static lists (tree-shakeable).
- `RecordProvider` contract: capabilities, result unions instead of exceptions, revisions/conflicts, export/import — plus a shared conformance suite (`src/testing/recordProviderSuite.ts`). This is the best-designed piece of the codebase and the template for every future capability.
- Zod-shared wire contract between browser and relay (`core/relay/relayContract.ts`).
- Build-time exclusion of optional vendor code (AWS SDKs not in dist unless listed).
- CI (lint+types, css, fmt, unit, build), Vite task cache, supply-chain settings in `pnpm-workspace.yaml`, `.claude/settings.json` secret/destructive-git guards.

---

## 2. Alternative designs

Common to all: move the app out of root, make `relay` and the app siblings, keep the layer lint.

### A. Workspace shell only

```
apps/web (today's src, unchanged layers)   apps/relay   packages/core   convex/
```

- **+** Smallest diff; fixes P5, root config mess.
- **−** Leaves P1–P4, P7 untouched; nothing reusable for a second app except `core`.
- Cost: low. Extensibility: low.

### B. Core + platform + one plugins package, app-owned features _(recommended)_

```
apps/web  apps/relay
packages/core       framework-free domain + contracts (browser + relay)
packages/platform   React-aware runtime: plugin definition, registries, capability selection, settings/secret storage
packages/plugins    ONE private package; one folder per plugin (aws, google, convex, browser-storage, widgets…)
convex/ (or services/convex via convex.json)
```

Features stay in `apps/web` until a second app needs them; `packages/ui` and `packages/dashboard` are introduced only on proof.

- **+** Fixes P1–P5, P7; matches prefs #1–#4 without a package per plugin; contracts visibly separate from vendors; second app can `createPlatform()` with a different plugin set.
- **−** Two new package boundaries to maintain (`platform`, `plugins`); requires a real (small) functional redesign of plugin definition and selection.
- Cost: medium, stageable. Extensibility: good. Maintainability: good — each package has a clear "must not import" rule.

### C. Plugin-first kernel

Everything — routes, nav, features, shell slots — is a plugin; apps are a manifest.

- **+** Maximum composability.
- **−** Needs plugin routes (TanStack file routing fights this), lifecycle, dependency ordering, versioned host API. No second app exists to validate any of it. Overengineering against your own constraint.
- Cost: high. Not recommended now.

### Where I differ from the ChatGPT proposal

| ChatGPT suggestion                                           | My view                                                                                                                  | Why                                                                                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root-level `plugins/` as plain folders (not a package)       | **Make it one private workspace package** `packages/plugins`                                                             | Root source outside any package needs tsconfig path hacks, its own deps (AWS SDKs) can't be declared, lint/tests have no home. One package = still "no package per plugin". |
| `packages/domain` + `packages/contracts` + `plugin-sdk`      | **One `packages/core`** (domain + contracts) and one `packages/platform`                                                 | Domain and contracts share every type (`DataFrame`, `AppError`); splitting now is organisational appearance.                                                                |
| `packages/dashboard`, `packages/ui` now                      | **Defer** until a second app imports them                                                                                | No second consumer → the boundary would be guessed and would leak app assumptions (P9).                                                                                     |
| Design `SearchProvider` (Meilisearch/Elastic)                | **Don't**                                                                                                                | Search exists only in `apps/docs/catalog/catalog.yaml`. Design capability contracts when the first implementation is written.                                               |
| Split document store vs record store                         | **Keep one `RecordProvider`** for now                                                                                    | Dashboards-as-records works, is tested, and the archived decision (one storage path) still holds. Revisit only if a backend can store records but not documents.            |
| `services/convex`                                            | **Only with `convex.json`** `{"functions": "…"}`; else leave `convex/` at root                                           | Convex CLI, `_generated`, and the `convex` vitest project depend on the path. Low value move.                                                                               |
| `features/<x>/{api,components,hooks,model,utils}` everywhere | **Concern subfolders first** (`grid/`, `editor/`), `components/`/`hooks/` only inside a concern when it exceeds ~6 files | Your dashboards feature is already organised by concern, which is more discoverable than by file kind.                                                                      |

---

## 3. Proposed trees (option B)

### 3.1 Repository

```
mantine-dashboard-builder/
├─ apps/
│  ├─ web/                    # today's root app: vite.config, index.html, public/, .storybook/, plugins.config.ts
│  └─ relay/                  # today's relay/
├─ packages/
│  ├─ core/                   # @mdb/core  – from src/core (+ relay contract)
│  ├─ platform/               # @mdb/platform – plugin model, registries, capability selection, settings & vault stores
│  └─ plugins/                # @mdb/plugins – all internal plugins, subpath exports
├─ convex/                    # unchanged location (decision in §7)
├─ tooling/
│  └─ lint/                   # oxlint JS plugin + rule tests (today's lint/)
├─ docs/
│  ├─ architecture/           # new vocabulary, ownership, ADRs
│  └─ archive/
├─ package.json  pnpm-workspace.yaml  tsconfig.base.json  oxlint.config.ts  .github/
```

Drop `apps/docs` as an "app": move the catalog to `docs/catalog/` (or delete — §5).

### 3.2 `apps/web/src`

```
src/
├─ app/
│  ├─ bootstrap/        main entry glue, App, AppCrash, Devtools
│  ├─ providers/        Providers, PlatformProvider (was PluginsProvider)
│  ├─ composition/      createAppPlatform.ts (plugin list), connections→datasources, recordSync, storageCollections
│  ├─ routing/          router.ts, RouteError, NotFound
│  ├─ routes/           TanStack file routes (thin: params, loaders, component import)
│  ├─ nav.ts            app config
│  └─ queryClient.ts
├─ features/
│  ├─ dashboards/       list/ view/ grid/ editor/ header/ inspect/ state/ data/
│  ├─ connections/      was features/datasources (connections + vault UI)
│  ├─ plugin-catalog/   was datasources/buildList + PluginsSection (what is in this build)
│  ├─ record-storage/   was features/storage ("Storage" stays the page title)
│  ├─ settings/
│  ├─ notifications/
│  ├─ integrations/     Sentry
│  └─ debug/
├─ shell/               sidebar/ navbar/ context-bar/ breadcrumbs/ store/
├─ shared/              hooks (density, motion, current-user), notify, sentry runtime, storage keys
├─ ui/                  tokens/ theme/ components/   (extract to packages/ui only with a 2nd app)
└─ testing/
```

Layer rule becomes: `ui → shared → shell → features → app`, all may import `@mdb/core` and `@mdb/platform` (types + hooks), only `app/composition` imports `@mdb/plugins/*`.

### 3.3 `packages/platform/src`

```
plugin/          definePlugin, PluginDefinition, contribution types
contributions/   widget.ts, datasource-type.ts, record-provider.ts   (+ panel/action only when used)
capabilities/    records/ (selection, loadRecordProvider, status)    – generic "select one" helper
connections/     Connection, ConnectionField, connection→datasource adapter
secrets/         vault store (from lib/vault)
settings/        namespaced persisted settings (from lib/storage + placeSetting)
registry/        toRegistry, createPlatform(), PlatformContext, usePlatform()
```

### 3.4 `packages/plugins/src` (organised by integration, not by kind)

```
widgets/        chart, chart-recharts, kpi, table          (built-ins are plugins too)
datasources/    mock, local-json
aws/            plugin.ts, datasources/{athena,aurora,redshift,dynamodb}
google/         plugin.ts, datasources/{bigquery,firestore}, auth
relay-client/   shared client used by azure-sql and mongodb
azure-sql/      plugin.ts
mongodb/        plugin.ts
browser-storage/ plugin.ts, record-provider
convex/         plugin.ts, record-provider        (client adapter; functions stay in convex/)
```

`package.json` `exports`: `"./aws": "./src/aws/plugin.ts"`, … so the app imports `@mdb/plugins/aws`. One `dependencies` list (AWS SDKs, convex client) — tree-shaking + build-time selection still keep unused vendors out of `dist`.

### 3.5 Naming and ownership rules

| Term                | Meaning                                                                      | Code name                               |
| ------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| **Plugin**          | Unit of inclusion: an id + what it contributes. Chosen per app at build time | `PluginDefinition`, `definePlugin`      |
| **Contribution**    | A thing a plugin adds to a list; all are active                              | `WidgetDefinition`, `DatasourceType`, … |
| **Capability**      | A slot with exactly one active provider at a time, chosen at runtime         | `records` today                         |
| **Provider**        | Implementation of a capability contract                                      | `RecordProvider`                        |
| **Datasource type** | Kind of queryable backend a plugin supports (`athena`)                       | `DatasourceType`                        |
| **Connection**      | User-configured instance of a datasource type (settings + vaulted secrets)   | `Connection`                            |
| **Datasource**      | Resolved queryable thing (built-in or from a connection)                     | `Datasource` (was `DatasourcePlugin`)   |
| **Record storage**  | User-facing name for where records live. Retire "place" in code              | —                                       |
| **Service**         | A separately deployed backend (relay, Convex)                                | `apps/relay`, `convex/`                 |

Ownership:

| Location                     | Owns                                                                                   | Must not import                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/core`              | Domain types, schemas, wire/provider contracts, pure logic                             | React, Mantine, TanStack, zustand, any SDK                                               |
| `packages/platform`          | Plugin model, registries, capability selection, settings/secrets stores, `usePlatform` | `@mdb/plugins`, any app, vendor SDKs                                                     |
| `packages/plugins`           | Vendor adapters, widget implementations                                                | apps, other plugins' internals (shared code goes to a named folder like `relay-client/`) |
| `apps/*/src/app/composition` | Which plugins this app ships; wiring features to each other                            | — (top)                                                                                  |
| `apps/*/src/features`        | Screens and workflows                                                                  | `app/`, other features, `@mdb/plugins`                                                   |
| `apps/relay`, `convex/`      | Server code                                                                            | React, platform                                                                          |

Casing **[S]**: kebab-case folders, PascalCase component files, camelCase other files, kebab-case plugin ids.

---

## 4. Plugin and capability architecture

**Verdict: retain the mechanics, redesign the shape.** The registries, lazy `load()`, duplicate checks and build-time exclusion are good. The missing piece is one plugin definition, and a clear split between _contributions_ (lists) and _capabilities_ (select one).

```ts
// packages/plugins/src/aws/plugin.ts  (target shape, illustrative)
export const awsPlugin = definePlugin({
  id: 'aws',
  name: 'AWS',
  description: 'Athena, Aurora, Redshift, DynamoDB from the browser.',
  contributes: {
    datasourceTypes: [athena, aurora, redshift, dynamodb],
  },
});

// packages/plugins/src/convex/plugin.ts
export const convexPlugin = definePlugin({
  id: 'convex',
  name: 'Convex',
  contributes: { recordProviders: [convexRecordProvider] },
});

// apps/web/src/app/composition/createAppPlatform.ts
export const platform = createPlatform({
  appId: 'dashboard-builder', // namespaces persisted settings (fixes hardcoded prefix)
  plugins: [builtinWidgets, builtinDatasources, browserStoragePlugin, convexPlugin, ...optionalPlugins],
  defaults: { records: 'browser' },
});
```

Rules:

1. **Build-time inclusion** = the app's plugin list. Optional vendors still come through a virtual module/config so excluded code is not in `dist`.
2. **Contributions** are collected into registries exactly as today (`toRegistry`).
3. **Capabilities** are selected at runtime by a resolver that lives on the platform _instance_, not module scope. Unknown/unavailable id → explicit fallback state (today's `isFallback`), never silent backend switching.
4. **Definitions light, code lazy** — unchanged.
5. **Contracts first, conformance suite always**: every capability gets a contract in `core` plus a shared test suite like `recordProviderSuite.ts`; each provider runs it.
6. **Backends**: alternative backends = alternative `RecordProvider`s (browser, Convex, later REST against `apps/relay` or another API). The plugin is the client adapter; the service is deployed separately.

Do **not** build now: plugin lifecycle/dependency ordering, plugin-contributed routes, search/auth contracts, actions/panels (delete until the first real one), runtime plugin installation.

Security note **[F]**: `convex/records.ts` functions are public with no auth (stated in its header). Any multi-backend story must add auth before Convex holds real data.

---

## 5. Cleanup and simplification candidates

Confidence: **H** verified no runtime use · **M** likely, needs a decision · **L** keep until tested.

| Candidate                                                                                                                   | Action                                                                              | Conf.      | Evidence                                                                                                 | Risk                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/plugins/ActionPlugin.ts`, `ContextPanelPlugin.ts`, `panels`/`actions` in `Plugins` + `app/plugins.ts`                  | Remove; re-add with first consumer                                                  | H          | Only `app/plugins.test.ts` reads them                                                                    | Low                                                                                         |
| `src/lib/records/watchRecords.ts`                                                                                           | Remove (or move into Convex provider if it will push changes)                       | H          | No importer (`docs/STATUS.md` confirms)                                                                  | Low                                                                                         |
| `CollectionDefinition`, `DEFINITIONS_COLLECTION`, `FieldsSchema`, `JSON_SCHEMA_DIALECT` in `core/records/RecordProvider.ts` | Move to a separate `collectionDefinition.ts` or remove; trim suite                  | M          | Used only by `recordProviderSuite.ts`                                                                    | Low; ties to future "Studio"                                                                |
| `src/features/node-studio/AGENTS.md`                                                                                        | Move to `docs/archive/node-studio/`                                                 | H          | Folder has no code                                                                                       | None                                                                                        |
| `src/app/routes/explore.tsx`, `templates.tsx`, `-PlaceholderPage.tsx` + nav entries                                         | Remove or keep as roadmap                                                           | M          | Placeholders only                                                                                        | UX only                                                                                     |
| `apps/docs/` (catalog YAML + generator + generated md)                                                                      | Move to `docs/catalog/` or archive                                                  | M          | Not a package; describes un-built capabilities (search etc.)                                             | None                                                                                        |
| `docs/current-state.md`, `docs/STATUS.md`                                                                                   | Archive once new `docs/architecture/` exists                                        | M          | Both describe pre-restructure and link archived docs                                                     | Breaks links → update `lint/docs.test.ts` scope                                             |
| `docs/archive/_EXTRA/**` (perf scripts, screenshots, spike patches)                                                         | Delete or move out of repo                                                          | M          | Not referenced by build/CI; patches already applied or abandoned                                         | Lose history only (git keeps it)                                                            |
| `.codex/config.old.toml`                                                                                                    | Delete                                                                              | H          | `.old` copy of `config.toml`                                                                             | None                                                                                        |
| `.rtk/pipeline.toml`, `.agents/skills/*` (TanStack skills), `skills-lock.json`, `.codex/`                                   | Keep if you use those agents; else remove                                           | L          | Personal tooling, referenced by `pnpm-workspace.yaml` (`skills.dirs`) and `vite.config.ts` cache ignores | Edit those configs together                                                                 |
| `plugins.json` + `features/datasources/buildList/*` (GitHub-commit "Add to build", dev endpoint `/__plugins`)               | Decide (§7 Q4): keep as app feature, or replace with code-level per-app plugin list | M          | ~700 lines of UI + Vite middleware for build editing                                                     | Removes a working feature                                                                   |
| `features/datasources/`                                                                                                     | Split → `connections/` + `plugin-catalog/`                                          | H (rename) | P7                                                                                                       | Route ids unchanged if routes stay                                                          |
| `features/storage/` + "place" naming                                                                                        | Rename → `record-storage/`; `place*` → `recordStorage*` in code                     | H (rename) | P7                                                                                                       | **Persisted localStorage keys (`record-provider`, `place-settings`) must keep their names** |
| `src/lib/`                                                                                                                  | Dissolve: vault/records/storage → `platform`; notify/sentry/hooks → `shared/`       | H          | P3                                                                                                       | Lint layer rules                                                                            |
| `src/plugins/` contracts                                                                                                    | Move to `core`/`platform`; implementations to `packages/plugins`                    | H          | P2                                                                                                       | Large import rewrite (mechanical)                                                           |
| `DashboardPage.tsx`, `WidgetHeader.tsx`, `SentryVerificationCard.tsx`, `AddToBuildDialog.tsx`                               | Split (separate functional PRs, not during moves)                                   | M          | CC 17–30, 230–500 lines                                                                                  | Behavioural regressions                                                                     |
| Small clones (`activeRecordProvider`/`placeSetting` subscribe; two `.module.css` page headers)                              | Extract a `createPersistedSetting()` helper in platform                             | M          | qartez clones #4, #6                                                                                     | Low                                                                                         |
| `convex/`, `relay/`, `.storybook/`, `public/data/`, `.claude/settings.json`, `lint/`                                        | **Keep**                                                                            | —          | Active runtime/test/security                                                                             | —                                                                                           |

---

## 6. Staged migration plan

Every stage = one PR. Moves use `git mv` and contain no behaviour change. Each stage updates lint layers + `lint/fixtures` + `vite.config.ts`/`vitest.config.ts` globs + CI paths in the same commit.

**Standard verification** (every stage):

```
pnpm lint            # oxlint + types + stylelint
pnpm format:check
pnpm test:unit       # node + dom projects (includes lint/rules.test.ts, lint/docs.test.ts)
pnpm test:stories
pnpm build
pnpm --filter dashboard-relay build
```

Plus manual smoke: open a dashboard, edit+save, switch record storage browser↔Convex, test a relay connection.

| #   | Stage                                                                                                                                                                                                                                                                               | Kind           | Depends on | Key risks / notes                                                                                                                                                                                                                                                                                                                                                                             | Rollback                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 0   | **Baseline**: fix links broken by the archive commit; write `docs/architecture/` (vocabulary §3.5, ownership, decisions from §7)                                                                                                                                                    | docs           | —          | `lint/docs.test.ts` must pass before anything else                                                                                                                                                                                                                                                                                                                                            | revert                                |
| 1   | **Delete dead scaffolding** (§5 H rows: actions/panels, watchRecords, node-studio stub, `.codex/config.old.toml`)                                                                                                                                                                   | cleanup        | 0          | Tiny; proves the pipeline                                                                                                                                                                                                                                                                                                                                                                     | revert                                |
| 2   | **Extract `packages/core`**: `src/core` → `packages/core/src`; add `tsconfig.base.json`; app + relay import `@mdb/core/...`; drop `../../src/core`                                                                                                                                  | move           | 0          | `allowImportingTsExtensions`/source-only package (no build step) — keep `exports` pointing to `.ts`; relay `vp pack` must bundle it; lint `core` rule moves to package                                                                                                                                                                                                                        | revert                                |
| 3   | **Move app to `apps/web`, relay to `apps/relay`**                                                                                                                                                                                                                                   | move           | 2          | Vite `base`, `routesDirectory`, `generatedRouteTree`, `public/`, `index.html`, `.storybook`, `plugins.config.ts` + `plugins.json` path (GitHub-commit flow writes it — update `githubBuildList.ts` `FILE`), `tsconfig` refs, vitest projects, stylelint glob, fmt ignores, `cacheInput`, CI `dist` → `apps/web/dist` (`cp …/404.html`, `upload-pages-artifact` `path`), `.claude/launch.json` | revert; one PR is big but mechanical  |
| 4   | **Reorganise `apps/web/src`** (no package changes): `app/` subfolders; `features/datasources` → `connections` + `plugin-catalog`; `features/storage` → `record-storage`; `lib/` → `shared/` (+ platform-bound files into `src/platform/` temporarily); kebab-case folders if chosen | move/rename    | 3          | Lint `layer()` list + fixtures; keep persisted key names                                                                                                                                                                                                                                                                                                                                      | revert                                |
| 5   | **Move contracts out of `src/plugins/`** into `src/platform/` (in-app first): registry, `usePlugins`→`usePlatform`, `Connection*`, contracts                                                                                                                                        | move           | 4          | Pure moves + renames (`DatasourcePlugin`→`Datasource`); type aliases for one stage if helpful                                                                                                                                                                                                                                                                                                 | revert                                |
| 6   | **Unify plugin definition** (`definePlugin` with `contributes`), convert built-ins, optional plugins and record providers; virtual module emits `PluginDefinition[]`                                                                                                                | **functional** | 5          | `plugins.config.ts` codegen changes; keep catalog/"Add to build" working; registry tests                                                                                                                                                                                                                                                                                                      | revert; old adapters kept until green |
| 7   | **Platform instance**: `createPlatform({ appId, plugins, defaults })`; capability selection + settings/vault become instance-scoped; remove module singleton + import-time side effect                                                                                              | **functional** | 6          | Persisted values must read the same keys (`appId` = `dashboard-builder` keeps prefix)                                                                                                                                                                                                                                                                                                         | revert                                |
| 8   | **Extract `packages/platform` and `packages/plugins`**                                                                                                                                                                                                                              | move           | 7          | Package deps (AWS SDKs, convex) move with plugins; `optionalPlugins()` Vite plugin resolves package subpaths                                                                                                                                                                                                                                                                                  | revert                                |
| 9   | **Split god components** (DashboardPage, WidgetHeader, …)                                                                                                                                                                                                                           | functional     | 4+         | Story/interaction tests cover them; independent of 5–8                                                                                                                                                                                                                                                                                                                                        | revert per PR                         |
| 10  | **Second app proof** (`apps/<name>`): consumes `core`, `platform`, `plugins`, different plugin list; extract `packages/ui` / dashboards only for what it actually imports                                                                                                           | new            | 8          | The real test of reusability                                                                                                                                                                                                                                                                                                                                                                  | delete app                            |

Stages 1, 9 can run anytime after 0. Stage 2 is the cheapest high-value step. Stages 6–7 are the only real redesign; everything else is mechanical.

---

## 7. Unresolved decisions

**Q1. What is the second application?** The archived target mentions a "rehab app" with record views, and `recordProviderSuite.ts` uses patient fixtures. If that is real, it decides what goes into `packages/` (records UI, shell, dashboards). _Recommendation:_ name it and its first screen before stage 8; extract nothing beyond core/platform/plugins until it exists.

**Q2. Shared shell or per-app shell?**

- (a) One shell package, apps contribute nav/routes.
- (b) Each app owns its shell, built from shared `ui` primitives. _(recommended — shell today is app-specific: `nav.ts`, context-bar tabs via route `staticData`)_
- (c) Shell parametrised by config only.

**Q3. Scope of runtime capability selection?** Today: one global browser key per origin; no "workspace" concept exists anywhere in code.

- (a) Per app, per browser (today). _(recommended for now)_
- (b) Per workspace — requires designing workspaces first.
- (c) Per collection (dashboards in Convex, other records local).

**Q4. How are optional plugins chosen per build?**

- (a) Keep `plugins.json` + the in-app "Add to build" (GitHub commit) flow, per app.
- (b) Per-app `plugins.config.ts` in code, edited by developers; drop the GitHub-commit UI. _(recommended for an internal-plugin platform — less code, reviewable in PRs)_
- (c) Both.

**Q5. Backend direction?**

- (a) Convex + browser now; relay stays a query proxy. _(recommended)_
- (b) Relay grows into a general API backend (REST `RecordProvider`, auth) — then it should be renamed `apps/api` and own auth.
- (c) Add another BaaS (Supabase, etc.) as a third provider to validate the contract.

**Q6. Folder casing:** kebab-case (recommended) vs keep camelCase.

**Q7. Cleanup appetite:** archive or delete `docs/archive/_EXTRA`, `apps/docs` catalog, placeholder routes, agent tooling folders?
