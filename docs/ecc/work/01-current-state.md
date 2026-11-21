# 01 — Current state (Phase 1)

Branch `review` @ `a8d5c57`, 2026-11-21. Read-only: no source changed.

This document does not say what the repository should become. It records what exists, where it falls short, and what has to be decided.

**Method.** The `ecc:brownfield-retrospective` phases 1–3 (audit, backward reconstruction, four-axis gap register) were applied to the whole repo, as the playbook asks. The skill's default is slice-first, writing to `docs/retro/<slice>/`. Here the slices are five areas, and everything is in this one file. Phases 4–6 (redesign, execution, re-audit) belong to playbook phases 3–5.

**Inputs.**

- qartez: `qartez_map`, `qartez_stats`, `qartez_unused`, `qartez_clones`, `qartez_hotspots` and `qartez_health`. `qartez_boundaries` has no config, so it was not run.
- Four `ecc:code-explorer` passes, one per area: app/UI, plugin system, data and persistence, and relay plus tooling.
- Git history.
- A baseline run of `vp run check:lint` and `vp run check:unit`.
- A dependency usage scan.

**Treated as claims, not facts:** `README.md`, `docs/**` (including `docs/review/architecture-audit.md` and the ChatGPT conversation), archived agent rules, and code comments. Where the prior audit was checked, §1.9 says whether it held.

Legend: **[F]** observed fact (verified against code or command output) · **[E]** explorer-reported, not spot-checked · **[U]** user requirement · **[D]** user direction still to be rechecked · **[?]** open question. There are no recommendations here; the gap register's "fix direction" column only names options for Phase 3. Each gap's severity rests on its code evidence alone; where a direction would raise it, the row says so.

---

## 0. User input (not derived from code)

### 0.1 Direction to recheck [D]

These are the user's answers in the 2026-11-21 ChatGPT conversation. The user has said they are **not decided**: they are direction to recheck in Phases 2 and 3.

- **[D1]** The project becomes a reusable platform for several applications.
- **[D2]** Plugins and extensions stay internal folders in this repo, with no package per plugin.
- **[D3]** Several implementations of a capability can be in the build, and the active one is chosen at runtime. Example: search on Meilisearch or Elastic.
- **[D4]** Several alternative backends sit behind the same contracts.
- **[D5]** The restructure is staged, and working behaviour is preserved.
- **[D6]** Layout preferences, not permission to overengineer:
  - a monorepo-like layout (`apps/`, `packages/`, backend);
  - Bulletproof-React-style feature folders with `components/` and `hooks/`;
  - no ambiguous same-name folders;
  - no flat grab-bag folders.

### 0.2 Requirements [U]

From `docs/ecc/restructure-playbook.md`, where they are recorded as user requirements:

- **[U7]** Keep Vite+. Consider better task running and caching (`vpr`, Turborepo, Nx or similar) alongside it.
- **[U8]** Tests are too heavy and partly pointless; the suite should shrink to what is useful.
- **[U9]** Linting is too much and too strict, including doc linting.
- **[U10]** The order is restructure, then tooling, simplification, CI and tests.
- **[U11]** Library skills are copied in locally after the tooling work.

The ChatGPT proposals (`apps/web`, `packages/{domain,platform,dashboard,ui}`, `plugins/{builtin,integrations}`, `services/`) are **direction only**. They are evaluated in Phase 2/3, not here.

---

## 1. Observed facts

### 1.1 Topology [F]

| Path                                     | What it actually is                                                                                                                                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (`package.json` `dashboard-builder`) | The SPA itself. App config sits at the root: `vite.config.ts`, `index.html`, `plugins.config.ts`, `plugins.json`, `tsconfig.app.json`, `postcss.config.cjs`, `.stylelintrc.json`, `.storybook/`, `public/`. |
| `relay/`                                 | The only pnpm workspace member (`pnpm-workspace.yaml`). It is `dashboard-relay`, built on Hono with `mssql` and `mongodb`. It is a stateless query proxy for drivers that browsers cannot run.              |
| `convex/`                                | Convex functions: one table `records` (`schema.ts`) and CRUD plus import (`records.ts`). There is no `convex.json`.                                                                                         |
| `apps/docs/`                             | **Not an app or package.** It has no `package.json` and is not in the workspace. It holds a YAML catalog, a zod schema, a generator script that is run by hand, and generated md.                           |
| `lint/`                                  | The custom oxlint JS plugin (3 rules), 4 test files, and fixtures that mirror `src/<layer>`.                                                                                                                |
| `scripts/new-worktree.ps1`               | A Windows-only worktree helper.                                                                                                                                                                             |
| `docs/`                                  | `STATUS.md`, `current-state.md`, `archive/` (old target, plans, node-studio, `_EXTRA`), `review/`, `ecc/`.                                                                                                  |

Size (qartez): 474 indexed files, 39.4k LOC source + 8.1k test, 4,065 symbols, 604 file-import edges. Tracked files: 554.

### 1.2 `src/` layers [F]

`oxlint.config.ts` enforces the layer order `utils → core → ui → lib → plugins → shell → features → app` with per-folder `no-restricted-imports` (`layer()`). It also enforces `import/no-cycle`, no barrels, primitives only inside `ui/`, server packages banned from the browser, `virtual:optional-plugins` only in `app/`, and the Sentry SDK only through `lib/sentry/runtime`.

