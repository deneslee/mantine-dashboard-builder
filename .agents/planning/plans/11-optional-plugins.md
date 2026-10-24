# 11 Optional plugins

Status: open · Phase 6 (real datasources) and the Integrations foundation · Depends on: 07 stage 3 (done), 08 (done) · Research: [browser-secrets](../research/browser-secrets.md), [integrations](../research/integrations.md)

## Goal

Add datasource plugins for **Azure SQL, MongoDB, AWS** (Athena, Aurora, Redshift, DynamoDB) and **Google** (BigQuery, Firestore).

- The user types connections, including their secrets, into the app.
- A plugin is in the build only when `plugins.json` lists it. The default is none.
- **Add to build** on the Data sources page edits that list: from the dev server, or from the live site through a GitHub commit, after which CI rebuilds.
- Everything must run on free tiers, for a student showcase.

## Design

### Vocabulary

- **Optional plugin** (`aws`): what `plugins.json` lists. It provides **datasource types** (`athena`, `aurora`, `redshift`, `dynamodb`).
- **Connection**: a configured datasource of a type (`id`, `plugin`, `type`, `name`, `settings`, `updatedAt`). Its secrets live only in the vault.
- A query names a connection by id: `{ datasource: 'analytics', spec }`, as 07 §6 has it ("datasource = a configured connection"). `app/` turns each connection into a `DatasourcePlugin` in `usePlugins().datasources`, so the dashboard code doesn't change.
- `DatasourcePlugin.type` becomes `id`. A new optional `revision` changes when a connection's settings or secrets change, and `datasourceQuery` appends it to the cache key. No secret is ever in a key.

### What's in the build

- `plugins.json` (repo root) lists ids. `plugins.config.ts` holds the known plugins and the Vite plugin `optionalPlugins()`, which generates `virtual:optional-plugins` with three exports:
  - `optionalPlugins`: static imports of the listed manifests only. An unlisted plugin never enters the module graph, so it is absent from `dist` by construction, not by tree-shaking.
  - `pluginCatalog`: every known plugin's id, name, one-line description and `isInBuild`. These strings are what Add to build offers; they carry no code.
  - `buildInfo`: the repository and branch, from `GITHUB_REPOSITORY` and `GITHUB_REF_NAME`.
- Unknown ids fail the build.
- The dev server watches the file, reloads on change, and serves `POST /__plugins` (same origin, JSON only) to write it.
- Builds emit `build-info.json` (`plugins`, `commit`, `builtAt`), which the live site polls.
- Vitest and Storybook use `'all'`.
- Even in the build, a type's runtime (SDK, signing, mapping) is a lazy chunk, loaded the first time a connection of that type is queried or tested. Only the manifests (fields, zod schemas) are in the main bundle.

### Add to build

- **Dev:** `POST /__plugins` writes the list; the page reloads; you commit `plugins.json`.
- **Live site:** a fine-grained token (this repository only, Contents: read and write), kept in the vault.
  - `GET` then `PUT` on `/repos/{owner}/{repo}/contents/plugins.json` with the file's `sha`, retrying once on a conflict.
  - Then poll `build-info.json` until the new build is live, and offer Reload.
  - This works with any host that builds on push.

### Secrets: the vault

Following [browser-secrets](../research/browser-secrets.md):

- **Crypto:** PBKDF2-SHA256 at 600,000 iterations gives a non-extractable AES-GCM-256 key. The ciphertext is stored under `storageKey('vault')`.
- **Session first:** secrets live in memory, and "Save on this device" encrypts them.
- **Locking:** a reload locks the vault, and Unlock asks for the passphrase.
- **Tamper check:** each entry keeps its connection's settings as saved. If the settings no longer match, the secrets aren't used.
- **Never** in dashboards, exports, URLs, query keys, Inspect, toasts or logs.
- **Reporting:** `reportError` stops reporting `forbidden` (locked connections, AccessDenied).

### Datasource types

