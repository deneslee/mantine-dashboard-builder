# 02 — Research summary (Phase 2)

2026-11-22. Five topic files, each with sources, confidence levels and "what would change this". This page does three things:

- lists where the files agree;
- lists where they **conflict**;
- lists what Phase 3 has to decide.

It does not decide anything.

| File                                             | One-line recommendation                                                                                                                                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [workspace-layout.md](workspace-layout.md)       | Target is Option B, reached through Option A. `apps/{web,relay}` plus `packages/{domain,ui,plugins,convex}`. Packages are JIT TS-source with subpath `exports`. `shell` and `platform` stay in `apps/web`.                                                                                        |
| [app-structure.md](app-structure.md)             | Hybrid tree. Features are organised by file kind first (`api/ components/ hooks/ stores/ utils/`), with screen areas only inside `components/`. Folders are kebab-case. Routes go in `src/routes`. Collision renames ("place" becomes "record provider", `datasources` becomes `connections`, …). |
| [plugin-capabilities.md](plugin-capabilities.md) | Option A: one `definePlugin` per folder plus typed registries, and a `RecordsHost` scoped to the app instance. Auth is part of the record provider, and `subscribe` goes. Every datasource type ships in every build (+6.1 kB gzip, measured), so the build-list machinery is deleted.            |
| [task-runner.md](task-runner.md)                 | `vp run` only. Add no Turborepo, Nx or moon until there is a second app or a need for a shared cache. Fix the cache inputs (`!docs/**`) and get the suite green, so that test results can be cached at all.                                                                                       |
| [tests-lint-ci.md](tests-lint-ci.md)             | Get the baseline green and cut the docs, toolchain and rules tests. Pick each test's environment by file extension. Lint keeps correctness, hooks, compiler and `typeCheck`. One CI workflow, with the deploy gated on it. Pre-commit stays format-only.                                          |

## Where they agree

- **Stage 0 comes before any move.** Get the baseline green: G-035 (doc-link test) and G-036 (POSIX path test). Fix the lint and test cache inputs.
- **The root becomes a workspace root.** `apps/web` and `apps/relay`; the relay depends on a shared package, not on `../../src/core`.
- **No new runner or boundary framework.** Use `package.json` workspace deps between packages and the existing `no-restricted-imports` mechanism inside them.
- **The tooling config that depends on paths is replaced by conventions.** `NODE_TESTS` gives way to environment by extension, or to Vitest projects per package. The lint `layer()` set is reduced and re-keyed.
- **Delete the speculative scaffolding.** That is `ActionPlugin`, `ContextPanelPlugin`, the empty registries and the subscriptions (G-024, G-031).
- **G-030 (add to build).** Two files independently find that the build-list machinery could go: plugin-capabilities measures the cost, and workspace-layout lists it as the move's biggest simplifier.

## Conflicts to settle in Phase 3

| #   | Topic                                 | workspace-layout                                                                                                  | app-structure                                                                                                   | plugin-capabilities / other                                 |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| C1  | **Which packages**                    | `domain`, `ui`, `plugins`, `convex`. `shell` and `platform` stay in the app (they need the router and app types). | `core`, `ui`, `shell`, `platform`, `plugin-api`, `relay-contract`.                                              | —                                                           |
| C2  | **Name of the shared domain package** | `domain`                                                                                                          | `core`                                                                                                          | —                                                           |
| C3  | **Plugin contracts**                  | Inside `packages/plugins/src/contracts/`, guarded by a lint rule                                                  | A separate `plugin-api` package                                                                                 | Contract shape only; no package decision                    |
| C4  | **Relay wire contract**               | Inside `domain`                                                                                                   | A separate `relay-contract` package                                                                             | 01 §1.2 notes `core/relay` is not domain                    |
| C5  | **Layer rules after the move**        | Keep `layer()`, re-keyed, inside packages and the app                                                             | Keep the mechanism, re-keyed                                                                                    | tests-lint-ci: "package boundaries replace the layer rules" |
| C6  | **Feature folder naming**             | —                                                                                                                 | File-kind folders (`components/`, `hooks/`), per D6. It notes that Feature-Sliced Design calls these bad names. | —                                                           |

