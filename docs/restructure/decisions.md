# Decisions

This file is the queue of decisions for the restructure. It owns the _status_ of every decision; the reasoning of an accepted decision lives in its ADR.

**Statuses**

| Status                | Meaning                                                                         |
| --------------------- | ------------------------------------------------------------------------------- |
| `open`                | Not yet discussed                                                               |
| `proposed`            | It has a recommendation, but **not** your approval                              |
| `accepted → ADR-NNNN` | You approved it, and the ADR in [../adr/](../adr/README.md) holds the reasoning |
| `rejected`            | Turned down, with a one-line reason                                             |
| `deferred`            | Postponed, with a one-line reason                                               |

A recommendation comes from research or from an agent (Claude, ChatGPT, ECC). It is never a decision. Only you move an entry to `accepted`.

**Entry format.** Each entry gives:

- the question;
- the evidence, as links;
- the options;
- the recommendation, with who made it;
- the status;
- what it blocks.

The P1 entries (D-01, D-02, D-03, D-04, D-11, D-13) are complete. The others are thin on purpose: their options and recommendations are filled in, with focused research, when their phase starts.

## Your answers so far (requirements, not yet ADRs)

These came from you on 2026-11-21 and 2026-11-22. Each is a requirement. An ADR is written only when you ask for one.

| #    | Topic                           | Your answer                                                                                        |
| ---- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| A-1  | Second app                      | None now, but structure the repo monorepo-style (`apps/`, `packages/`). Packages are not published |
| A-2  | Users                           | Several users, no live interaction between them                                                    |
| A-3  | Record provider choice          | The user picks it in the UI, and every capability is included at build time                        |
| A-4  | Auth                            | Convex Auth for now                                                                                |
| A-5  | Drafts                          | Kept in the browser, keyed by user                                                                 |
| A-6  | Storybook tests in CI           | Optional                                                                                           |
| A-7  | Relay image                     | Not deployed; build the bundle only                                                                |
| A-8  | node-studio, explore, templates | Keep                                                                                               |
| A-9  | Credentials                     | "Probably" stay in the browser vault (see D-17)                                                    |
| A-10 | Order of work                   | Restructure, then tooling, then simplification, then CI, then tests (U10); see D-01                |
| A-11 | Tests                           | Shrink the suite to what is useful (U8); see D-11                                                  |
| A-12 | Structure references            | Do not copy Mantine's repo structure; look at TanStack Start, Nx and Turborepo                     |

The other original requirements (U7, U9, U11) and ChatGPT's direction (D1–D6, a proposal only) are listed in [research/current-state.md](research/current-state.md) §C.

## Queue

### D-01 Green baseline before the moves?

- **Question:** should the red tests and the lint cache be fixed _before_ any folder move? That changes your order A-10.
- **Evidence:** [tests-lint-ci](research/tests-lint-ci.md) "Measured"; [task-runner](research/task-runner.md); [workspace-layout](research/workspace-layout.md).
- **Options:**
  - (a) baseline first, then moves;
  - (b) keep A-10 and fix tests in the tests phase.
- **Recommendation (research):** (a). A move can only be shown to keep behaviour if the checks pass before it.
- **Status:** `proposed`
- **Blocks:** phase order.

### D-02 How heavy is the per-step workflow?

- **Question:** which of ECC's ten compliance suggestions apply? They were: per-step brief, model tier, rollback and branch; one council run per conflict; a manual-step list; one deletion per cleanup run; `git-workflow`; `safety-guard`; `module-regression`.
- **Evidence:** [research/ecc.md](research/ecc.md) lists what each ECC skill requires and the ten suggestions; [workflow.md](workflow.md) is the proposed routine.
- **Options:**
  - (a) all ten;
  - (b) scale with risk: a spec, a verification step and a rollback note always, with council, impact files and regression ledgers only for high-risk steps;
  - (c) minimal.
- **Recommendation (Claude):** (b).
- **Status:** `proposed`
- **Blocks:** first implementation step.

### D-03 Target workspace layout