| Plugin      | Types                                      | Runs                                    | Notes                                                                                                                                                                 |
| ----------- | ------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google`    | `bigquery`, `firestore`                    | Browser: fetch and WebCrypto, no SDK    | Service-account key (RS256 JWT exchanged for a token) or an access token. BigQuery `jobs.query` with named parameters and `maximumBytesBilled`; Firestore `runQuery`. |
| `aws`       | `athena`, `aurora`, `redshift`, `dynamodb` | Browser: AWS SDK v3, one chunk per type | Access key and optional session token. Athena and Redshift poll; Aurora retries while resuming; DynamoDB is PartiQL `SELECT` only.                                    |
| `azure-sql` | `azure-sql`                                | Relay                                   | Connection string and relay token typed in the app.                                                                                                                   |
| `mongodb`   | `mongodb`                                  | Relay                                   | Aggregation pipelines in Extended JSON; `$out`, `$merge`, `$function`, `$accumulator` and `$where` are rejected.                                                      |

Time macros: `$__from`, `$__to`, `$__fromMs` and `$__toMs` become each database's native bound parameters (`core/data/timeMacros.ts`). Athena has no named parameters, so it gets a literal built from our own value.

### Relay (`relay/`)

A stateless Hono service with `mssql` and `mongodb`. Browsers can't speak TDS or the MongoDB wire protocol, and MongoDB's Data API reached end of life on Sep 30, 2025.

- **Network:** binds 127.0.0.1 by default; any other host needs `RELAY_TOKEN`. It has a CORS allowlist and an allowlist of database hosts.
- **Limits:** on rows, request bodies and time.
- **Logging:** never logs bodies or connection strings.
- **Run it:** `vp run relay`, or a container (`relay/Dockerfile`).

### Lint

- Only `app/` imports `@/plugins/optional/**` or `virtual:optional-plugins`.
- `src/` never imports server packages.
- `relay/` imports only `src/core/`.

## Tasks

- [x] **0 Toolchain and baseline.** Node 24.22.1 and pnpm 12.15.0, `vp install`, Intent skills, a baseline build and test run. Done when the baseline is in Verification.
  - Oct 24: the sandbox blocks `vite.plus`, so Node came from nodejs.org (checksum checked) and pnpm and `vite-plus` from npm.
  - `pnpm exec intent` runs `@tanstack/devtools-vite`'s bin of the same name, which fails. `node node_modules/@tanstack/intent/dist/cli.mjs list` runs the repo's Intent; the Router `search-params` skill was loaded.
- [x] **1 Contracts and core.** `DatasourcePlugin.id` and `revision`, `OptionalPlugin.ts`, `connectionDatasource.ts`, `dataFrameSchema`, `columnsToFrame`, `timeMacros`, `passphraseCipher`, `relayContract`, and `forbidden` not reported. Done when each has unit tests.
- [ ] **2 Build selection.** `plugins.json`, `plugins.config.ts`, config wiring, `app/plugins.ts`, `useAppPlugins`, `Providers`, the lint rules. Done when a mini build shows an unlisted plugin absent and a listed one in its own chunk.
- [ ] **3 Vault and connections stores.** Done when tests show no plaintext in storage; lock, unlock, a wrong passphrase and reset; session-only secrets lost on reload; a tampered connection refused; and no secrets in exports or query keys.
- [ ] **4 Google plugin.** Done when BigQuery and Firestore mapping, macros, JWT signing and the token cache are tested.
- [ ] **5 Data sources UI.** Routes, Data sources page, connection page and form, vault dialogs, the Plugins section (dev path), import warnings for missing datasources. Done when every state has a story and the flows are play functions.
- [ ] **6 AWS plugin.** Done when the four runtimes are tested on mocked clients and each is its own chunk.
- [ ] **7 Relay, Azure SQL and MongoDB.** Done when the relay's security rules and mapping are tested and both plugins pass their client tests.
- [ ] **8 Add to build from the live site.** Done when the commit and polling flow is tested against mocked GitHub responses and its dialog states have stories.
- [ ] **9 Docs.** `docs/dashboard/datasources.md` (including a "Try it free" table); roadmap, tasks, 06, architecture, dashboard, README and AGENTS updates. Done when `lint/docs.test.ts` passes and this plan is in `done/`.

## Decisions

- **2026-10-24: a relay for Azure SQL and MongoDB.** It is stateless: the connection string comes with each request. AWS and Google run in the browser, because live CORS preflights succeeded against DynamoDB, Athena, the RDS and Redshift Data APIs, BigQuery, Firestore and `oauth2.googleapis.com/token`.
- **2026-10-24: chosen at build time, from the UI.** `plugins.json`, `[]` by default, edited with Add to build (dev server, or a GitHub commit from the live site). This replaces the runtime `integrations.json` from [research/integrations](../research/integrations.md) for datasource plugins. "Plugins" is the name, at the user's suggestion.
- **2026-10-24: AWS covers Athena, Aurora, Redshift and DynamoDB.** DynamoDB was added for its always-free tier. Google covers BigQuery and Firestore.
- **2026-10-24: secrets go in a passphrase vault.** The user asked for researched advice ([browser-secrets](../research/browser-secrets.md)). Passkey (PRF) unlock comes later.

## Verification

- **Baseline (Oct 24, before any change):** `vp run build` gives first-load JS of 44 files, 858.0 KiB raw and 275.5 KiB gzip (CSS: 321 KB raw). `vp run test`: 55 files, 277 tests passing. `vp run lint` and `vp run format:check` are clean.

## Risks

- **Local relay prompts:** Chrome asks before a public site calls a relay on localhost (Local Network Access). A deployed relay avoids the prompt.
- **Costs:** Athena and BigQuery bill by data scanned. They are capped by `maxRows` and `maximumBytesBilled`, and the docs say so.
- **Protected branches:** a protected default branch rejects the live-site commit. GitHub's message is shown; opening a pull request instead comes later.

## Out of scope

- Sentry as an optional plugin, and the `/integrations` catalog rebuild (06 §3).
- Per-type query editors (queries stay JSON).
- Passkey unlock.
- Moving hosts, a custom domain, CSP and `base` from env.
- Cloud SQL, Spanner, CloudWatch and Timestream.
