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
- [x] **2 Build selection.** `plugins.json`, `plugins.config.ts`, config wiring, `app/plugins.ts`, `useAppPlugins`, `Providers`, the lint rules. Done when a mini build shows an unlisted plugin absent and a listed one in its own chunk.
- [x] **3 Vault and connections stores.** Done when tests show no plaintext in storage; lock, unlock, a wrong passphrase and reset; session-only secrets lost on reload; a tampered connection refused; and no secrets in exports or query keys.
- [x] **4 Google plugin.** Done when BigQuery and Firestore mapping, macros, JWT signing and the token cache are tested.
- [x] **5 Data sources UI.** Routes, Data sources page, connection page and form, vault dialogs, the Plugins section (dev path), import warnings for missing datasources. Done when every state has a story and the flows are play functions.
- [x] **6 AWS plugin.** Done when the four runtimes are tested on mocked clients and each is its own chunk.
- [x] **7 Relay, Azure SQL and MongoDB.** Done when the relay's security rules and mapping are tested and both plugins pass their client tests.
  - Oct 24: `relay/` (Hono, `mssql`, `mongodb`) has 48 tests through `app.request()` and fake drivers. `vp run relay` starts it on this machine; `relay/Dockerfile` builds it for container hosts.
  - The relay itself and its production `pnpm deploy` folder were run here. The Docker image wasn't, because the sandbox has no Docker daemon.
  - The Plugins cards' buttons are now named after their plugin ("Remove from build (AWS)"). Several cards made the same name ambiguous for screen readers and broke the RemoveFromBuild story, which had been failing since task 6.
- [x] **8 Add to build from the live site.** Done when the commit and polling flow is tested against mocked GitHub responses and its dialog states have stories.
  - Oct 24: `buildList/githubBuildList.ts` reads `plugins.json` and its sha, commits the new list (re-reading once on a 409), maps GitHub's refusals, and polls `build-info.json`.
  - `buildTarget.ts` takes CI's repository, else the one kept under `storageKey('build-repo')`.
  - `AddToBuildDialog` has six stories: Token, Incomplete, Committing, Waiting, Live, Failed. `PluginsSection` has `target: 'dev-server' | 'github'`.
  - The tests stub `fetch`, since MSW isn't used in `src/`.
  - `core/build/buildInfo.ts` holds the shape of `build-info.json`, for the build and the poller alike.
  - Not run against GitHub here: that needs the user's token.
- [ ] **9 Docs.** `docs/dashboard/datasources.md` (including a "Try it free" table); roadmap, tasks, 06, architecture, dashboard, README and AGENTS updates. Done when `lint/docs.test.ts` passes and this plan is in `done/`.

## Decisions

- **2026-10-24: a relay for Azure SQL and MongoDB.** It is stateless: the connection string comes with each request. AWS and Google run in the browser, because live CORS preflights succeeded against DynamoDB, Athena, the RDS and Redshift Data APIs, BigQuery, Firestore and `oauth2.googleapis.com/token`.
- **2026-10-24: chosen at build time, from the UI.** `plugins.json`, `[]` by default, edited with Add to build (dev server, or a GitHub commit from the live site). This replaces the runtime `integrations.json` from [research/integrations](../research/integrations.md) for datasource plugins. "Plugins" is the name, at the user's suggestion.
- **2026-10-24: AWS covers Athena, Aurora, Redshift and DynamoDB.** DynamoDB was added for its always-free tier. Google covers BigQuery and Firestore.
- **2026-10-24: the relay caps rows by cancelling, not with `SET ROWCOUNT`.** Rows stream in and the query is cancelled at `maxRows`. `SET ROWCOUNT` would stay set on pooled connections.
- **2026-10-24: the relay checks hosts with each driver's own parser.** That is mssql's `parseConnectionString` and `mongodb-connection-string-url`, so the hosts checked are the hosts each driver connects to.
  - It refuses sign-ins as its own machine (managed identity, `MONGODB-AWS`, OIDC) and MongoDB options that read local files or use a proxy.
  - Without a token it answers only when the Host is localhost, which defeats DNS rebinding.
- **2026-10-24: relay errors say whether to retry** (`isRetryable`), so a SQL syntax error isn't retried.
- **2026-10-24: the MongoDB operator check lives in `core/relay/mongoOperators.ts`.** The manifest is in the main bundle, and importing the check from `relayContract.ts` put the relay's routes and schemas there too.
- **2026-10-24: `relay/Dockerfile` uses `pnpm deploy`.** A filtered `pnpm install` still installs the whole app (840 MB); `pnpm deploy --prod` gives an 81 MB folder from the same lockfile.
- **2026-10-24: the live-site token is saved only into an unlocked vault.** Add to build is itself a dialog, so it doesn't open the vault's own. Otherwise the token lasts until the tab closes.
  - It sits under the vault key `github`, fingerprinted by repository and branch.
- **2026-10-24: a build counts as live once it has the new commit or the new list.** A later commit may have built on ours, and `build-info.json` then names that one.
- **2026-10-24: secrets go in a passphrase vault.** The user asked for researched advice ([browser-secrets](../research/browser-secrets.md)). Passkey (PRF) unlock comes later.

## Verification

- **Baseline (Oct 24, before any change):** `vp run build` gives first-load JS of 44 files, 858.0 KiB raw and 275.5 KiB gzip (CSS: 321 KB raw). `vp run test`: 55 files, 277 tests passing. `vp run lint` and `vp run format:check` are clean.
- **Not in the build (Oct 24, tasks 4–7):**
  - **`plugins.json` = `[]`:** `dist/assets` has none of `/v1/sqlserver`, `/v1/mongodb`, the relay client's messages, `mongodb+srv`, `database.windows.net`, `AmazonAthena`, `rds-data`, `redshift-data`, `bigquery.googleapis.com` or `firestore.googleapis.com`. `build-info.json` lists `[]`.
    - First-load JS: 41 files, 866.6 KiB raw, against the 858.0 KiB baseline.
  - **`["google"]`:** three lazy chunks (BigQuery 3.0 kB, Firestore 1.8 kB, auth 5.5 kB).
  - **`["aws"]`:** lazy runtimes (Athena 16 kB, Redshift 17 kB, Aurora 30 kB, DynamoDB 42 kB) and a shared SDK chunk of 114 kB (39 kB gzip).
  - **`["azure-sql", "mongodb"]`:** the relay client and contract 2.4 kB, the Azure SQL runtime 0.6 kB, the MongoDB runtime 0.9 kB. Only the manifests' field labels and the refused-operator list are in the entry.
  - None of these chunks is in the entry or the modulepreloads.
- **Gate (Oct 24, task 7):** `vp check` (format, lint, types: 420 files), `vp run lint` and `pnpm build` pass. `pnpm test`: 84 files and 469 tests, node, dom and storybook.
  - In this sandbox the globally installed `vp` runs its own bundled Vitest for `vp test`, which can't find jsdom. `pnpm test` runs the repo's Vite+.

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