| Layer       | Holds                                                                                                                                                                                                                                    | Observed issues                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/`    | `wait`, `slugify`, `downloadFile`                                                                                                                                                                                                        | —                                                                                                                                                                                                                                                                                                                                                       |
| `core/`     | `DataFrame`, dashboard schema and layout, time ranges, `AppError`, `RecordProvider` contract, relay wire contract, crypto, build-info schema                                                                                             | Framework-free: no React, TanStack, Zustand, Mantine or Convex imports. `core/relay` (used only by the relay and its plugins) and `core/build` (a tooling concern) are not domain.                                                                                                                                                                      |
| `ui/`       | Tokens (primitives, semantic, dimensions), about 20 Mantine theme overrides, `global.css`, and 7 components (`Page`, `Section`, `Surface`, `SplitView`, `ErrorState`, `Skeletons`, `QueryBoundary`)                                      | It imports nothing upward. It is mostly a theme; the component library is thin.                                                                                                                                                                                                                                                                         |
| `lib/`      | `storage.ts` (localStorage keys and legacy-key migration), `records/` (active provider, place setting, `watchRecords`), `vault/`, `notify/`, `sentry/`, `useDensity`, `useMotion`, `useCurrentUser`                                      | A grab-bag: platform services, cross-cutting services, UI prefs and a placeholder user. `notify` imports `@/ui/tokens/semantic`.                                                                                                                                                                                                                        |
| `plugins/`  | Contracts (`WidgetPlugin`, `DatasourcePlugin`, `OptionalPlugin`, `RecordProviderPlugin`, `ActionPlugin`, `ContextPanelPlugin`), the registry and context hook (`usePlugins.ts`), `connectionDatasource.ts`, **and** every implementation | Contracts and vendor code share one folder (§1.4).                                                                                                                                                                                                                                                                                                      |
| `shell/`    | Sidebar, navbar, context bar, breadcrumbs, shell store, `Panel`, `RouteProgress`, `OfflineBanner`                                                                                                                                        | Production code imports no feature, app or plugin code. The app name is hardcoded (`sidebar/Brand.tsx` `APP_NAME`). Stories and tests import `@/app/nav` and `@/features/notifications/notificationsTab`.                                                                                                                                               |
| `features/` | dashboards, datasources, storage, settings, integrations (Sentry), notifications, debug, node-studio                                                                                                                                     | There are **no feature-to-feature imports** in production code. The internal layout differs per feature (§1.3).                                                                                                                                                                                                                                         |
| `app/`      | 23 files at the root plus `routes/`                                                                                                                                                                                                      | It is flat and mixes bootstrap (`App`, `AppCrash`, `Devtools`, `queryClient`), providers (`Providers`, `PluginsProvider`), routing (`router`, `nav`, `NotFound`, `RouteError`), plugin wiring (`plugins.ts`, `recordProviders.ts`, `withConnections.ts`, `optionalPlugins.d.ts`) and dashboards-domain glue (`recordSync.ts`, `storageCollections.ts`). |
| `testing/`  | Test harness (`render`, `setup`, `TestRouter`, `recordProviderSuite`) plus Storybook helpers (`AppStory`, `StorageStory`) and fixtures                                                                                                   | —                                                                                                                                                                                                                                                                                                                                                       |

**Boot path.** `main.tsx` imports `ui/global.css`, calls `startSentry()` and renders `<App>`.

`App` then does the following, in order:

1. Creates the QueryClient.
2. Calls `startRecordSync` in the `useState` initializer.
3. Creates the router.
4. Renders `Providers > ErrorBoundary > RouterProvider`.

`Providers` nests, outermost first: Mantine, Query, `CurrentUserContext` (placeholder), `VaultProvider`, `ConnectionsProvider` (taken **from `features/datasources/connections`**), `PluginsProvider` (which depends on `useConnections`), Modals and Notifications.

`routes/__root.tsx` injects `nav` and `notificationsTab` into the shell.

**Routes** are thin, with one exception. `routes/dashboards/$id.tsx` (72 lines) holds the draft redirect, the loader with prefetch, and the `DashboardRouteData` type.

### 1.3 Naming and layout [F]

**One concept spread over many names and folders:**

- **Record storage** has three names. It is "storage" (route `/storage`, `features/storage`), "place" (`StoragePlacePage`, `placeSetting`, `getActivePlace`, `PlaceSetupForm`) and "record provider" (`RecordProvider`, `activeRecordProvider`, `RecordProviderPlugin`). The record concept sits in 5 places:
  - `core/records`
  - `lib/records`
  - `plugins/RecordProviderPlugin`
  - `plugins/recordProviders`
  - `app/recordProviders.ts` and `app/recordSync.ts`
- **`storage`** names 4 unrelated things:
  - `lib/storage.ts` (localStorage key helper)
  - `features/storage` (provider choice and transfer UI)
  - `browserStorage` (a provider)
  - `app/storageCollections.ts` (bridge to dashboards)
- **`datasources`** names 3 things:
  - `app/routes/datasources`
  - `features/datasources`, which owns **connections CRUD, vault dialogs, and the build-list that commits `plugins.json` to GitHub**
  - `plugins/datasources`

  The word also names the plugin kind. The route `/datasources/$id` edits a _connection_.

- **Connections** are split across 3 places: state in `features/datasources/connections/`, conversion in `app/withConnections.ts` plus `plugins/connectionDatasource.ts`, and secrets in `lib/vault/`. The vault dialogs live in `features/datasources/vault/`.
- **"Plugin"** names 5 different things:
  - `WidgetPlugin`: a definition.
  - `DatasourcePlugin`: a runtime _instance_, including one per user connection.
  - `OptionalPlugin`: a datasource-type bundle only, `{id, types: DatasourceType[]}` (`src/plugins/OptionalPlugin.ts:80`).
  - `RecordProviderPlugin`: a definition plus a loader.
  - `ActionPlugin` and `ContextPanelPlugin`: no implementations.

**Inconsistent feature layout:**

| Feature                     | Layout                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboards`                | Concern subfolders: `data/`, `editor/`, `grid/`, `header/`, `inspect/`, `state/`, plus 6 root files. `header/` mixes UI with import, export and format logic. |
| `datasources`               | 12 root files plus `buildList/`, `connections/` and `vault/`                                                                                                  |
| `storage`                   | Flat, 10 files                                                                                                                                                |
| `settings`, `notifications` | Flat                                                                                                                                                          |
| `integrations`              | `SentryPage.tsx` sits next to `sentry/`, not inside it                                                                                                        |
| `node-studio`               | Only an `AGENTS.md`. It has no code and no route.                                                                                                             |

