# R7: Core, plugins, services and the relay

Part of the [R5 review](R5-codebase-overview.md), at `main` commit `2515b1e`. Covers `src/core`, `src/plugins`, `src/lib`, `src/utils` and `relay/`, with security as the main lens.

## In short

The most careful code in the repo. The vault and the relay are built defensively and documented, and the one real bug is in Sentry's settings path, which plan 06 will rebuild anyway. It's worth fixing now because it breaks a button that's live today.

## 1. Saving Sentry settings twice throws

`lib/sentry/client.ts` `initSentry()` calls `Sentry.init` with a new `Sentry.replayIntegration(...)` each time, and `reconfigureSentry()` (Save and Reset in `SentrySettings.tsx`) calls it again. The Replay integration allows one instance per page: its constructor throws `Multiple Sentry Session Replay instances are not supported` when one already exists ([source](https://github.com/getsentry/sentry-javascript/blob/develop/packages/replay-internal/src/integration.ts)).

- With a DSN at start-up, the first Save throws.
- Without one, the first Save works and the second throws.
- Either way the settings are already in `localStorage` but not applied, no success toast shows, and the error goes to the global handlers.

**Look at:** creating the Replay integration once and changing options through the client (`Sentry.getClient()`), or saving and asking for a reload. Then a test that saves twice.

## 2. Integrations load the Sentry SDK past its single entry point

`lib/sentry/runtime.ts` is meant to be the only way into Sentry: it loads the SDK as its own chunk, and only when a DSN is set. Five files in `features/integrations/` import `lib/sentry/client.ts` directly, and that module reads the config at import time (`let currentConfig = loadSentryConfig()`). Opening Integrations therefore loads the whole SDK, DSN or not. This folder is already exempt from lint until plan 06 rebuilds it.

**Look at:** routing these calls through `runtime.ts` when plan 06 starts.

## 4. Sentry settings are read from storage without a schema

`lib/sentry/sentryConfig.ts` parses `localStorage` with `JSON.parse(raw) as Partial<SentryConfig>`. Everywhere else, stored data goes through a zod schema (dashboards, drafts, connections, the vault). A bad value, such as a sample rate saved as text, goes straight into `Sentry.init`.

**Look at:** a `sentryConfigSchema` with the defaults, like the other stored documents.

## 9. Drafts rewrite the whole dashboard twice on every edit

The store's subscription in `features/dashboards/state/createDashboardStore.ts` serialises the document and the baseline to canonical JSON on each relevant change, to work out `isDirty`. It then writes both whole to `localStorage` (`drafts.ts`). Writes are already wrapped, and a failure shows "Export JSON before leaving". That's cheap for today's dashboards, but the cost grows with the document, and Studio, records and navigation will make documents bigger.

**Look at:** comparing by a cheaper signal than full serialisation, and writing drafts after a short idle delay. Belongs with the data restructure and the storage-provider work.

## 10. The relay can close a connection pool that's still in use

`relay/src/poolCache.ts` keeps up to 10 pools and closes the least recently used one when an 11th connection string arrives, whether or not a query on it is still streaming. With more than 10 connections in use at once, a running query can fail mid-way.

**Look at:** closing an evicted pool only once its requests finish, or a larger default. It's rare for one person's dashboards.

## Checked and fine

- **Vault:** PBKDF2 with 600,000 iterations, then AES-GCM-256 with a fresh 12-byte IV per seal. The key can't be extracted and lives in memory only, so a reload locks the vault. Secrets stay out of stores, query keys and exports; a connection's revision, not its secrets, enters the query key.
- **Relay:** origin allow-list, a bearer token compared in constant time (hashed first, so lengths don't leak), localhost-only without a token (which also stops DNS rebinding), a 256 KB body limit, a row cap, timeouts, an allow-list of database hosts, and connection strings scrubbed from errors and logs. MongoDB stages that write or run code are refused.
- **SQL isn't filtered:** a deliberate, documented choice (`docs/dashboard/datasources.md`): give the relay a read-only login. For the clinical app, consider saying so in the connection form too, not only in the docs.
- **Plugin contracts:** the two `as unknown as` casts (`defineWidget`, `defineDatasourceType`) drop type parameters after the definition is checked, and the same schemas parse options and connections at runtime. Fine as written.
- **Sentry privacy:** Replay masks all text and blocks media. Keep that when `rhb-cdss` shows patient data, and check what the warn and error console messages sent to Sentry may contain.