## Decisions Phase 3 needs (and who answers)

**User:**

1. **"Runtime selection".** Does it mean a deployment picks its backend from a fetched `app-config.json` (no rebuild), or each user picks in the UI? (plugin-capabilities §7 Unresolved #1)
2. **Auth.** Convex Auth, or external OIDC? Can a signed-in user still choose browser storage? (plugin-capabilities #2 and #3)
3. **G-030.** Drop the live-site "add to build" flow, given that every datasource type in every build costs +6.1 kB gzip? Is an allowlist needed?
4. **Drafts with several users** (G-007). Keep them browser-local and keyed by user?
5. **URLs.** Rename user-visible URLs (`/datasources/$id` to `/connections/$connectionId`)? What package scope name?
6. **Storybook tests in CI.** Required or optional? Do any design-token lint rules stay, as warnings? Do `no-explicit-any` and `ban-ts-comment` stay?
7. **Relay image.** Is it deployed anywhere? This decides whether CI builds it.
8. **Scaffolding.** Keep `node-studio`, `explore` and `templates`, or delete them? (G-031)

**Phase 3 (`ecc:council`, then ADRs), settled from evidence:**

- C1 to C5: the package list and names.
- C6: features organised by file kind or by concern.

**A spike, not more research.** These items were unverified in all files and can only be settled by trying them on a branch:

- tsgolint and type-aware lint across workspace packages;
- wildcard `exports` falling back between `.ts` and `.tsx`;
- Convex bundling a TS-source workspace package;
- PostCSS and Mantine CSS from a linked package;
- the Vitest drive-letter path fix on Windows;
- whether `!docs/**` fixes the lint cache miss.

## ECC usage in this phase

- **`ecc:deep-research`:** the workspace-layout agent used it for the plugins question. The other four files were researched with the same tools (Exa, Context7, DeepWiki), with sources and confidence for each finding, but without invoking the skill. That was a deviation from the playbook; it is recorded in memory and will not recur.
- **`ecc:search-first`:** run on the plugin registry (adopt, extend or build). Its result is appended to [plugin-capabilities.md](plugin-capabilities.md) §8.

## Answers (user, 2026-11-22)

| #   | Question                        | Answer                                                         | Effect                                                                                                                                                                                                                   |
| --- | ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Runtime selection               | **The user picks in the UI**                                   | The per-browser choice of record provider remains the main mechanism; today's `record-provider` setting stays. plugin-capabilities §7.2 changes: a fetched deployment config is optional, not the source of the default. |
| 2   | Auth                            | **Convex Auth for now**                                        | Auth stays part of the record provider (plugin-capabilities §7.3). External OIDC is deferred.                                                                                                                            |
| 3   | G-030 "add to build"            | **Undecided**. The user asked what it means; it was explained. | Still open.                                                                                                                                                                                                              |
| 4   | Drafts with several users       | **Stay in the browser, keyed by user**                         | G-007: the draft key gains the user id.                                                                                                                                                                                  |
| 5   | URL renames, package scope      | **Undecided**. Explained to the user.                          | Still open.                                                                                                                                                                                                              |
| 6   | Storybook tests in CI           | **Optional**                                                   | A non-required job (tests-lint-ci §7.5).                                                                                                                                                                                 |
| 7   | Relay image deployed?           | **Not yet**                                                    | CI builds the relay bundle only. A Docker image build is deferred (G-025).                                                                                                                                               |
| 8   | node-studio, explore, templates | **Keep**                                                       | G-031 for these three becomes "keep as stated future work". ActionPlugin, ContextPanelPlugin and `subscribe` are still candidates for deletion.                                                                          |
