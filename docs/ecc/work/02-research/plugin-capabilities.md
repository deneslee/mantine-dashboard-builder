# 02 — Research: plugin, capability and backend-provider model

Phase 2 research for the architecture review. Branch `review`, 2026-11-21. No source file was changed.

Labels follow 01: `[F]` observed fact (code or primary source), `[U]` user decision, `[R]` recommendation, `[?]` open question.
Confidence on external findings: **H** means read on the primary page this session. **M** means from the docs but not re-read in full, or inferred. **L** means recollection only.

---

## 1. Question and scope

How should this repo model:

- **Core**: what always exists.
- **Replaceable capabilities**: one contract with several implementations. Each implementation is included at build time, and one is chosen at runtime.
- **Plugins**: internal folders that add capabilities or contributions.

The model must stay simple at this scale: one app, internal folders only.

**User decisions that bound the answer [U]:**

- Plugins are internal folders, not packages (D2).
- Several implementations of a capability are included **at build time**, and the one in use is chosen **at runtime**. Examples: search through Meilisearch or Elasticsearch; records in browser storage, Convex, or a future REST or Supabase backend (D3, Q5).
- The backend is multi-user, with no live collaboration (Q2).
- DB credentials stay in the browser vault (Q3).
- There is no second app now (Q1).
- Avoid overengineering.

**In scope:**

- `src/plugins/**`, `src/lib/records/**`, `src/core/records/**`
- `src/app/plugins.ts`, `src/app/recordProviders.ts`
- `plugins.config.ts`
- the build-list feature that G-030 concerns

**Out of scope:** folder layout (a separate topic), the relay's internals, and CI.

---

## 2. Findings

### 2.1 Current code [F]

These facts were re-checked this session. They add detail to 01 §1.4 and §1.5.

