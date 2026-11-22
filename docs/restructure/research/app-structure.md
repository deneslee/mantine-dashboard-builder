# App source structure (research for ADR-0004, ADR-0005, ADR-0013, ADR-0018)

**Research for:** [ADR-0004](../../adr/0004-package-set-and-names.md), [ADR-0005](../../adr/0005-app-folder-organisation.md), [ADR-0013](../../adr/0013-urls-and-package-scope.md), [ADR-0018](../../adr/0018-shared-vocabulary.md).

Last verified: commit `4550705`, 2026-11-22. Repo facts were re-checked against the code. External claims carry the source the original research cited; they were not re-fetched.

## Question

Inside a future `apps/web/src`, where does code live, and what moves to `packages/`? This covers feature layout, routes, naming, and renames.

## Repo facts (verified)

| Fact                                                                                                                                                                         | Evidence                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| The routes directory is overridden to `src/app/routes`, and the generated tree goes to `src/app/routeTree.gen.ts`                                                            | `vite.config.ts:109-110`                          |
| The routes are dashboards, datasources, integrations, storage, explore, templates, debug and settings. Files prefixed with `-` are in use, and there are no pathless layouts | glob `src/app/routes/**`                          |
| `$id.tsx` holds `beforeLoad`, `loader` and `getActivePlace()`. Of its 13 imports, 8 come from `features/dashboards`                                                          | `src/app/routes/dashboards/$id.tsx:1-13,19,34,38` |
| `app/recordSync.ts` imports only dashboard modules and `activeRecordProvider`                                                                                                | `src/app/recordSync.ts:2-4`                       |
| `app/storageCollections.ts` is where dashboards meet storage, as its own comment says                                                                                        | `src/app/storageCollections.ts:1-9`               |
| No feature imports another feature through its alias in non-test code                                                                                                        | grep `src/features`                               |
| **26 non-test feature files import plugin contracts directly** (`@/plugins/{usePlugins,WidgetPlugin,DatasourcePlugin,OptionalPlugin,connectionDatasource}`)                  | grep `src/features`                               |
| Lint lists barrels (`@/shell/navbar`, `@/lib/vault`) and the `layer('app', …)` rule, and ties `no-datasource-query` to `dashboardQueries.ts`                                 | `oxlint.config.ts:7-24,52,167,199,265`            |

## External evidence (cited by the original research, not re-fetched)

| Claim                                                                               | Source                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------- |
| bulletproof-react: feature folders, no cross-feature imports, lint-enforced         | github.com/alan2207/bulletproof-react       |
| TanStack Router: `src/routes` default, thin route files, `-` prefix, code splitting | tanstack.com/router docs                    |
| Feature-Sliced Design calls `components/` and `hooks/` folders an anti-pattern      | feature-sliced.design/docs/reference/layers |
| Nx library types and module boundaries                                              | nx.dev/docs/kb/project-dependency-rules     |
| Windows case-only renames need two steps in git                                     | git-scm.com (a risk, not a repo fact)       |

**Secondary sources:** TanStack claims TS-4 and TS-8 rest on a DeepWiki search result.

## Proposals (not decided)

- **Feature folders.** Group each feature by file kind first (`api/`, `components/`, `hooks/`, `stores/`, `utils/`), adding areas only inside `components/` once it grows past ~12 files. → ADR-0005
- **Routes.** Move them to `src/routes`, the TanStack default, and keep them thin. → ADR-0005
- **Glue modules.** Move `recordSync` into `features/dashboards`; keep `storageCollections` as app composition.
- **Naming.** Kebab-case folders, PascalCase component files kept. → ADR-0005
- **Collision renames.** "place" becomes record provider, `features/datasources` becomes `features/connections`, and `features/storage` becomes `record-storage`. → ADR-0005, ADR-0018
- **Packages.** The research proposes `packages/{core,ui,shell,platform,plugin-api,relay-contract}`. This conflicts with [workspace-layout](workspace-layout.md). → ADR-0004
- **Capability catalog.** Move `apps/docs` to `docs/catalog/`. → P4 (G-033)

## Open questions

- Package scope name, and whether user-visible URLs are renamed. → ADR-0013
- Is file-name case enforced by lint, or left to review?
- Is your D6 direction (`components/` and `hooks/` folders) open to revision, given the FSD criticism? → ADR-0005

## Corrections to the earlier version

- The import counts for `$id.tsx` were wrong: it has 8 imports from `features/dashboards` out of 13, plus `core/errors` and TanStack.
- The direct coupling between features and plugin contracts, 26 files (G-009), was missing.
- Not re-counted, so unverified: "185 PascalCase files" and "33 single-word names".
