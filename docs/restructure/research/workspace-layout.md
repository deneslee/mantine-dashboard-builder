# Workspace layout and package boundaries

Last verified: commit `4550705`, 2026-11-22. Repo facts were re-checked against the code. External claims carry the source the original research cited; they were not re-fetched.

## Question

How should the repo be laid out as an `apps/` + `packages/` workspace, and where should package boundaries sit? (Packages are not published; user, 2026-11-22.)

## Repo facts (verified)

| Fact                                                                                                                                | Evidence                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Root `package.json` is the SPA `dashboard-builder` (private, ESM); `relay/` is `dashboard-relay`                                    | `package.json:2-5`, `relay/package.json:2`                                                            |
| The workspace lists only `relay`                                                                                                    | `pnpm-workspace.yaml:1-3`                                                                             |
| `@/*` maps to `./src/*`; Vite and Vitest resolve tsconfig paths                                                                     | `tsconfig.app.json:23-24`, `vite.config.ts:132`, `vitest.config.ts:26`                                |
| `@/core` is imported by 113 files                                                                                                   | grep over `src/`                                                                                      |
| The relay imports `src/core` by relative path (16 imports in 7 files) and has no package dependency on it                           | `relay/src/*.ts`, `relay/package.json:12-24`                                                          |
| The relay Dockerfile copies the root manifests and `src/core` into the image                                                        | `relay/Dockerfile:9,12-15`                                                                            |
| `convex/` sits at the root with no `convex.json`; `_generated` is committed; `convex` is a root dependency                          | `git ls-files convex/_generated`, `package.json:82`                                                   |
| `convexProvider.ts` imports `../../../../convex/_generated/api`                                                                     | `src/plugins/recordProviders/convex/convexProvider.ts:2`                                              |
| `convex/records.test.ts` imports from `src/core` and `src/testing`                                                                  | `convex/records.test.ts:4,5,12`                                                                       |
| `layer()` keys lint rules to `src/<dir>/**` (9 layers); the relay rule bans `**/src/<dir>/**` and `@/*`                             | `oxlint.config.ts:94-107, 222-297`                                                                    |
| Path-keyed config that a move must re-key: `NODE_TESTS` globs, the routes directory, the `plugins.json` path, the Pages `dist` path | `vitest.config.ts:8-20`, `vite.config.ts:109-110`, `githubBuildList.ts:15`, `github-pages.yaml:47-49` |
| `plugins.config.ts` embeds the `GITHUB_REPOSITORY`, `GITHUB_REF_NAME` and `GITHUB_SHA` variables                                    | `plugins.config.ts:110,111,221`                                                                       |

## External evidence (cited by the original research, not re-fetched)

| Claim                                                                                     | Source                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/` + `packages/`, one level deep; declare each dependency where it is used           | turborepo.com docs: structuring-a-repository, managing-dependencies |
| Just-in-time internal packages: export `.ts` source, no `paths`, no build step            | turborepo.com/docs/core-concepts/internal-packages                  |
| Vite treats linked workspace deps as source                                               | vite.dev/guide/dep-pre-bundling                                     |
| Vite+ `vp dev`/`build` never act on the workspace root; `defaultPackage`                  | viteplus.dev/guide/monorepo                                         |
| Nx: avoid "dump" projects; library types feature/ui/data-access/util                      | nx.dev blog and kb pages                                            |
| TanStack Router monorepo example keeps the router in its own package for `Register` types | github.com/TanStack/router examples/react/router-monorepo-simple    |
| `convex.json` beside `package.json`; commit `_generated`                                  | docs.convex.dev/production/project-configuration                    |
| tsdown bundles imported devDependencies; `pnpm deploy` ignores the global virtual store   | tsdown.dev, pnpm.io/cli/deploy                                      |
| oxlint lacks `no-restricted-paths`; `eslint-plugin-boundaries` runs under `jsPlugins`     | oxc issue 1117, jsboundaries.dev                                    |

**Hypotheses (no source):**

- Per-plugin packages only pay off for distributed plugins.
- Wildcard `exports` work across mixed `.ts` and `.tsx` files.

## Proposals (not decided; see [decisions.md](../decisions.md))

- **Target layout.** `apps/web` and `apps/relay`, plus `packages/{domain,ui,plugins,convex}`. `shell`, `features` and `app` stay in `apps/web`. Get there by moving the apps first, then extracting packages. → D-03, D-04
- **Package style.** Just-in-time TS-source packages, `workspace:*`. The relay takes the shared package as a bundled devDependency.
- **Boundaries.** Use `package.json` deps first, then re-keyed `no-restricted-imports`. Add `eslint-plugin-boundaries` only if needed. → D-06

## Open questions

- Is `packages/plugins` one package or split by kind? → D-04
- Do `src/utils` and `core/build` go with the domain package or with the app? → D-04
- Does the capability catalog (`apps/docs`) stay a workspace app or become a plain folder? → [cleanup.md](../cleanup.md)

## Corrections to the earlier version

- The baseline commit label `a8d5c57` was stale.
- The Dockerfile also copies the root manifests (`:9`), so it is coupled to more than `src/core`.
- The original did not say that `convex` is a root dependency; moving it to its own package splits that dependency.