Casing is camelCase for folders (`contextBar`, `recordProviders`, `azureSql`) and kebab-case for ids (`azure-sql`).

### 1.4 Plugin and extension system [F]

```
definition (defineWidget / defineOptionalPlugin / defineDatasourceType, generic-erasing casts:
            WidgetPlugin.ts:116, OptionalPlugin.ts:99)
  → static lists in app/plugins.ts (widgets, mock, localJson) + virtual:optional-plugins (types)
    + app/recordProviders.ts (browser, convex)
  → toRegistry (usePlugins.ts:38, throws on duplicate id)
  → PluginsProvider (adds one DatasourcePlugin per connection via withConnections)
  → usePlugins() in features
```

**How each kind of thing is included and selected:**

| Thing                                                                  | Included                                                                                                                                                     | Selected                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Widgets (kpi, chart [ECharts], chart-recharts [Mantine charts], table) | Hardcoded                                                                                                                                                    | All active                                                                              |
| Datasources (mock, localJson)                                          | Hardcoded                                                                                                                                                    | All active                                                                              |
| Optional datasource types (aws, google, azure-sql, mongodb)            | Build time: `plugins.json`, then the Vite plugin in `plugins.config.ts:169`, then `virtual:optional-plugins`. **`plugins.json` is `{"plugins": []}` today.** | The user creates a connection                                                           |
| Record providers (browser, convex)                                     | Hardcoded `createRecordProviders()`                                                                                                                          | **Runtime**: localStorage `record-provider` `{version:1,id}`, falling back to `browser` |
| Actions, context panels                                                | `ACTIONS = []` and `PANELS = []` (`app/plugins.ts:14-15`)                                                                                                    | Nothing reads them                                                                      |

