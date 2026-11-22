# Plugins, capabilities and record providers

Last verified: commit `4550705`, 2026-11-22. Repo facts were re-checked against the code. External claims carry the source the original research cited; they were not re-fetched.

## Question

How should replaceable capabilities and plugins be modelled in one app? A replaceable capability has several implementations in the build, with one chosen at runtime. Record providers are the main case.

## Repo facts (verified)

| Fact                                                                                                                                                                  | Evidence                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| The plugin registry has 7 kinds: widgets, datasources, types, recordProviders, panels, actions, build. `toRegistry` throws on a duplicate id                          | `src/plugins/usePlugins.ts:19-52`                                                                  |
| `OptionalPlugin` is just `{id, types}`. Widgets, datasources and record providers are listed one by one; there is no "plugin" unit                                    | `OptionalPlugin.ts:80-84`, `src/app/plugins.ts:29-41`                                              |
| `PANELS` and `ACTIONS` are empty, and nothing outside tests reads them. `ActionPlugin` has 20 lines, `ContextPanelPlugin` 16                                          | `src/app/plugins.ts:14-15,38-39`                                                                   |
| The record providers are `[browser, convex]`, configured as an **import side effect**                                                                                 | `src/app/recordProviders.ts:25-27`, `src/app/plugins.ts:17-19`                                     |
| The active provider is a module-global in `localStorage` (`{version:1,id}`). An unknown id falls back to `browser`                                                    | `src/lib/records/activeRecordProvider.ts:19-56`                                                    |
| Non-React callers of that global sit in routes, `recordSync`, `dashboardApi` and three `features/storage` hooks                                                       | grep `src`                                                                                         |
| Convex functions are public and check no auth, and no owner field exists                                                                                              | `convex/records.ts:6`                                                                              |
| Provider status has no "signed out" state, and failures have no auth reason                                                                                           | `src/core/records/RecordProvider.ts:78-86,167-171`                                                 |
| `subscribe` and `canSubscribe` are in the contract. Their only caller is `watchRecords`, which nothing calls; the conformance suite still tests them                  | `RecordProvider.ts:59,71,150`, `src/lib/records/watchRecords.ts`, `recordProviderSuite.ts:373-404` |
| `CollectionDefinition` and `FieldsSchema` are used only by the suite; only a test sets `WidgetPlugin.optionsEditor`                                                   | `RecordProvider.ts:187-210`, `WidgetPlugin.ts:55`                                                  |
| Heavy vendor SDKs load lazily through `import()`                                                                                                                      | `src/plugins/optional/*/*Plugin.ts`                                                                |
| "Add to build": `plugins.config.ts` (227 lines) provides a virtual module, `POST /__plugins` and `build-info.json`. `plugins.json` is empty; `buildList/` has 7 files | `plugins.config.ts`, `plugins.json`                                                                |
| Only `app/` may import `virtual:optional-plugins` (lint)                                                                                                              | `oxlint.config.ts:65-66,264`                                                                       |

## Measured, not reproducible from the repo

Shipping every optional datasource type in every build costs **+6.1 kB gzip**. This was measured on 2026-11-22 and not re-run.

## External evidence (cited by the original research, not re-fetched)

| Claim                                                                    | Source                                                                 |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| VS Code contributions and activation events; its `authentication` API    | code.visualstudio.com/api                                              |
| Backstage utility APIs and extensions; Grafana plugin types vs instances | backstage.io/docs/frontend-system, grafana.com/developers/plugin-tools |
| Payload adapters, Strapi providers                                       | payloadcms.com/docs, docs.strapi.io                                    |
| Convex Auth and custom JWT; Supabase JWT and RLS                         | labs.convex.dev, docs.convex.dev, supabase.com                         |
| TanStack Router context for app-scoped services                          | tanstack.com/router                                                    |

## Proposals (not decided)

- **Plugin units.** Option A gives one `definePlugin` per plugin folder, plus typed registries. → D-07
- **Record provider.** A `RecordsHost` scoped to the app through `createApp(config)`, with no import side effects. You still pick the provider in the UI (A-3). → D-07
- **Auth.** Auth becomes part of the record provider: Convex Auth (A-4), server-side owner scoping, and "signed out" cases in the conformance suite. → D-07, D-16
- **Delete candidates.** `ActionPlugin`, `ContextPanelPlugin`, `panels`, `actions`, `subscribe`, `watchRecords`, `optionsEditor`. → D-07
- **"Add to build".** Ship every datasource type and delete the build-list machinery. → D-12
- **Search-first result.** Build it ourselves; no library fits (recorded 2026-11-22).

## Open questions

- Is Convex Auth acceptable if it requires `ConvexReactClient`? → D-07
- Can a signed-in user still choose browser storage? → D-16

## Corrections to the earlier version

- `Devtools.tsx` does not read plugin panels or actions.
- Three more callers of the provider global exist, in `features/storage`, and there is also the `useActivePlace()` hook.
- Several line numbers were wrong and are fixed above.
- Vitest uses `optionalPlugins({plugins:'all'})` (`vitest.config.ts:25`), not an `includeAll` hook.