| #    | Fact                                                                                                                                                                                                                                                                                                                                                                                                                                                | Evidence                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| F-1  | `Plugins` is one object with 7 keys: `widgets`, `datasources`, `types`, `recordProviders`, `panels`, `actions`, `build`. There are 6 registries plus build metadata. Each registry is a `Record<string, T>` built by `toRegistry`, which throws on a duplicate id.                                                                                                                                                                                  | `src/plugins/usePlugins.ts:20-56`                                                                                   |
| F-2  | Nothing defines a plugin as a unit. `OptionalPlugin` is `{ id, types }`: a datasource-type bundle. Widgets, datasources and record providers are listed one by one in `app/`.                                                                                                                                                                                                                                                                       | `src/plugins/OptionalPlugin.ts:80-83`; `src/app/plugins.ts:30-41`                                                   |
| F-3  | `ActionPlugin` (20 lines) and `ContextPanelPlugin` (16 lines) have 0 implementations. Their registries are built from `[]`. Production code reads neither `panels` nor `actions`; they appear only in test fixtures and `Devtools.tsx`.                                                                                                                                                                                                             | `src/plugins/ActionPlugin.ts`, `ContextPanelPlugin.ts`; `app/plugins.ts:14-15`; grep of `panels`/`actions` in `src` |
| F-4  | The record provider list is code. `createRecordProviders()` returns `[browser, convex]`. The active id is a per-browser localStorage value (`record-provider` `{version:1,id}`). An unknown id silently falls back to `browser`, with only `isFallback` set.                                                                                                                                                                                        | `src/app/recordProviders.ts:26`; `src/lib/records/activeRecordProvider.ts:22-56`                                    |
| F-5  | The active-provider runtime is module-global (`entries`, `loading`, `listeners`, `lastPlace`). It is configured by an import-time side effect in `app/plugins.ts:19`.                                                                                                                                                                                                                                                                               | `activeRecordProvider.ts:24-32`; G-010, G-011                                                                       |
| F-6  | The module-global runtime has callers outside React: route loaders (`app/routes/dashboards/index.tsx:8`, `$id.tsx:35,40`), `app/recordSync.ts:20`, and `features/dashboards/data/dashboardApi.ts:60,185,289`. The loaders already receive `context.queryClient` through TanStack Router context.                                                                                                                                                    | grep of `getActivePlace`, `loadRecordProvider`, `onActivePlaceChange`                                               |
| F-7  | The Convex deployment URL is a **per-browser** setting (`place-settings`), else `VITE_CONVEX_URL`. The provider lists itself with the note "No sign-in yet: anyone with the deployment URL can read and write."                                                                                                                                                                                                                                     | `app/recordProviders.ts:21-23`; `convexRecordProviderPlugin.ts:34`                                                  |
| F-8  | The Convex provider uses `ConvexClient` from `convex/browser`, loaded lazily. It relies on `onUpdate` and `subscribeToConnectionState`. The schema has no owner field, and the functions check no auth.                                                                                                                                                                                                                                             | `convexProvider.ts:33-49`; `convexRecordProviderPlugin.ts:18-25`; `convex/schema.ts`; `convex/records.ts:5-9`       |
| F-9  | The `RecordProvider` contract has no session concept and no failure reason for "not signed in" or "not allowed". `RecordProviderStatus.state` has no signed-out state. `RecordProviderSetup` is a single string.                                                                                                                                                                                                                                    | `src/core/records/RecordProvider.ts:79-88,191-195`; `RecordProviderPlugin.ts:4-12`; G-023                           |
| F-10 | `subscribe` is part of the contract, and the conformance suite tests it (`recordProviderSuite.ts:374-404`). The app never calls it (G-024).                                                                                                                                                                                                                                                                                                         | `RecordProvider.ts:173`; `src/testing/recordProviderSuite.ts`                                                       |
| F-11 | Datasource types are **already runtime-selected**: a type does nothing until the user creates a connection of it (Grafana's plugin-vs-instance split, §2.2). The build list only decides which types _exist_.                                                                                                                                                                                                                                       | `PluginsProvider.tsx` + `withConnections`; `OptionalPlugin.ts:1-11`                                                 |
| F-12 | Every optional-plugin definition already keeps heavy code behind `load: () => import(...)`. The eager part is the schemas, form fields, icons and the example query.                                                                                                                                                                                                                                                                                | `src/plugins/optional/*/*Plugin.ts` (`load:` lines 53, 78, 105, 137, 148, 184, 223, 241)                            |
| F-13 | The build-list machinery is: `features/datasources/buildList/*` (7 files, 964 lines incl. tests and stories); `plugins.config.ts` (227 lines: the `OPTIONAL_PLUGINS` string-path table, a virtual module, the `POST /__plugins` dev endpoint, a file watcher, the `build-info.json` asset); `core/build/*`; `plugins.json`; `includeAll` hooks in `.storybook/main.ts:22` and `vitest.config.ts:25`; `plugins.config.test.ts` (the G-036 red test). | `wc -l`; §1.4 of 01                                                                                                 |

**Bundle measurement [F].** I ran two production builds of the real app (`src/main.tsx`) into the scratchpad:

- one with all four optional plugins in the virtual module;
- one with none.

Both builds used plain `@vitejs/plugin-react`, without the React Compiler, the TanStack router auto-split or the repo's `manualChunks`. Absolute numbers therefore differ from `vp build`. The **delta** is the useful part.

| Build                                        | Initial JS (entry + modulepreload) |                 gzip |            All JS (incl. lazy) |                   gzip | JS files |
| -------------------------------------------- | ---------------------------------: | -------------------: | -----------------------------: | ---------------------: | -------: |
| No optional plugins (today's `plugins.json`) |                        1,215,756 B |            377,727 B |                    2,657,096 B |              831,076 B |       51 |
| All 4 optional plugins                       |                        1,231,885 B |            383,821 B |                    2,922,515 B |              923,144 B |       71 |
| **Delta**                                    |              **+16.1 kB (+1.3 %)** | **+6.1 kB (+1.6 %)** | +265 kB (≈ +249 kB of it lazy) | +92 kB (≈ +86 kB lazy) |      +20 |

- `@aws-sdk/*` lands only in the lazy runtime chunks (`athenaRuntime-*`, `auroraRuntime-*`, …), never in the entry.
- A lib-mode build of the definitions alone, with zod, icons and the SDK excluded, gives about 15.9 kB minified and about 6.9 kB gzip. That agrees with the delta above.
- The runtimes load only when a connection of that type is queried or tested.

### 2.2 External systems

| #    | System and pattern                                                                                                                                                                                                                                                                                                                                                                                                    | Relevance here                                                                                                                                                                                                   | Source / confidence                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-1  | **VS Code: contribution points vs extension API.** `contributes` is static JSON in the manifest (commands, menus, views, `authentication`, `configuration` …). Code activates lazily on _activation events_. Since 1.74, contributed commands and languages imply their own activation.                                                                                                                               | The same split as here: eager metadata (`WidgetMeta`, `DatasourceType` fields, `RecordProviderPlugin.capabilities`) plus lazy `load`. Validates what exists; adds nothing new.                                   | https://code.visualstudio.com/api/references/contribution-points (H); https://code.visualstudio.com/api/references/activation-events (H)                                                                                    |
| X-2  | **VS Code `authentication` API.** `authentication.getSession(providerId, scopes, options)` returns a session from a named provider. Providers are contributed by extensions (`github`, `microsoft`). `onDidChangeSessions` fires on change.                                                                                                                                                                           | The decoupled model: auth is its own capability, and consumers ask by provider id. Pays off when one identity provider serves several backends or APIs.                                                          | https://code.visualstudio.com/api/references/vscode-api#authentication (H)                                                                                                                                                  |
| X-3  | **Backstage utility APIs.** A TypeScript interface plus an `ApiRef` (`createApiRef<WorkApi>({ id })`). Implementations are `ApiBlueprint` extensions with a `factory` and `deps`. The app can **override** an API, and the override wins for every consumer. APIs can be lazy.                                                                                                                                        | This is "replaceable capability = port + ref + factory". The relevant part is _one ref per capability, a factory with deps, app-level override_. The extension tree around it is not relevant.                   | https://backstage.io/docs/frontend-system/architecture/utility-apis/ (H); https://backstage.io/docs/frontend-system/utility-apis/creating/ (H)                                                                              |
| X-4  | **Backstage extensions and config.** The app is a tree of extensions with ids, inputs, outputs and attachment points. Each one can be `disabled` (also by default) or enabled by `if` predicates, and is **configured statically in `app.extensions`** (`- <id>: false`, env-substituted).                                                                                                                            | "Install several, enable one per environment" is the user's build-time-include + runtime-select model, done through **deployment config**. The attachment-tree machinery is overkill for one app.                | https://backstage.io/docs/frontend-system/architecture/extensions/ (H); https://backstage.io/docs/frontend-system/building-apps/configuring-extensions/ (H)                                                                 |
| X-5  | **Grafana plugin types.** There are three: _panel_ (visualisation), _data source_, and _app_ (bundles panels, data sources and pages). A data-source **plugin** is installed once. Users create **zero to many data-source instances** (configured, persisted). App plugins are enabled once per organisation.                                                                                                        | Maps one to one: widget = panel, `DatasourceType` = data-source plugin, `Connection` = instance, and a future "plugin" object = app plugin. Validates the existing type/instance split (F-11); no new mechanism. | https://grafana.com/developers/plugin-tools/key-concepts/plugin-types-usage (H)                                                                                                                                             |
| X-6  | **Payload adapters.** The database (`db: mongooseAdapter(...)` / Postgres / SQLite), email (`email: nodemailerAdapter(...)` / Resend) and storage adapters (S3, Azure, GCS …) are each **one config slot** set in `buildConfig`. Storage plugins take `enabled: Boolean(process.env.X)` so an adapter can be switched off per environment. With no email adapter, Payload logs a warning on startup and on each send. | Strongest analogue for "records via browser or Convex or REST": one typed slot per capability, chosen in **app config**, and a defined behaviour when absent (warn, don't crash).                                | https://payloadcms.com/docs/database/overview (H); https://payloadcms.com/docs/email/overview (H); https://payloadcms.com/docs/upload/storage-adapters (H)                                                                  |
| X-7  | **Strapi providers.** Upload and email are _features_ whose backends are _providers_, configured in `config/plugins.ts` as `provider: 'sendgrid'` + `providerOptions`, with per-environment overrides in `config/env/<env>/plugins.ts`. Plugins can be `enabled: false`.                                                                                                                                              | The same as X-6: provider chosen by id in config, options alongside, environment override. It also confirms that "feature (core) vs provider (replaceable)" is a common vocabulary (G-002).                      | https://docs.strapi.io/cms/features/email (M, search extract); https://docs.strapi.io/cms/configurations/media-library-providers (M, search extract); https://docs.strapi.io/cms/configurations/plugins (M, search extract) |
| X-8  | **TanStack Query persisters.** The persister is passed in (`createSyncStoragePersister`, `createAsyncStoragePersister`, or a custom one) to `persistQueryClient`: plain dependency injection of a small interface, with no registry.                                                                                                                                                                                  | For a capability with **one** implementation in use per instance, passing the instance in is enough. A registry is needed only for runtime choice.                                                               | https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient (H)                                                                                                                                       |
| X-9  | **TanStack Router context.** The router context is documented as the place for dependency injection (`createRootRouteWithContext<Ctx>()`, `createRouter({ context })`). It is typed and available to `beforeLoad` and loaders.                                                                                                                                                                                        | The existing non-React callers (F-6) are route loaders that already read `context.queryClient`. An instance-scoped capability host fits there with no new mechanism (G-010).                                     | https://tanstack.com/router/latest/docs/framework/react/guide/router-context (H)                                                                                                                                            |
| X-10 | **Ports and adapters (hexagonal).** The application defines ports (interfaces) and adapters implement them; the core never imports an adapter. The ports are wired at the composition root.                                                                                                                                                                                                                           | `RecordProvider` is already a port with a conformance suite. The lint rule `lib ↛ plugins` (F-5's structural type) enforces it. What is missing is only an explicit composition root.                            | Cockburn, https://alistair.cockburn.us/hexagonal-architecture/ (M, not re-read)                                                                                                                                             |

### 2.3 Auth for a multi-user backend

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                            | Source / confidence                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | **Convex Auth scopes by user on the server.** `getAuthUserId(ctx)` in a query, mutation or action returns the user id, or `null` when the client is not authenticated. Functions throw or return empty on `null`.                                                                                                                                                                                                                                  | https://labs.convex.dev/auth/api_reference/server (H, Context7)                                                                                                                                                                       |
| A-2 | **Convex Auth's client is React-only.** It needs `ConvexReactClient` wrapped in `<ConvexAuthProvider client>`, which also handles the OAuth or magic-link `code` URL parameter (`replaceURL`, `shouldHandleCode`). The FAQ says client libraries exist only for React. Tokens (refresh + JWT) live in `localStorage` by default; a `storage` prop overrides this.                                                                                  | https://labs.convex.dev/auth/api_reference/react (H); https://labs.convex.dev/auth/faq (H); https://labs.convex.dev/auth/security (H)                                                                                                 |
| A-3 | **`ConvexReactClient` can stand in for `ConvexClient`.** It has `query`, `mutation`, `connectionState`, `subscribeToConnectionState`, and `watchQuery(...).onUpdate` in place of `onUpdate`. Switching clients for Convex Auth is feasible; only the subscribe path needs adapting, and G-024 may delete it.                                                                                                                                       | https://docs.convex.dev/api/classes/react.ConvexReactClient (H, Context7)                                                                                                                                                             |
| A-4 | **Any OIDC or custom JWT works with Convex.** `convex/auth.config.ts` accepts Convex Auth, OIDC issuers (Clerk, Auth0 …) and `type: "customJwt"` (issuer + JWKS, RS256 or ES256). The client attaches the token with `ConvexClient.setAuth(fetchToken)` (browser) or `ConvexReactClient.setAuth`. On the server, `ctx.auth.getUserIdentity()` returns a `UserIdentity` whose `tokenIdentifier` (`iss` + `sub`) is the stable, globally unique key. | https://docs.convex.dev/config/auth.config.ts (H); https://docs.convex.dev/auth/advanced/custom-jwt (H); https://docs.convex.dev/api/classes/browser.ConvexClient (H); https://docs.convex.dev/api/interfaces/server.UserIdentity (H) |
| A-5 | **Supabase Auth can issue asymmetric JWTs.** It supports ES256 and RS256 and publishes a JWKS at `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`. A Supabase-issued token can therefore be verified by another backend, Convex `customJwt` included. Third-party JWTs are passed to the Supabase client through its `accessToken` option.                                                                                            | https://supabase.com/docs/guides/auth/jwts (M, search extract); https://supabase.com/docs/guides/auth/signing-keys (M, search extract)                                                                                                |
| A-6 | **Supabase per-user scoping is Row Level Security.** Policies on `auth.uid()` restrict rows, so a Supabase records adapter would rely on policies, not on client-sent owner ids.                                                                                                                                                                                                                                                                   | Supabase RLS docs (M, not re-read this session)                                                                                                                                                                                       |
| A-7 | **A REST backend** would take `Authorization: Bearer <jwt>` from whichever identity provider is in use, and derive the owner on the server. This is the same shape as A-4 and A-5.                                                                                                                                                                                                                                                                 | Inference from A-4, A-5 (M)                                                                                                                                                                                                           |

**What this means for the contract [F + inference]:**

- In all three backends the **session lives in the backend's client or in an identity-provider client**.
- The **owner is derived on the server from the verified token**: `getAuthUserId`, `tokenIdentifier`, `auth.uid()`, or the REST server's JWT check.
- The browser never needs to send an owner id, and must not be trusted if it does.
- The contract therefore needs to know only:
  - whether there is a session;
  - how to start and end one;
  - how to report "not signed in" and "not allowed".

---

## 3. Options compared

Three designs follow. Each sketch is the whole public surface.

### Option A — one plugin object, per-kind registries, records host only

```ts
// platform/plugin.ts
interface PluginDefinition {
  id: string; // folder name, e.g. 'aws'
  widgets?: WidgetPlugin[];
  datasources?: DatasourcePlugin[]; // built-ins (mock, localJson)
  datasourceTypes?: DatasourceType[];
  recordProviders?: RecordProviderPlugin[];
  settingsPanels?: SettingsPanel[]; // only when a real one exists
}
const definePlugin = (p: PluginDefinition) => p;

// app/plugins.ts: the static build list (build-time inclusion)
export const PLUGINS = [
  coreWidgets,
  mock,
  localJson,
  aws,
  google,
  azureSql,
  mongodb,
  browserRecords,
  convexRecords,
];

// platform/createRegistries.ts: flattens into today's Plugins shape, toRegistry per kind
function createRegistries(plugins: PluginDefinition[]): Registries;

// platform/records/createRecordsHost.ts: instance, not module globals
interface RecordsHost {
  providers: Record<string, RecordProviderPlugin>;
  active(): ResolvedPlace; // config default + optional user override
  load(id?: string): Promise<RecordProvider>;
  select(id: string): Result;
  subscribe(listener: () => void): () => void;
}
function createRecordsHost(opts: {
  providers;
  defaultId: string;
  allowUserChoice: boolean;
  storage: Storage;
}): RecordsHost;
```

- **Selection.** Only the record backend is chosen at runtime. Datasource types stay runtime-selected per connection (F-11). Widgets are all active.
- **Wiring.** `createApp()` builds the registries and the records host once and passes the host into the router context and React context. No import side effects.
- **Size.** About 2 new small files. It deletes `ActionPlugin`, `ContextPanelPlugin`, `OptionalPlugin`'s wrapper role, `BuildPlugins`, and the build-list feature.

### Option B — capability refs plus a generic host (Backstage-lite)

```ts
// platform/capability.ts
interface CapabilityRef<T> {
  id: string;
  _t?: T;
} // like createApiRef
const capability = <T>(id: string): CapabilityRef<T> => ({ id });

interface Implementation<T> {
  capability: CapabilityRef<T>;
  id: string;
  name: string; // 'convex'
  meta?: Record<string, unknown>; // light, eager (capabilities, setup form)
  isConfigured?(): boolean;
  load(): Promise<T>; // lazy chunk
}

interface PluginDefinition {
  id: string;
  implementations?: Implementation<unknown>[];
  widgets?: WidgetPlugin[];
  datasourceTypes?: DatasourceType[]; // contributions stay typed lists
}

interface CapabilityHost {
  list<T>(ref: CapabilityRef<T>): Implementation<T>[];
  active<T>(ref: CapabilityRef<T>): Implementation<T>;
  get<T>(ref: CapabilityRef<T>): Promise<T>;
  select<T>(ref: CapabilityRef<T>, id: string): Result;
}
// app config: { capabilities: { records: { default: 'convex', userChoice: ['browser','convex'] }, search: { default: 'meilisearch' } } }
```

- **Selection.** Any capability with more than one implementation (`records`, later `search`) goes through one host and one config shape. The missing-provider policy is written once.
- **Wiring.** The same composition root as A. Features call `useCapability(recordsRef)`, and loaders call `context.capabilities.get(recordsRef)`.
- **Size.** About 4 new files, one generic layer, and type plumbing on the generic. It adds value only when there is a second capability with real alternatives.

### Option C — full extension tree (Backstage frontend system)

Extensions with ids, inputs, outputs and attachment points; config can enable, disable or re-attach any of them; the app is built from the tree.

**Rejected.** It solves composition across many independently authored packages, which this repo does not have (Q1, D2). Its cost is a framework of its own, and its only benefit is UI slots nobody uses (F-3).

### Comparison

| Criterion                                                | A: plugin object + records host                                  | B: capability refs + host                                         | C: extension tree                       |
| -------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| New concepts                                             | `definePlugin`, `RecordsHost`                                    | `capability`, `Implementation`, `CapabilityHost`, config          | Extension, input, attachment, blueprint |
| Fits "include at build, choose at runtime"               | Yes for records; datasource types are already per connection     | Yes, uniformly                                                    | Yes                                     |
| Second capability (search) later                         | Copy the records host pattern (~60 lines), or move to B then     | Add a ref and implementations                                     | Add extensions                          |
| Instance-scoped (G-010) / no import side effects (G-011) | Yes                                                              | Yes                                                               | Yes                                     |
| Type safety at call sites                                | Concrete types, no generic casts beyond the existing two         | Generic `T` through a ref; one cast inside the host               | Data-ref typing; heavy                  |
| Disturbs working code                                    | Low: `Plugins` shape kept; `activeRecordProvider` becomes a host | Medium: record callers move to `get(ref)`                         | High                                    |
| Fits G-002 vocabulary                                    | plugin = folder + definition; capability = records only          | plugin / capability / implementation / contribution, all explicit | Extension for everything                |
| Rough size of change                                     | S–M                                                              | M                                                                 | L                                       |

### Cross-cutting design points (apply to A and B)

**1. Missing or unavailable provider policy [R].** Today an unknown id silently falls back to `browser` (F-4).

| Situation                                                     | Policy                                                                                                                                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config or the stored choice names an id **not in this build** | Fall back to the configured default and show a visible banner. A build that lists its own default as missing fails at startup (as `toRegistry` already does for duplicates).                                   |
| In the build but **not configured** (no URL)                  | Status `notConfigured` (exists); no load. The default must be a configured provider.                                                                                                                           |
| Configured but **unreachable**, or **signed out**             | **Do not fall back for writes.** Show the state and block saves, so a user never believes they saved to the shared store when they saved to the browser. Reads may show the seeds with `placeError`, as today. |
| Chunk load fails                                              | Keep `loadWithRetry` and the reset-on-failure behaviour of `loadRecordProvider`.                                                                                                                               |

**2. Scoping [R].**

- **App or deployment level: the backend choice.** On a multi-user shared backend, which store is _the_ store is a deployment decision, as in Payload's `db:`, Strapi's `provider:` and Backstage's `app.extensions` (X-4, X-6, X-7). Shape: `{ records: { default: 'convex', convexUrl, allowUserChoice: false } }`.
  - **Caution: this narrows the user's decision.** If the config comes from `VITE_*` env vars, it is baked in at build time, so switching backend needs a rebuild. That is build-time selection under another name.
  - To keep the choice **literally runtime**, fetch the config at startup (`public/app-config.json`, read in `createApp` before the router starts). A deployment then changes backend by editing one static file, with no rebuild.
  - This needs user confirmation (Unresolved #1).
- **User or browser level: a dev or demo override only.** Today's per-browser localStorage choice and per-browser Convex URL form (F-4, F-7) become an override that config can turn off.
- **Workspace level: not needed now.** Nothing in the code or the answers has workspaces. If it arrives, it is a field on the host's `active()` input, not a new layer.
- **Datasources: per connection.** This already holds (F-11). Connections and vault stay per browser (Q3; G-007 is still open).

**3. Instance-scoped registries (G-010, G-011) [R].**

- One `createApp(config)` builds the registries and hosts and returns `{ plugins, records, queryClient, router }`.
- The router gets `{ queryClient, records }` in context, which covers the loaders in F-6.
- React gets the same objects through `PluginsContext` and a `RecordsContext`.
- `dashboardApi.ts` and `recordSync.ts` take the host as a parameter instead of importing module state.
- `configureRecordProviders` and the `migrateLegacyKeys` import side effect become explicit steps in `createApp`.
- Tests build a host per test instead of reconfiguring globals.
- The duplicated versioned-store code (`placeSetting.ts` with `activeRecordProvider.ts`, clone #4) collapses into the host's one storage helper.

**4. Auth as part of the backend provider [R, with an alternative].** Extend the record provider entry with an optional `auth` facet rather than a separate swappable auth capability. The reason: in Convex, Supabase and REST alike, the session lives in that backend's client (A-2, A-4, A-5).

```ts
interface RecordProviderPlugin {
  // existing light entry, plus:
  auth?: {
    required: boolean; // shared backends: true
    Provider?: LazyExoticComponent<ComponentType<{ children: ReactNode }>>; // e.g. ConvexAuthProvider wrapper, lazy
    SignIn: LazyExoticComponent<ComponentType>; // the sign-in form
  };
}
interface RecordProvider {
  // existing contract, plus:
  session?: {
    get(): { status: 'signedIn'; user: { id: string; name?: string } } | { status: 'signedOut' };
    signOut(): Promise<void>;
    onChange(listener: () => void): () => void;
  };
}
type RecordFailure =
  | /* existing */ { ok: false; reason: 'unauthenticated' }
  | { ok: false; reason: 'forbidden' };
// RecordProviderStatus.state gains 'signedOut'
```

- **Server side, each backend:**
  - Derive the owner from the token (`getAuthUserId` or `tokenIdentifier`; `auth.uid()` in RLS; the REST server's JWT check).
  - Add `owner` to the `records` table with an `(owner, collection, recordId)` index.
  - Apply `MAX_RECORDS`, export and import **per owner**.
  - Never accept an owner from the client.
- **`useCurrentUser`** (the placeholder "Alex Morgan") reads `records.active().session`. The browser provider has no session and reads as a local user.
- **Convex path choice [?].** Either:
  - (a) Convex Auth: switch to `ConvexReactClient` and mount its `ConvexAuthProvider` as the lazy `auth.Provider` wrapper. React-only, but this app is React (A-2, A-3); or
  - (b) an external OIDC provider (Clerk, Auth0, or Supabase Auth through `customJwt`) plus `ConvexClient.setAuth`, which keeps Convex fully lazy (A-4, A-5).
- **Alternative: auth as its own capability**, in the style of VS Code's `getSession(providerId)` (X-2). Choose it when **one identity provider must serve several backends**, for example the relay and records both checking the same JWT, or Supabase Auth in front of a REST API. In that case the record provider takes `getToken: () => Promise<string | null>` from the auth capability, and nothing else changes.

**5. `subscribe` (G-024) [R].** The user needs no live interaction (Q2), so remove `subscribe` and `canSubscribe` from the contract **and** the conformance suite cases (`recordProviderSuite.ts:374-404`) in one change. Also delete `watchRecords.ts` and `recordKeys.ts` if nothing else needs them. This also removes the only reason the Convex provider depends on `ConvexClient.onUpdate`, which makes the A-3 client switch trivial.

---

## 4. The "add to build" flow (G-030)

**Today [F].** Four optional datasource bundles go into a build only when `plugins.json` lists them. On the live site, a user-pasted GitHub PAT commits `plugins.json` to `main`; Pages rebuilds; the app polls `build-info.json` for up to 20 minutes. `plugins.json` is empty, so no live build has ever contained them (F-13).

| Alternative                                                                                                    | Bundle impact (measured, §2.1)                                      | Machinery removed                                                     | Trade-off                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. All plugins always in the build; the user picks per connection** (no toggle)                              | +6.1 kB gzip initial (+1.6 %); +92 kB gzip lazy, loaded only on use | All of F-13                                                           | Every type shows on the Data sources page. A deployment that must not offer a type cannot hide it.                                                                                |
| **2. All in the build, plus a deployment allowlist** in app config (`datasourceTypes: ['athena', …] \| 'all'`) | Same as 1; unlisted types are hidden, their chunks never fetched    | All of F-13                                                           | One config field, filtered when the registries are built. Hiding is not exclusion: the eager definitions still ship.                                                              |
| **3. Static import list in app config** (edit `app/plugins.ts` or a typed list; rebuild)                       | Only what is listed                                                 | Dev endpoint, PAT flow, polling, `build-info.json`, string-path table | Exclusion is real, but it needs a code change and a deploy, which is the same as today without the UI. Stays build-time only, so it conflicts with "choose at runtime" for types. |
| **4. Keep today's flow**                                                                                       | Only what is listed                                                 | Nothing                                                               | About 1,200 lines and a PAT-in-browser flow for an unused feature; it is also the source of G-036.                                                                                |

**[R]** The measured eager cost is about 6 kB gzip. That is small enough that true exclusion (3 and 4) buys almost nothing over 1 and 2, given that the heavy code (SDKs, relay client) is already lazy (F-12).

---

## 5. Keep and delete (for the migration plan)

**Keep [R]:**

| Piece                                                                                                    | Why                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RecordProvider` contract (`core/records/RecordProvider.ts`)                                             | It is a real port with result unions, revisions and capabilities. Extend it (auth failures, session); trim `subscribe`.                                          |
| Conformance suite (`src/testing/recordProviderSuite.ts`)                                                 | The way to accept a third backend (REST, Supabase). Add `unauthenticated` and per-owner isolation cases.                                                         |
| `runListQuery`                                                                                           | Shared client-side list semantics; a server-side backend can opt out later (G-023).                                                                              |
| Light entry + lazy `load` (`RecordProviderPlugin`, `DatasourceType.load`, `lazyWidget`, `loadWithRetry`) | Matches VS Code and Backstage practice (X-1, X-3); it is why the measured eager delta is small.                                                                  |
| `toRegistry` (duplicate-id check)                                                                        | Cheap and correct; reused by `createRegistries`.                                                                                                                 |
| `defineWidget` / `defineDatasourceType` generic erasure                                                  | Acceptable, documented casts (`WidgetPlugin.ts:116`, `OptionalPlugin.ts:99`).                                                                                    |
| `connectionDatasource.ts` (type + connection becomes a datasource; vault lookup at query time)           | It is the Grafana instance model (X-5) and keeps secrets out of query keys. Move it beside the contracts, so features stop importing it from `plugins/` (G-009). |

**Delete [R]:**

| Piece                                                                                                                                                                                               | Evidence                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `ActionPlugin.ts`, `ContextPanelPlugin.ts`, `panels` and `actions` registries, `PANELS`/`ACTIONS`                                                                                                   | F-3; G-031                                              |
| `OptionalPlugin` as a type (`{id, types}`), replaced by `PluginDefinition.datasourceTypes`                                                                                                          | F-2; G-002                                              |
| `BuildPlugins`, `PluginCatalogEntry`, the `plugins.build` key                                                                                                                                       | F-13                                                    |
| `features/datasources/buildList/*`; in `plugins.config.ts` the dev endpoint, the virtual module and `build-info.json`; `plugins.json`; `core/build/*`; `includeAll` hooks; `plugins.config.test.ts` | F-13; G-030; also clears G-036                          |
| `subscribe` / `canSubscribe`, `watchRecords.ts`, `recordKeys.ts`, and their suite cases                                                                                                             | F-10; G-024; Q2                                         |
| `CollectionDefinition`, `DEFINITIONS_COLLECTION`, `FieldsSchema`                                                                                                                                    | Test-only (01 §1.5); G-031                              |
| Module-global state in `activeRecordProvider.ts`, and `placeSetting.ts` as a separate store                                                                                                         | F-5; G-010, G-011; clone #4                             |
| `WidgetPlugin.optionsEditor` (no implementer)                                                                                                                                                       | G-031. Low stakes; keep it if editors are planned soon. |

---

## 6. Implications for this repo

| Gap          | Effect of this research                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-002        | Proposed vocabulary:<br>- **plugin**: an internal folder exporting one `definePlugin` object;<br>- **contribution**: a widget, datasource type or built-in datasource that a plugin adds to a typed list, all active;<br>- **capability**: a port with several implementations and runtime selection (records now; search when real);<br>- **provider** or **implementation**: one adapter for a capability;<br>- **connection**: a user-created instance of a datasource type. |
| G-001        | "Place" and "storage" become **record backend** or **records provider** (one term) in the glossary.                                                                                                                                                                                                                                                                                                                                                                             |
| G-004        | P0 work is server-side: an owner derived from the token, an index, per-owner caps. The client side is the `auth` facet, `session`, and new failure reasons (§3, point 4).                                                                                                                                                                                                                                                                                                       |
| G-006        | Only records is a capability today. Search has no code (01 §1.4). Do not build a generic capability layer for it until a second implementation of search is being written.                                                                                                                                                                                                                                                                                                      |
| G-009        | Contracts (`platform/`) separate from implementations (`plugins/<id>/`). `connectionDatasource` moves to the platform side.                                                                                                                                                                                                                                                                                                                                                     |
| G-010, G-011 | `createApp(config)` composition root; the host goes through the router context (X-9) and React context; no import side effects.                                                                                                                                                                                                                                                                                                                                                 |
| G-023        | `RecordProviderSetup` becomes config-driven at deployment level (URL in app config). The per-user setup form survives only as the dev override. Structured config can wait until REST or Supabase arrives.                                                                                                                                                                                                                                                                      |
| G-024        | Delete together with the suite cases (§3, point 5).                                                                                                                                                                                                                                                                                                                                                                                                                             |
| G-030, G-036 | Alternative 2 (all in the build plus an allowlist) removes about 1,200 lines and the Windows-red test.                                                                                                                                                                                                                                                                                                                                                                          |
| G-031        | Deletions listed in §5.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| G-019        | The deletions remove `plugins.config.ts` paths, the storybook and vitest `includeAll`, and the `virtual:optional-plugins` lint rule. These must move in the same commit.                                                                                                                                                                                                                                                                                                        |

**Paths most affected:**

- `src/app/plugins.ts`, `src/app/recordProviders.ts`, `src/app/PluginsProvider.tsx`, `src/app/recordSync.ts`, `src/app/routes/dashboards/{index,$id}.tsx`
- `src/lib/records/*`
- `src/plugins/{usePlugins,OptionalPlugin,ActionPlugin,ContextPanelPlugin,RecordProviderPlugin}.ts`
- `src/features/dashboards/data/dashboardApi.ts`, `src/features/storage/*`
- `convex/{schema,records}.ts`
- `plugins.config.ts`, `vite.config.ts:119`, `vitest.config.ts:25`, `.storybook/main.ts:22`, `oxlint.config.ts` (the `virtual:optional-plugins` rule)

---

## 7. Recommendation

**[R] Option A, plus the cross-cutting points in §3 and Alternative 2 for G-030.** Concretely:

1. **One `definePlugin` object per plugin folder.** A static `PLUGINS` list in `app/` is the build-time inclusion. It is flattened into today's typed per-kind registries with `toRegistry`.
2. **Records is the only runtime-selected capability.** It uses an instance-scoped `RecordsHost` created in `createApp(config)`:
   - the default comes from the deployment config, fetched at startup so that it stays runtime (Unresolved #1);
   - the per-browser override is allowed only when config says so;
   - the missing and unavailable policy follows §3, point 1.
3. **Auth is a facet of the record provider.** That means an optional `auth`, `session`, `unauthenticated` and `forbidden`, a `signedOut` status, and owner scoping enforced on the server. Remove `subscribe`.
4. **All optional datasource plugins ship in every build.** A deployment allowlist can hide some. Delete the build-list machinery.
5. **Delete** the unused plugin kinds and the scaffolding listed in §5.

**Why A over B.**

- B's generic layer pays for itself only with a **second** capability that has real alternatives in use. Search has zero code today (G-006).
- A keeps concrete types at every call site.
- The records host in A is the same shape B would generalise, so moving to B later is mechanical: wrap `RecordsHost` as the `records` implementation of a `CapabilityHost`.

**What would change this recommendation:**

| If …                                                                                                                            | Then                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A second runtime-selected capability is actually being built (search with Meilisearch **and** Elasticsearch, or swappable auth) | Move to **Option B** before adding it, rather than copying the records host twice.                                           |
| One identity provider must serve several backends (records and relay, or Supabase Auth in front of REST)                        | Make auth its **own capability** (VS Code `getSession` style, X-2). Record providers take a `getToken`.                      |
| Backend choice must differ per workspace or tenant inside one deployment                                                        | Add a scope input to the host (`active(scope)`). With several such capabilities, this also favours B.                        |
| A real second app appears (Q1 changes)                                                                                          | Still A or B. The composition root (`createApp(config)`) is what makes a second app cheap. C is still not warranted.         |
| A deployment must provably **not** ship a datasource type's code (compliance, or an org that bans a vendor SDK)                 | Use G-030 **Alternative 3**: a static import list in app config, with no UI and no PAT.                                      |
| The eager cost grows (many more datasource types with heavy schemas)                                                            | Move each type's schemas and fields behind `load` as well, keeping only name, icon and id eager; or switch to Alternative 3. |

**Unresolved [?]**

1. **Runtime meaning.** For a multi-user deployment, does "chosen at runtime" mean "a deployment picks its backend by editing a fetched `app-config.json`, no rebuild", or "each user picks in the UI"? §3.2 recommends the former, with the per-user choice only as an opt-in override. `VITE_*`-only config would be build-time selection, so it should be avoided if the decision stands as stated.
2. Convex Auth (`ConvexReactClient` plus a lazy `ConvexAuthProvider` wrapper) or external OIDC plus `customJwt` and `setAuth`? This depends on the sign-in methods wanted, and on whether the relay should ever verify the same identity.
3. Should a signed-in user also be able to choose the browser backend (a personal or offline mode), or is the backend fixed per deployment?
4. G-007: do drafts stay browser-local under a multi-user backend? Drafts keyed by `placeId` would then also need the user id.
5. Is the allowlist (G-030 Alternative 2) needed at all, or is Alternative 1 (show everything) enough?

---

## 8. Search-first check (ecc:search-first)

The question: does an existing package already provide what §7 Option A builds by hand? The research ran on 2026-11-22.

What it must provide:

- build-time inclusion;
- typed per-kind registries;
- lazy `load()`;
- runtime selection of one provider per capability;
- instance scope, with no module globals;
- a small footprint, with no runtime install and no microfrontends;
- a fit with React 19, TanStack Router and Vite.

### Channels

| Channel                                                                           | Status   | Notes                                                                                                                                         |
| --------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| npm (`npm view`: version, per-version `time`, license, deps, peerDeps)            | Used     | 15 packages checked                                                                                                                           |
| npm downloads API (`api.npmjs.org/downloads/point/last-week`)                     | Used     | Community signal                                                                                                                              |
| Bundlephobia API                                                                  | Used     | min+gz of the **whole package including deps**, not a tree-shaken import, so it is an upper bound                                             |
| GitHub (`search_repositories "react plugin registry typescript"`, Exa web search) | Used     | Only small or hobby repos turned up                                                                                                           |
| Claude skills (`~/.claude/skills`)                                                | Used     | Holds only `learned/` (empty) and `synced/` (Anthropic document and browser skills). No registry skill                                        |
| ECC plugin skills                                                                 | Used     | No skill ships a registry library. `search-first`, `react-patterns`, `hexagonal-architecture` and `typescript-patterns` are guidance only     |
| Context7 docs                                                                     | Not used | Loaded but not needed: no candidate passed the fit screen, so no API detail had to be checked. Backstage peer deps were read from npm instead |
| MCP registry                                                                      | Skipped  | Not relevant to a runtime library choice                                                                                                      |

### Rubric (each axis 0–10, total out of 70)

| Axis        | What 10 means                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fit         | Covers all seven needs above with no adapters. **0 when a hard constraint is broken** (peer deps exclude React 19, global container, or microfrontend runtime). |
| Maintenance | Latest version published in the last 3 months.                                                                                                                  |
| Community   | More than 1M downloads a week.                                                                                                                                  |
| Docs        | Typed API reference plus guides.                                                                                                                                |
| License     | MIT, Apache-2.0 or BSD.                                                                                                                                         |
| Dep weight  | No runtime deps.                                                                                                                                                |
| Bundle      | Under 2 kB gz, or 0 runtime bytes.                                                                                                                              |

### Candidates

| Candidate                                                                                                                                                                                                               | Version, latest publish | Downloads/wk | Licence      | Runtime deps                           | Size (gz) | Fit | Maint | Comm | Docs | Lic | Deps | Bundle | **Total** | Verdict                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------ | ------------ | -------------------------------------- | --------- | --- | ----- | ---- | ---- | --- | ---- | ------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@backstage/frontend-plugin-api`](https://github.com/backstage/backstage)                                                                                                                                              | 1.0.0, 2026-11-17       | 506k         | Apache-2.0   | 6 (`@backstage/*`)                     | 14.7 kB   | 0   | 10    | 7    | 9    | 10  | 4    | 4      | 44        | **Reject.** Peer deps are `react ^18` and `react-router-dom ^6 \|\| ^7`, which conflict with React 19 and TanStack Router. It is also Option C (§3). Pattern reference only.                                                                                                                 |
| [`@backstage/core-plugin-api`](https://github.com/backstage/backstage) (`createApiRef`, `createApiFactory`)                                                                                                             | 1.13.0, 2026-11-17      | 284k         | Apache-2.0   | 7 (adds `zod`, `history`)              | 7 kB      | 0   | 10    | 6    | 9    | 10  | 3    | 5      | 43        | **Reject.** Same peer-dep conflict (`react ^17 \|\| ^18`, `react-router-dom ^6`). The ApiRef and ApiFactory idea is about 20 lines and is what Option B already copies.                                                                                                                      |
| [`hookable`](https://github.com/unjs/hookable) (unjs)                                                                                                                                                                   | 6.1.2, 2026-09-17       | 36M          | MIT          | 0                                      | 1.7 kB    | 2   | 9     | 10   | 6    | 10  | 10   | 10     | 57        | **Reject for this need.** It is a typed hook and event bus, with no registries, lazy load or selection. It could replace `RecordsHost.subscribe`, but that is about 10 lines.                                                                                                                |
| [`tapable`](https://github.com/webpack/tapable)                                                                                                                                                                         | 2.3.4, 2026-11-13       | 200M         | MIT          | 0                                      | 4.3 kB    | 1   | 10    | 10   | 5    | 10  | 10   | 8      | 54        | **Reject.** Webpack's hook system: tap and call pipelines, not registries or selection.                                                                                                                                                                                                      |
| [`typed-inject`](https://github.com/nicojs/typed-inject)                                                                                                                                                                | 5.0.0, 2024-12-13       | 7.5M         | Apache-2.0   | 0                                      | 1.3 kB    | 3   | 5     | 10   | 7    | 10  | 10   | 10     | 55        | **Reject.** Instance-scoped injectors with compile-time-checked tokens and no decorators. But it has no async `load`, no "pick one of N by config id", no persisted override and no missing-provider policy, and those are what `RecordsHost` exists for.                                    |
| [`awilix`](https://github.com/jeffijoe/awilix)                                                                                                                                                                          | 13.0.7, 2026-11-16      | 943k         | MIT          | 1 (`fast-glob`)                        | 3.5 kB    | 2   | 10    | 7    | 8    | 10  | 7    | 8      | 52        | **Reject.** Node-first, with auto-loading via `fast-glob`. Resolution is by string name, which weakens typing. Same gaps as typed-inject.                                                                                                                                                    |
| [`tsyringe`](https://github.com/microsoft/tsyringe)                                                                                                                                                                     | 4.10.0, 2025-04-16      | 25M          | MIT          | 1 (`tslib`)                            | 3.9 kB    | 0   | 3     | 10   | 6    | 10  | 9    | 8      | 46        | **Reject.** Needs decorators and `reflect-metadata`. The default `container` is a module global, which breaks the instance-scope requirement (G-010).                                                                                                                                        |
| [`inversify`](https://github.com/inversify/monorepo)                                                                                                                                                                    | 8.3.0, 2026-11-07       | 3.5M         | MIT          | 3 (`@inversifyjs/*`)                   | 20.4 kB   | 2   | 10    | 10   | 8    | 10  | 6    | 3      | 49        | **Reject.** Decorator-based (`@injectable`) and heavy for a three-kind registry. Same gaps as the other DI containers.                                                                                                                                                                       |
| [`@grafana/data`](https://github.com/grafana/grafana) (plugin classes)                                                                                                                                                  | 13.3.1, 2026-11-10      | 200k         | Apache-2.0   | 28 (`rxjs`, `lodash`, `ol`, …)         | 332.7 kB  | 0   | 10    | 6    | 7    | 10  | 0    | 0      | 33        | **Reject.** Coupled to Grafana's runtime plugin loader and data frames. Use `PanelPlugin` and `DataSourcePlugin` only as a pattern reference for the widget and datasource kinds.                                                                                                            |
| [`@module-federation/enhanced`](https://github.com/module-federation/core)                                                                                                                                              | 2.9.3, 2026-11-20       | 4.4M         | MIT          | 13                                     | 9.9 kB+   | 0   | 10    | 10   | 8    | 10  | 2    | 5      | 45        | **Reject.** This is a microfrontend and runtime-remote system, which the requirements exclude.                                                                                                                                                                                               |
| [`@lumino/application`](https://github.com/jupyterlab/lumino) (JupyterLab tokens and plugins)                                                                                                                           | 2.4.11, 2026-10-08      | 99k          | BSD-3-Clause | 3 (`@lumino/*`)                        | 46.1 kB   | 2   | 9     | 5    | 6    | 10  | 5    | 1      | 38        | **Reject.** Its `Token<T>`, `provides` and `requires` model is close to Option B, but it pulls in Lumino widgets and commands, which are not React.                                                                                                                                          |
| [`pluggable`](https://github.com/interlockjs/pluggable)                                                                                                                                                                 | 1.1.4, 2022-06-24       | 16           | MIT          | 6 (`babylon`, `bluebird`, `lodash`, …) | 22.9 kB   | 0   | 0     | 0    | 2    | 10  | 1    | 2      | 15        | **Reject.** Abandoned, and Node build tooling.                                                                                                                                                                                                                                               |
| [`react-pluggable`](https://www.npmjs.com/package/react-pluggable)                                                                                                                                                      | 0.4.3, 2021-02-11       | 4.7k         | MIT          | 1 (`semver`)                           | 9 kB      | 1   | 0     | 2    | 3    | 10  | 8    | 5      | 29        | **Reject.** Abandoned. A runtime `PluginStore` singleton with string-keyed functions.                                                                                                                                                                                                        |
| GitHub: [react-pkl](https://github.com/xpodev/react-pkl), [km-plugins](https://github.com/komeilm76/km-geoboard/blob/main/packages/km-plugins/README.md), [react-plugins](https://github.com/lmerotta-zz/react-plugins) | n/a                     | ~0           | MIT          | 0–1                                    | small     | 3   | 3     | 0    | 4    | 10  | 9    | 9      | 38        | **Reject.** These are hobby-scale (0 to a few stars). They are runtime-registration hosts (`host.add`, `registerPlugin`), the opposite of a static build list. Their `definePlugin` and `Result`-returning `register` match §7, which confirms the pattern.                                  |
| [`unplugin`](https://github.com/unjs/unplugin) or a custom Vite plugin with a `virtual:plugins` module                                                                                                                  | 3.7.0, 2026-10-28       | 90M          | MIT          | 4 (build time only)                    | 0 runtime | 4   | 10    | 10   | 8    | 10  | 10   | 10     | 62        | **Not needed.** Scored at 0 runtime bytes because it runs only at build time. A virtual module could generate `PLUGINS` from folders, but Vite's built-in glob does the same with no plugin.                                                                                                 |
| **Vite built-in [`import.meta.glob`](https://vite.dev/guide/features#glob-import)**                                                                                                                                     | Vite (already a dep)    | n/a          | MIT          | 0                                      | 0         | 6   | 10    | 10   | 9    | 10  | 10   | 10     | 65        | **Optional compose** for §7.1 only (see below).                                                                                                                                                                                                                                              |
| **[`zustand/vanilla`](https://github.com/pmndrs/zustand) `createStore`** (already `^5.1.0` in `package.json`)                                                                                                           | already installed       | n/a          | MIT          | 0 new                                  | 0 new     | 5   | 10    | 10   | 9    | 10  | 10   | 10     | 64        | **Optional compose** inside `RecordsHost`. One store per `createRecordsHost()` call holds `{ activeId, status }` and gives `subscribe` and `getState`, which React reads through `useStore`. Instance-scoped by construction. It does not replace the registry, the lazy load or the policy. |

High totals for hookable, tapable and typed-inject come from good hygiene, not fit. The fit column is the deciding axis.

### Decision: **Build (as §7), composing two things already in the stack**

- **No package adopts or extends cleanly.**
  - The only purpose-built frontend plugin APIs (Backstage) are excluded by peer deps: React 18 and React Router, against this app's React 19 and TanStack Router.
  - DI containers give typed tokens and instance injectors. They do not give the parts that make up most of `RecordsHost`: async `load()` with retry and reset, selecting one of N by a config id, a persisted override that config can disable, and the missing or unavailable policy in §3.1.
  - Everything else is a hook bus, abandoned, microfrontend tooling, or tied to another host.
- **What §7 builds is small.** It is `definePlugin` (an identity function), `toRegistry` (exists today), `createRegistries`, and `createRecordsHost` (§3 puts it at about 60 lines). Adding a dependency costs more than that, and none of the candidates removes the policy code.
- **Compose, both optional:**
  1. `zustand/vanilla` `createStore` as `RecordsHost`'s internal state and `subscribe`. Zustand is already a dependency, and this replaces a hand-written listener set.
  2. `import.meta.glob` as an alternative to a hand-kept `PLUGINS` array (below).
- **Patterns to borrow, not packages:**
  - Backstage `createApiRef` and Lumino `Token<T>`, if and when §7 moves to Option B;
  - Grafana `PanelPlugin` and `DataSourcePlugin` for the widget and datasource kind shapes;
  - km-plugins' `Result`-returning `register` for duplicate and missing errors.

### Should §7 change?

**No change to the recommendation.** Option A still stands. Two points to record:

1. **§7.1, build list.** Vite's `import.meta.glob('../plugins/*/plugin.ts', { eager: true })` would give build-time inclusion with no hand-kept `PLUGINS` list, and it stays statically analysable and tree-shakeable.
   - The trade-off: the glob includes **every** folder, while the explicit list can be reviewed in a diff and lets a build leave a plugin out.
   - That is G-030 Alternative 3 (§7 "What would change") by another route.
   - Keep the explicit list as the default. Choose the glob only if forgetting to register new plugin folders becomes a real problem.
2. **§7.2, `RecordsHost`.** Implementing its state and `subscribe` with `zustand/vanilla` `createStore` is an implementation detail, not a design change, and adds no dependency. Decide this in the migration step that builds the host.

Option B's "move later is mechanical" claim also holds. No library would be needed for B either: the Backstage ApiRef pattern copied into `platform/capability.ts` is enough.