- **Question:** is the target `apps/{web,relay}` plus `packages/*`, reached by moving the apps first and extracting packages afterwards?
- **Evidence:** [workspace-layout](research/workspace-layout.md).
- **Options:**
  - (a) apps first (`apps/web`, `apps/relay`, Convex as a package), then shared code extracted into `packages/*`;
  - (b) apps only: `apps/web` and `apps/relay`, no shared packages yet;
  - (c) keep today's single-package layout.
- **Recommendation (research):** (a).
- **Status:** `proposed`
- **Blocks:** the restructure phase.

### D-04 Package set and names

- **Question:** which packages exist, and what are they called?
- **Sub-questions:**
  - `domain` or `core`?
  - Plugin contracts inside `plugins`, or their own package?
  - The relay wire contract inside `domain`, or separate?
  - `packages/plugins` as one package, or one per kind?
  - Where do `src/utils` and `core/build` go?
- **Evidence:** [workspace-layout](research/workspace-layout.md), [app-structure](research/app-structure.md).
- **Options:**
  - (a) `domain`, `ui`, `plugins`, `convex`;
  - (b) (a) plus `shell`, `platform`, `plugin-api`, `relay-contract`.
- **Recommendation (research):** the two research files disagree. Settle it with one `ecc:council` run.
- **Status:** `open`
- **Blocks:** package extraction.

### D-05 App folder organisation

- **Question:** how are folders inside `apps/web` organised?
- **Sub-questions:**
  - Features grouped by file kind (`components/`, `hooks/`) or by concern?
  - Routes in `src/app/routes` or `src/routes`?
  - Kebab-case folder names?
  - The renames that fix name clashes (see D-18)?
- **Evidence:** [app-structure](research/app-structure.md). Your direction D6 points to file-kind folders.
- **Options:** given in app-structure.
- **Recommendation (research):** file kind first, with routes in `src/routes`.
- **Status:** `open`
- **Blocks:** the app-folder steps.

### D-06 Boundary and layer rules after the move

- **Question:** should the `layer()` lint rules be re-keyed to the new paths, or replaced by package boundaries? Which of today's lint-enforced rules stay?
- **Evidence:** [tests-lint-ci](research/tests-lint-ci.md), [carry-over](research/carry-over.md) "Engineering rules".
- **Options:**
  - (a) re-key `layer()`;
  - (b) package deps plus a few `no-restricted-imports` rules;
  - (c) `eslint-plugin-boundaries`.
- **Recommendation (research):** (b), then (c) only if needed.
- **Status:** `open`
- **Blocks:** the tooling phase.

### D-07 Plugin model

- **Questions:**
  - One `definePlugin` per plugin folder?
  - A records host scoped to the app instance, instead of a module-global provider?
  - Auth as part of the record provider?
  - Delete the unused `ActionPlugin`, `ContextPanelPlugin` and `subscribe`?
  - Keep `optionsEditor`?
- **Evidence:** [plugin-capabilities](research/plugin-capabilities.md).
- **Options:** given in plugin-capabilities.
- **Recommendation (research):** its Option A.
- **Status:** `proposed`
- **Blocks:** the functional-redesign phase.

### D-08 Task runner

- **Question:** use `vp run` only, or add Turborepo, Nx or moon?
- **Evidence:** [task-runner](research/task-runner.md).
- **Recommendation (research):** `vp run` only, until there is a second app or a shared cache is needed.
- **Status:** `proposed`
- **Blocks:** nothing urgent.

### D-09 Test and lint scope

- **Questions:**
  - Pick each test's environment by file extension?
  - Cut the change-detector tests, `rules.test.ts`, `docs.test.ts` and `toolchain.test.ts`?
  - Which lint rule set?
  - Do any design-token rules stay, as warnings?
  - Do `no-explicit-any` and `ban-ts-comment` stay?
- **Evidence:** [tests-lint-ci](research/tests-lint-ci.md).
- **Recommendation (research):** correctness, hooks, Compiler rules and type checking. Drop the style rules. Environment by extension.
- **Status:** `open`
- **Blocks:** the tooling and tests phases.