- **Lazy loading.** Widget components use React.lazy with retry. Datasource runtimes and record providers are loaded with `load: () => import()`. Metadata, schemas, icons and fields are eager.
- **Build-list feature.** In dev, a POST to `/__plugins` writes `plugins.json`; that dev middleware lives inside the Vite config. On the live site, a user-pasted GitHub fine-grained PAT (optionally kept in the vault) PUTs a commit to `plugins.json`. The app then polls `build-info.json` every 15 s for up to 20 min (`features/datasources/buildList/githubBuildList.ts`). The Pages deploy runs on push to `main` only (`.github/workflows/github-pages.yaml`), so a branch other than `main` never deploys.
- **Three places must agree on build selection:** the `OPTIONAL_PLUGINS` table (with module path as a string and an export name derived from the filename), the module's own `defineOptionalPlugin` id, and `plugins.json`. Only the table lookup checks this.
- **Capability selection** exists only for record storage. `lib/records/activeRecordProvider.ts` holds module-global `entries`, `loading` and `lastPlace`. These are configured by an import-time side effect: `configureRecordProviders(...)` runs in `app/plugins.ts`. `lib/` takes a structural type because lint forbids `lib → plugins`. `placeSetting.ts` duplicates its versioned-store and subscribe code (qartez clone group #4).
- **Duplication.** The aws types repeat near-identical blocks; the athena, aurora and redshift example SQL strings are identical. The azure-sql and mongodb runtimes have the same shape over a shared `relayClient`.
- **Dependency direction.** Implementations import only `core`, `ui` (Skeletons, semantic tokens) and `utils`. Features import contracts and `usePlugins`, and also `@/plugins/connectionDatasource` (`useConnectionForm.ts:12`, `useConnectionStatus.ts:2`). Tests and stories import implementations directly.

### 1.5 Data and persistence [F]

**Two data paths:**

- **Query data.** `useWidgetData` → `useQueries` with `datasourceQuery` (`features/dashboards/data/dashboardQueries.ts:55`) → `datasource.query()` → `DataFrame[]`.
  - Cache key: `['ds', id, revision, spec, …time]`, with `staleTime: Infinity`.
  - The route loader prefetches with `startWidgetQueries.ts:45`.
  - Lint rule `app/no-datasource-query` limits `.query` calls to that module and the plugin and relay code.
- **Record data.** `dashboardQueries.ts:19-32` → `dashboardApi.ts` → `loadRecordProvider(place.id)` → collection `dashboards`.
  - Reads lay saved records over the static seeds in `public/data/dashboards`.
  - An unreadable place falls back to the seeds and sets `placeError`.
  - Save is not a TanStack mutation: `createDashboardStore.save` calls `saveDashboard`, which uses the source's place, not the active one.

**`RecordProvider` contract** (`core/records/RecordProvider.ts:121-165`):

- Methods: `list`, `get`, `create`, `update` (shallow merge plus `expectedRevision`), `delete`, `subscribe`, `exportCollection`, `importCollection` and `checkStatus`.
- It declares `capabilities` and returns `RecordResult` unions instead of throwing.
- A shared conformance suite exists: `src/testing/recordProviderSuite.ts`.
- **Both providers run `runListQuery` over a full read.** Convex pulls the whole collection with `MAX_RECORDS = 2000`, a value duplicated in `convexProvider.ts:21` and `convex/records.ts:12`.
- Setup is a single string (`RecordProviderSetup`), and `place-settings` is `Record<string, string>`.

**Every persistence mechanism.** All use localStorage with the `dashboard-builder:` prefix (`lib/storage.ts`); there is no IndexedDB or sessionStorage.

| Mechanism                                                                | Key / location                                                                                                                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Records (browser provider)                                               | `records:<collection>`                                                                                                                                        |
| Records (Convex)                                                         | `records` table                                                                                                                                               |
| Active place                                                             | `record-provider`                                                                                                                                             |
| Convex URL                                                               | `place-settings`, or `VITE_CONVEX_URL`                                                                                                                        |
| Editor drafts                                                            | `draft:<placeId>:<id>` (`drafts.ts`). Always browser-local, even for Convex dashboards.                                                                       |
| Legacy dashboards and drafts                                             | `saved:<id>` and `draft:<id>`, migrated at startup. `migrateLegacyKeys()` runs as an import side effect (`lib/storage.ts:52`), marked "delete after 2027-01". |
| Connections                                                              | `connections` (zustand persist, zod-filtered)                                                                                                                 |
| Vault secrets                                                            | `vault` (PBKDF2 plus sealed box, `core/crypto/passphraseCipher`; the key is held only in memory)                                                              |
| Build target, Sentry config, shell, inbox, density, motion, color scheme | One key each                                                                                                                                                  |

- **State tools.** TanStack Query holds frames, the dashboard list and detail, and storage status and counts. Zustand holds connections, vault, inbox, shell, and the dashboard editor (immer plus zundo undo).
- **Live updates.** `lib/records/watchRecords.ts` and `core/records/recordKeys.ts` have no production importer, and no app code calls `provider.subscribe`. Convex live updates are therefore not wired.
- **Unused schema.** `CollectionDefinition` and `DEFINITIONS_COLLECTION` are used only in tests.
- **Convex.** The functions are public and check no auth (header of `convex/records.ts`). There is no owner field. `useCurrentUser` returns a placeholder user called "Alex Morgan". `convexProvider.ts` imports `convex/_generated/api` by relative path, and `convex/` tests import `src/`.

### 1.6 Relay [F]

- **Shared contract.** The relay and the browser client share zod schemas in `src/core/relay/relayContract.ts`. The relay imports `../../src/core/**` by relative path: `relayContract`, `AppError`, `DataFrame`, `columnsToFrame`, `maxRows`, `dataFrameSchema` and `mongoOperators`. `relay/Dockerfile` must be built from the repo root and `COPY src/core`.
- **Credentials.** The browser sends the DB connection string in every request body, plus a shared bearer `RELAY_TOKEN` if one is set.
- **Controls in `relay/src/app.ts`, `env.ts` and `hosts.ts`:**
  - an origin allow-list;
  - loopback-only when there is no token, and a refusal to start on a non-loopback host without one;
  - a token of at least 32 characters, compared in constant time;
  - a 256 KB body limit, a row cap and timeouts;
  - an SSRF host allow-list;
  - Mongo restricted to read-only `aggregate` with an operator deny-list;
  - SQL Server limited to auth types that carry credentials in the string;
  - error and log scrubbing.
- **`isLoopback` is implemented twice:** in `relay/src/env.ts:23`, which accepts `localhost`, `::1`, `[::1]` and `127.x`, and in `src/plugins/optional/relay/relayFields.ts:9`, which accepts `localhost`, `[::1]` and `127.x`. `relay/src/app.ts:82` imports the relay copy. The difference is harmless, because `URL.hostname` yields `[::1]`.
- **Same names, different meanings:** `SqlServerQuery` and `MongoQuery` are exported both as `z.input` (contract) and `z.output` (relay modules).
- **Scrubbing** (`relay/src/hosts.ts:35`). It replaces the full connection string and each secret extracted from it, then masks the mongodb URI userinfo and `password=` / `pwd=` values.
- **Correction to the tooling explorer:** `relay/.env.example` exists and lists 7 `RELAY_*` lines. The root `.env.example` has none.
- **Not built in CI:** neither the relay bundle nor its Docker image. The relay tests (5 files) run in `check:unit` against fakes.

### 1.7 Tooling and tests [F]

- **Tasks.** The `check:*` tasks are defined in `vite.config.ts` under `run.tasks`. `package.json` scripts delegate to them. `typecheck` is an alias of `check:lint`; type checking is tsgolint inside oxlint.
- **Vitest projects:** `node` (an explicit glob list, `NODE_TESTS`), `dom` (jsdom, everything else), `convex` (edge-runtime) and `storybook` (Playwright Chromium).
- **Test files:**

  | Kind                     | Files |
  | ------------------------ | ----- |
  | `src/**/*.test.ts`       | 63    |
  | `src/**/*.test.tsx`      | 18    |
  | `src/**/*.stories.tsx`   | 20    |
  | `relay/src`              | 5     |
  | `convex`                 | 1     |
  | `lint/*.test.ts`         | 4     |
  | `plugins.config.test.ts` | 1     |

  qartez counts 95 test files.

- **`lint/` tests:**
  - `rules.test.ts` spawns stylelint and `vp lint --no-ignore` over fixtures and asserts exact violation counts per file, with 20 s timeouts.
  - `compiler.test.ts` compiles **every** `src` file with `oxc-transform-react` and asserts the exact skip list, which hardcodes `src/plugins/widgets/table/FrameTable.tsx`.
  - `docs.test.ts` checks every relative markdown link.
  - `toolchain.test.ts` asserts the versions in `node_modules` against what vite-plus bundles.
  - The last two test docs and installed packages, not product behaviour.
- **CI.**
  - `ci.yaml` (PRs and pushes to `main`) runs lint plus types, stylelint, format, `check:unit` (node plus dom, which includes the `lint/` and relay tests) and build. It does **not** run the storybook tests, the convex tests, or the relay build.
  - `github-pages.yaml` runs `vp check --no-fmt` and `vp build` again on `main`. It is not gated on CI and runs no tests.
- **Pre-commit.** `.vite-hooks/pre-commit` runs `vp staged || echo …`. It formats only and never blocks.
- **Renovate.** `allowedVersions: '~0.152.0'` for `oxc-transform-react` conflicts with the `0.156.0` pin (package.json) and the `<0.157` limit in the `pnpm-workspace.yaml` comment.
- **Config that depends on current paths** (each must change in the same commit as a move):
  - `oxlint.config.ts`: `layer()` calls, `barrels`, path overrides such as `src/features/dashboards/data/dashboardQueries.ts` and `src/features/integrations/**`.
  - `lint/fixtures/src/<layer>` and `lint/rules.test.ts` counts.
  - `lint/compiler.test.ts`.
  - The `vitest.config.ts` `NODE_TESTS` globs. A moved pure test silently switches to jsdom.
  - `vite.config.ts` `routesDirectory` and `generatedRouteTree`.
  - `.stylelintrc.json` overrides and the `check:css` glob.
  - `tsconfig.app.json` `@/*`.
  - The `.storybook/main.ts` stories glob.
  - The relay's `../../src/core` imports and the Dockerfile.
  - The CI `dist/` paths.

**Dependencies:**

- `react-force-graph-2d` has **no importer**.
- Two chart stacks ship: `echarts` (`chartWidget`) and `@mantine/charts`, which uses `recharts` as its peer (`rechartsChartWidget`).
- `immer` is used only through `zustand/middleware/immer`.
- `@edge-runtime/vm` is used through the vitest `edge-runtime` environment.
- `@tanstack/intent` is a CLI.

### 1.8 Code health (qartez) [F]

- **No unhealthy files** by `qartez_health`'s defaults (health ≤ 5, CC ≥ 15 and ≥ 50 lines, ≥ 5 params).
- **Hotspots** (complexity × coupling × churn):

  | File                                       | Max CC | Churn |
  | ------------------------------------------ | ------ | ----- |
  | `features/dashboards/data/dashboardApi.ts` | 10     | 5     |
  | `features/dashboards/DashboardPage.tsx`    | 30     | 15    |
  | `grid/WidgetTile.tsx`                      | 14     | 13    |
  | `ui/tokens/semantic.ts`                    | —      | —     |
  | `data/drafts.ts`                           | —      | —     |

  `core/data/columnsToFrame.ts` has a max CC of 25.

- **Clones:** 6 small groups. #4 is `activeRecordProvider` with `placeSetting`; #6 is two identical page CSS modules.
- **Unused exports:** 182. Almost all are story exports, lazily routed page components and `.d.ts` items, which are false positives for a file-routed and lazy-loaded app. Real orphans are covered in §1.5 and §1.4.
- **Production import graph:**
  - Zero layer violations; `import/no-cycle` is on.
  - No feature-to-feature imports.
  - `ui/` and `shell/` (outside stories and tests) import nothing upward.

### 1.9 Git archaeology [F]

- **History.** There are 255 commits from 2026-09-22 (`init: scaffold and appshell`) to 2026-11-21. 79 of them landed in 2026-11-16..21.
- **The layout has been reorganised several times.** Rename counts from `git log --diff-filter=R`:

  | Move                            | Renames |
  | ------------------------------- | ------- |
  | `features → components/layouts` | 34      |
  | `components/layouts → (root)`   | 21      |
  | `components → (root)`           | 16      |
  | `features → plugins`            | 11      |
  | `design-system → ui`            | 9       |
  | `integrations → lib`            | 8       |
  | `→ app`                         | 13      |

  A `feat: move files for review` was reverted (`4d04c66`). The structure has been re-decided repeatedly, and there is no current written rationale (G-003).

- **Highest churn:** `oxlint.config.ts` (21), `vite.config.ts` (19), and the dashboards grid, page and route files. Tooling config churns more than any product file.
- **`TODO`, `FIXME` and `HACK`:** none in `src`, `relay/src`, `convex` or `lint`. Several comments cite "plan 11" or plans pinned to commits (`plugins.config.ts`, `OptionalPlugin.ts`, `relayContract.ts`, `relayFields.ts`, `lib/sentry/runtime.ts`).
- **Decisions frozen in code with no current record:** the archive commit `5798337` moved `docs/target` into `docs/archive/target`. These are:
  - the layer order;
  - build-time optional plugins;
  - one record-storage path for dashboards;
  - the relay as a separate service;
  - Vite+ as the toolchain;
  - localStorage for everything local;
  - no auth.

  12 markdown links outside `docs/archive` still point at `docs/target/` (`README.md`, `docs/STATUS.md`, `docs/current-state.md`).

### 1.10 Baseline checks [F]

| Check               | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vp run check:lint` | 0 warnings, 0 errors. On a **cold cache** it took **164 s** of lint (3 min 23 s wall) on 416 files with 165 rules, type-aware. There was a cache miss because `'ecc' added in 'docs'`: **adding a docs folder invalidated the lint cache.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `vp run check:unit` | **Red.** 2 of 94 test files fail (2 of 542 tests; 537 pass, 3 skipped). One is `lint/docs.test.ts`. Its broken links include `docs/archive/_EXTRA/**` (paths into `src/ui/components/Panels/SidePanelSplit.tsx`, which no longer exists, and missing scripts and screenshots) and `docs/archive/target/architecture.md → ../current-state.md`. In other words, archiving the docs broke the doc-link test. The other is `plugins.config.test.ts` › "imports only the listed plugins…". It expects the POSIX path `/repo/plugins/beta/betaPlugin.ts`, but Windows resolves it to `C:/repo/…`. **The test fails on Windows and passes on Linux CI**, which matters because the user works on Windows. It took **269 s** of test time (4 min 59 s wall). The time split was import 49 %, environment 30 %, setup 14 %, and **tests 5 %**. jsdom was created 52 times, costing 494 s of tracked time. |

### 1.11 Prior audit (`docs/review/architecture-audit.md`) — checked

| Claim                                                                                                                                                                                                                                                                                                                                             | Holds?                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Clean layer graph, two unrelated extension mechanisms, contracts mixed with implementations, platform services in `lib/`, module singletons with import-time side effects, relay depends on `src/core` by path, flat `app/`, three names for storage, speculative scaffolding, hardcoded app identity, tooling keyed to paths (its P1–P9 and P11) | **Confirmed.**                                                                                                                             |
| P10: baseline not green because of dead `docs/target` links                                                                                                                                                                                                                                                                                       | **Confirmed.** `lint/docs.test.ts` fails (§1.10). The broken links are mostly inside `docs/archive/`, not just the 12 `docs/target` links. |
| "198 unreachable symbols, false positives"                                                                                                                                                                                                                                                                                                        | Now 182 unused exports, the same character.                                                                                                |
| `SentryVerificationCard.tsx` is a 504-line god component                                                                                                                                                                                                                                                                                          | Not re-measured.                                                                                                                           |
| Its recommendations (option B, package list)                                                                                                                                                                                                                                                                                                      | Not evaluated here: those are Phase 2/3 inputs.                                                                                            |

---

## 2. Gap register

Severity: `P0` security or data loss · `P1` correctness, or a risk to the restructure · `P2` practice or observability · `P3` selection and cleanup.
Effort: `S` under a session · `M` a few sessions · `L` its own plan.
Every row is `open`. "Fix direction" lists options for Phase 3, not decisions.

### Thinking (decided but never recorded, or never decided)

| ID    | Gap                                                                                                                                                                  | Evidence                                                                                                                                          | Fix direction (options)                                                                                | Sev                                    | Eff |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------- | --- |
| G-001 | One concept has three names: storage, place and record provider. `storage` is also used for 3 other things.                                                          | §1.3; `lib/records/placeSetting.ts`, `features/storage/StoragePlacePage.tsx`, `core/records/RecordProvider.ts`, `lib/storage.ts`                  | Glossary (`ecc:context-and-decisions`), then renames in the move stage                                 | P2                                     | M   |
| G-002 | "Plugin" means 5 things. `OptionalPlugin` can only carry datasource types.                                                                                           | `src/plugins/OptionalPlugin.ts:60,80`; `app/plugins.ts:14-15`                                                                                     | Define plugin / capability / provider / contribution vocabulary before moving `src/plugins`            | P1                                     | M   |
| G-003 | The layout has been re-decided at least 6 times, and the current decisions are only in archived docs and comments.                                                   | §1.9 rename history; `docs/archive/target/`; "plan 11" comments                                                                                   | ADRs in `docs/ecc/work/03-decisions/` for layer order, plugin model, storage path, relay, toolchain    | P1                                     | S   |
| G-004 | Identity, multi-user scope and auth are undecided. Convex functions are public, and the user is a placeholder.                                                       | `convex/records.ts` header; `lib/useCurrentUser.ts` (`placeholderUser`); no owner field in `convex/schema.ts`                                     | Decide single-user vs multi-user and the auth capability before contracts are generalised (D4)         | P0 if Convex is deployed; P1 otherwise | M   |
| G-005 | The credential model is implicit: the browser holds DB connection strings and sends them on every relay call, with one shared bearer token.                          | `src/plugins/optional/relay/relayClient.ts`; `relay/src/app.ts`; `relayFields.ts`                                                                 | Decide whether credentials stay in the browser vault or move server-side; shapes any backend work (D4) | P1                                     | M   |
| G-006 | Only record storage is a selectable capability. Search, auth and others named in D3 have no concept or extension point.                                              | §1.4 table; no search code in `src` (`apps/docs/catalog/catalog.yaml` only)                                                                       | Decide which capabilities exist now and which are deferred                                             | P2                                     | M   |
| G-007 | It is undecided which data belongs to records and which stays local. Drafts, connections and vault entries bypass the provider and are not transferred with records. | `features/dashboards/data/drafts.ts`; `createConnectionsStore.ts`; `lib/vault/createVaultStore.ts`; `app/storageCollections.ts` (dashboards only) | Decide per data kind                                                                                   | P2                                     | S   |

### Coding practice

| ID    | Gap                                                                                                                                                                                                                          | Evidence                                                                                                                                                              | Fix direction (options)                                                                              | Sev | Eff |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --- | --- |
| G-008 | `app/` is flat and mixes 4 jobs. Dashboards-domain logic lives in `app/` and in a route file.                                                                                                                                | `app/recordSync.ts`, `app/storageCollections.ts`, `app/routes/dashboards/$id.tsx` (72 lines, `DashboardRouteData`)                                                    | Group `app/` by job; move domain glue to its feature                                                 | P3  | S   |
| G-009 | Contracts and implementations share `src/plugins`. App composition depends on a feature's store. Features import a non-contract plugin file.                                                                                 | `app/PluginsProvider.tsx` → `features/datasources/connections/useConnections`; `useConnectionForm.ts:12`, `useConnectionStatus.ts:2` → `plugins/connectionDatasource` | Separate the platform API from implementations                                                       | P2  | M   |
| G-010 | Platform runtime sits in `lib/` as module-global mutable state with duplicated store code.                                                                                                                                   | `lib/records/activeRecordProvider.ts` (`entries`, `loading`, `lastPlace`); clone #4 with `placeSetting.ts`                                                            | Instance-scoped registry; matters more if D1 holds (two apps, or tests with different provider sets) | P2  | M   |
| G-011 | Import-time side effects.                                                                                                                                                                                                    | `app/plugins.ts` (`configureRecordProviders`); `lib/storage.ts:52` (`migrateLegacyKeys`)                                                                              | Explicit bootstrap step                                                                              | P2  | S   |
| G-012 | The relay depends on the app's source tree by relative path, and the Dockerfile copies `src/core`.                                                                                                                           | `relay/src/{app,env,hosts,mongo,Driver}.ts` → `../../src/core/**`; `relay/Dockerfile`                                                                                 | Shared contract as a workspace package                                                               | P2  | M   |
| G-013 | Feature internals differ: concern subfolders, flat, or half-flat.                                                                                                                                                            | §1.3 table                                                                                                                                                            | One convention; apply in the move stage                                                              | P3  | M   |
| G-014 | `isLoopback` is implemented twice: once in the browser and once in the relay.                                                                                                                                                | `relay/src/env.ts:23`, `src/plugins/optional/relay/relayFields.ts:9`                                                                                                  | Single shared helper, with G-012                                                                     | P3  | S   |
| G-015 | `SqlServerQuery` and `MongoQuery` are each exported under the same name with different meanings (`z.input` and `z.output`).                                                                                                  | `src/core/relay/relayContract.ts`; `relay/src/sqlServer.ts`, `relay/src/mongo.ts`                                                                                     | Rename one side                                                                                      | P3  | S   |
| G-016 | `dashboardApi.ts` mixes seed fetching (with fake latency), record overlay, save and legacy migration. `DashboardPage.tsx` has CC 30.                                                                                         | qartez hotspots #1 and #2                                                                                                                                             | Split by job when the feature is moved                                                               | P3  | M   |
| G-017 | Legacy migration code is dated for deletion and duplicated in three places.                                                                                                                                                  | `lib/storage.ts:49-52` ("delete after 2027-01"); `dashboardApi.ts`; `drafts.ts`                                                                                       | Remove or consolidate in the simplification stage                                                    | P3  | S   |
| G-018 | App identity is hardcoded in places a second app would reuse.                                                                                                                                                                | `shell/sidebar/Brand.tsx` `APP_NAME`; `lib/storage.ts` `dashboard-builder:` prefix; `app/nav.ts` sample ids; Vite `base`                                              | Inject per app if D1 holds; otherwise low value                                                      | P2  | M   |
| G-019 | Tooling config is keyed to folder paths. Moving files can silently change the test environment or the lint scope.                                                                                                            | §1.7 list; `vitest.config.ts` `NODE_TESTS`; `oxlint.config.ts` `layer()`; `lint/compiler.test.ts`                                                                     | Move config with code in the same commit; prefer convention-based globs                              | P1  | M   |
| G-020 | Checks are slow. Cold lint takes 164 s. The unit run takes 269 s, of which only 5 % is tests: the rest is import, environment and setup, with 52 jsdom environments. The lint cache is invalidated by changes under `docs/`. | §1.10: 164 s lint; cache miss `'ecc' added in 'docs'`                                                                                                                 | Narrow the task inputs; revisit type-aware scope (U7, U9)                                            | P2  | S   |
| G-021 | `src/core` holds things that are not domain.                                                                                                                                                                                 | `core/build/*` (tooling), `core/relay/*` (one integration's wire contract)                                                                                            | Relocate with G-012                                                                                  | P3  | S   |

### Missing features (what a day-one build would have)

| ID    | Gap                                                                                                                                                                                                                          | Evidence                                                                                                                                  | Fix direction (options)                                          | Sev | Eff |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --- | --- |
| G-022 | `/debug` is routed and has no gate in production, though its comments say it is dev-only.                                                                                                                                    | `app/routes/debug.tsx`; `features/debug/DebugPage.tsx`. No `import.meta.env` check is in either file, `app/router.ts` or `vite.config.ts` | Gate it or drop it                                               | P2  | S   |
| G-023 | The provider contract cannot express structured config or secrets, auth or session, or which list operations it can do on the server.                                                                                        | `RecordProviderSetup` (single string); `place-settings` `Record<string,string>`; `runListQuery` over a full read; `MAX_RECORDS` ×2        | Needed before any second record backend; more urgent if D4 holds | P2  | L   |
| G-024 | Record subscriptions exist in the contract but are not wired into the app.                                                                                                                                                   | `lib/records/watchRecords.ts`, `core/records/recordKeys.ts`: no production importer                                                       | Wire it, or remove it until needed                               | P3  | S   |
| G-025 | CI gaps: the storybook tests, the convex tests and the relay build or image do not run. The Pages deploy is not gated on CI and repeats its checks.                                                                          | `.github/workflows/ci.yaml`, `github-pages.yaml`                                                                                          | Decide in the CI stage (U10)                                     | P2  | S   |
| G-026 | The pre-commit hook never blocks.                                                                                                                                                                                            | `.vite-hooks/pre-commit` (`vp staged \|\| echo`)                                                                                          | Decide with the tooling stage                                    | P3  | S   |
| G-027 | Relay scrubbing is pattern-based. It masks the known connection string and its extracted secrets, the mongodb userinfo, and `password=`/`pwd=`. A driver message that echoes a credential in another form would get through. | `relay/src/hosts.ts:35-55`                                                                                                                | Review with G-005; low priority                                  | P3  | S   |

### Technology selection

| ID    | Gap                                                                                                                                                                                                                                                   | Evidence                                                                                                                                                                                                                                                    | Fix direction (options)                                                             | Sev | Eff |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --- | --- |
| G-028 | Two chart stacks ship as two widget types.                                                                                                                                                                                                            | `plugins/widgets/chart/chartWidget.tsx` (echarts), `rechartsChartWidget.tsx` (`@mantine/charts` + `recharts`)                                                                                                                                               | Pick one, or keep both as a deliberate example of a replaceable implementation (D3) | P3  | M   |
| G-029 | A dependency has no importer.                                                                                                                                                                                                                         | `react-force-graph-2d` in `package.json`; 0 importers                                                                                                                                                                                                       | Remove (simplification stage)                                                       | P3  | S   |
| G-030 | The live-site "add to build" feature is a lot of machinery for 4 datasource bundles that nobody has listed. It uses a browser PAT, a commit to `main`, 20-minute polling, and a Vite virtual module with a dev HTTP endpoint inside the build config. | §1.4; `plugins.json` is empty; `features/datasources/buildList/*`; `plugins.config.ts`                                                                                                                                                                      | Keep, simplify (static list, or runtime enable only), or drop. A user decision.     | P2  | M   |
| G-031 | Speculative scaffolding with no consumer.                                                                                                                                                                                                             | `ActionPlugin`, `ContextPanelPlugin`, empty registries; `CollectionDefinition` and `DEFINITIONS_COLLECTION`; `WidgetPlugin.optionsEditor` (no implementer); `features/node-studio/` (only `AGENTS.md`); `explore` and `templates` placeholder routes in nav | Delete, or keep with a stated reason                                                | P3  | S   |
| G-032 | Some tests are slow, and some test docs and installed packages rather than behaviour. `docs.test.ts` is currently red only because docs were archived.                                                                                                | `lint/rules.test.ts` (spawns oxlint and stylelint, 20 s timeouts); `lint/compiler.test.ts` (compiles all of `src`); `lint/docs.test.ts`; `lint/toolchain.test.ts`                                                                                           | Cut or move to an optional script (U8, U9)                                          | P2  | S   |
| G-033 | `apps/docs` is not an app.                                                                                                                                                                                                                            | No `package.json`, not in the workspace; its README says a docs site "comes later"                                                                                                                                                                          | Move to `docs/` or delete                                                           | P3  | S   |
| G-034 | A stale Renovate constraint.                                                                                                                                                                                                                          | `.github/renovate.json5` `~0.152.0` vs the `0.156.0` pin                                                                                                                                                                                                    | Fix in the tooling stage                                                            | P3  | S   |
| G-035 | The doc tree points at archived targets: 12 dead `docs/target/` links, plus `STATUS.md` and `current-state.md` described as authoritative.                                                                                                            | §1.9; `README.md`, `docs/STATUS.md`, `docs/current-state.md`                                                                                                                                                                                                | Must be resolved before the first move so verification is unambiguous               | P1  | S   |

Additional row found during the baseline run:

| ID    | Gap                                                                                                                       | Evidence                           | Fix direction (options)                                     | Sev | Eff |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- | --- | --- |
| G-036 | `plugins.config.test.ts` asserts POSIX paths, so it fails on Windows and the local baseline is red on the developer's OS. | `plugins.config.test.ts:74`; §1.10 | Make the path assertion OS-neutral, or run it on Linux only | P1  | S   |

### Strengths to preserve (not gaps)

- A clean, lint-enforced import graph: zero layer violations, no cycles, no feature-to-feature imports. Keep the mechanism and re-key the paths.
- The `RecordProvider` contract, with result unions, revisions, capabilities and a shared conformance suite. It is the most reusable design in the repo.
- Lazy runtimes behind light definitions, and `toRegistry` duplicate-id checks.
- The zod wire contract shared between the browser and the relay, and the relay's security controls (§1.6).
- Low clone count and no unhealthy files; complexity is concentrated in dashboards.
- Supply-chain settings in `pnpm-workspace.yaml` (release-age quarantine, `allowBuilds`, strict peers).

---

## 3. Open questions (Phase 2 or 3 input)

1. **[?] Second app.** Is there a concrete second application in view? It decides whether `shell`, `ui` and dashboards are extracted now or later (D1). It also decides whether G-018 matters now.
2. **[?] Multi-user.** Is the target multi-user with auth, or single-user per browser with an optional shared backend? (G-004, G-023)
3. **[?] Credentials.** Should database credentials stay in the browser vault, or live server-side in the relay or backend? (G-005)
4. **[?] Capabilities.** Which capabilities are real for the first restructure: records only, or records, search and auth? (G-006, D3)
5. **[?] Add to build.** Is the live-site "add to build" flow a requirement? (G-030)
6. **[?] Local data.** Should drafts, connections and vault entries become records, or stay local by design? (G-007)
7. **[?] Charts.** Should both chart widgets stay? (G-028)
8. **[?] Scaffolding.** Should node-studio, `explore`, `templates`, Action and ContextPanel stay as stated future work, or be deleted? (G-031)
9. **[?] Relay.** Should the relay stay in this repo as a workspace app? Is its Docker image deployed anywhere? (G-012, G-025)
10. **[?] `/debug`.** Should `/debug` ship to production? (G-022)
11. **[?] Folder convention.** Which convention should features use: concern subfolders (as dashboards has today) or file-kind subfolders (`components/`, `hooks/`) per D6? Phase 2 research topic.
12. **[?] Task runner.** Which task runner should sit alongside Vite+, and should lint stay type-aware on every run? (G-020, U7, U9; Phase 2 research.)

### 3.1 Answers so far (user, 2026-11-21)

| Q   | Answer                                                                                                                                        | Effect                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No** second app in view. Structure the repo monorepo-style anyway (`apps/`, `packages/`), as if packages were real. They are not published. | D1 stays the direction. Package boundaries are for structure and enforcement, not for distribution. G-018 is lower priority.                                                                                          |
| 2   | **Multi-user**, with **no live interaction** needed.                                                                                          | Auth and per-user scoping are needed (G-004 stays P0 for any deployed backend). Subscriptions are not needed: G-024 leans toward removal.                                                                             |
| 3   | Credentials **probably stay in the browser**.                                                                                                 | The current vault and relay model is kept as the direction. G-005 becomes "document and harden", not "move server-side".                                                                                              |
| 5   | Answered by the ChatGPT conversation: several implementations available **at build time**, with the one in use chosen **at runtime**.         | Build-time inclusion plus runtime selection is the model for every capability. The conversation does not cover the live-site GitHub-commit flow (G-030), so its keep, simplify or drop choice stays open for Phase 3. |

Q4 and Q6–Q12 are still open.

**Structure research guidance (user):** do not use Mantine as a reference for app structure. Look at TanStack Start (even if unused), Nx and Turborepo conventions.