### D-10 CI shape

- **Question:** one workflow, an aggregator check, and the deploy gated on CI and built from its artifact?
- **Evidence:** [tests-lint-ci](research/tests-lint-ci.md), A-6, A-7.
- **Recommendation (research):** yes. Add the convex project and the relay bundle build to CI; stories are an optional job.
- **Status:** `proposed`
- **Blocks:** the CI phase.

### D-11 Coverage target

- **Question:** adopt ECC's 80 % coverage target?
- **Evidence:** ECC's `orch-*` and `tdd` skills default to 80 %. Your A-11 says shrink the suite.
- **Options:**
  - (a) 80 % on changed code;
  - (b) no number: every changed behaviour has a test;
  - (c) no target.
- **Recommendation (Claude):** (b). Tell ECC commands to skip the 80 % gate.
- **Status:** `open`
- **Blocks:** first `orch-*` run.

### D-12 "Add to build" (G-030)

- **Question:** the live site can commit `plugins.json` with a GitHub token and then rebuild. Keep this, or ship every datasource type in every build?
- **Evidence:** [plugin-capabilities](research/plugin-capabilities.md). Every type in every build was measured at +6.1 kB gzip.
- **Options:** four alternatives, listed in plugin-capabilities.
- **Recommendation (research):** drop the flow and ship every type.
- **Status:** `open`
- **Blocks:** the plugin steps, and how path-coupled the move is.

### D-13 URLs and package scope

- **Question:** rename user-visible URLs (`/datasources/$id` to `/connections/$connectionId`)? What is the package scope?
- **Evidence:** [app-structure](research/app-structure.md). Renaming URLs breaks bookmarks and shared links; the scope appears only in import paths, because packages are not published (A-1).
- **Options:**
  - URLs: (a) rename to match the new names, or (b) keep today's.
  - Scope: (a) `@dashboard-builder`, (b) `@repo` (the Turborepo convention), or (c) another name.
- **Recommendation (Claude):** rename the URLs (`/connections/…`) and use `@dashboard-builder`.
- **Status:** `open`
- **Blocks:** package extraction (scope), app renames (URLs).

### D-14 One chart widget or two?

- **Question:** keep both the ECharts and the Recharts widgets?
- **Evidence:** [carry-over](research/carry-over.md) "Measurements"; [current-state](research/current-state.md) G-028.
- **Recommendation:** none yet.
- **Status:** `open`
- **Blocks:** the functional-redesign phase.

### D-15 `/debug` in production

- **Question:** ship `/debug`, put it behind a gate, or drop it?
- **Evidence:** [current-state](research/current-state.md) G-022.
- **Status:** `open`
- **Blocks:** the functional-redesign phase.

### D-16 Connections, vault and storage choice with several users

- **Questions:**
  - Do connections and vault entries become records, or stay local?
  - Can a signed-in user still choose browser storage?
- **Evidence:** [current-state](research/current-state.md) G-007; [plugin-capabilities](research/plugin-capabilities.md).
- **Status:** `open`
- **Blocks:** auth and drafts work.

### D-17 Credential model

- **Question:** you said credentials "probably" stay in the browser vault. Confirm this, then document and harden it, including relay scrubbing.
- **Evidence:** [current-state](research/current-state.md) G-005, G-027.
- **Status:** `open`
- **Blocks:** security hardening.

### D-18 Shared vocabulary

- **Question:** one term has several names today: place, storage, record provider (and datasource vs connection). Write a glossary? ECC's `context-and-decisions` asks before creating a `CONTEXT.md`.
- **Evidence:** [app-structure](research/app-structure.md), [plugin-capabilities](research/plugin-capabilities.md).
- **Options:**
  - (a) a short glossary section in [research/current-state.md](research/current-state.md);
  - (b) a `CONTEXT.md`.
- **Recommendation (Claude):** (b), once D-05 and D-07 settle the names.
- **Status:** `open`
- **Blocks:** the renames.
