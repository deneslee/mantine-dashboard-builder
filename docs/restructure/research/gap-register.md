# Gap register

**Research for:** the phase plan. Every gap is assigned to a phase, or deferred with a reason.
**Question it answers:** what is wrong or missing today, and which phase fixes it?
**Last verified:** commit `4550705`, 2026-11-22.

ECC's `brownfield-retrospective` skill calls this file `gap-register.md`. The facts behind it are in [baseline-audit.md](baseline-audit.md).

Severity runs from P0 (highest) to P3. Status: **C** means confirmed at `4550705`; **ch** means confirmed but changed; **nr** means not re-checked.

| ID    | Gap                                                                                                    | Sev            | Status       | Phase                                        |
| ----- | ------------------------------------------------------------------------------------------------------ | -------------- | ------------ | -------------------------------------------- |
| G-001 | Storage, place and record provider are three names for one concept                                     | P2             | C            | [P4](../phases/P4-restructure.md)            |
| G-002 | "Plugin" means five things; `OptionalPlugin` covers datasource types only                              | P1             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-003 | The layout was re-decided about 6 times; the reasons survive only in archived docs and comments        | P1             | nr           | [P9](../phases/P9-docs-finish.md)            |
| G-004 | No identity, auth or ownership: Convex is public and the user is a placeholder                         | P0 if deployed | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-005 | The browser holds DB connection strings and sends them on every call; there is one shared bearer token | P1             | nr           | [P6](../phases/P6-functional-redesign.md)    |
| G-006 | Only record storage is a selectable capability                                                         | P2             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-007 | Drafts, connections and the vault bypass the record provider                                           | P2             | nr           | [P6](../phases/P6-functional-redesign.md)    |
| G-008 | `app/` is flat and mixes four jobs                                                                     | P3             | C            | [P4](../phases/P4-restructure.md)            |
| G-009 | Contracts and implementations share `src/plugins`; the app depends on a feature store                  | P2             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-010 | The platform runtime lives in `lib/` as global state, with duplicated store code                       | P2             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-011 | Modules have side effects at import time                                                               | P2             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-012 | The relay depends on `src/core` by path                                                                | P2             | C            | [P4](../phases/P4-restructure.md)            |
| G-013 | Feature folders are organised differently from one another                                             | P3             | nr           | [P4](../phases/P4-restructure.md)            |
| G-014 | `isLoopback` is implemented twice (`relay/src/env.ts:23`, `relayFields.ts:9`)                          | P3             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-015 | `SqlServerQuery` and `MongoQuery` share a name with different meanings                                 | P3             | nr           | [P6](../phases/P6-functional-redesign.md)    |
| G-016 | `dashboardApi.ts` mixes jobs; `DashboardPage` has cyclomatic complexity 30                             | P3             | nr           | [P6](../phases/P6-functional-redesign.md)    |
| G-017 | Legacy migration is duplicated and dated for deletion                                                  | P3             | ch (4 files) | [P6](../phases/P6-functional-redesign.md)    |
| G-018 | The app identity is hard-coded (`Brand.tsx:6`, storage prefix)                                         | P2             | C            | deferred (see [phases](../phases/README.md)) |
| G-019 | Tooling config is keyed to folder paths                                                                | P1             | C            | [P4](../phases/P4-restructure.md)            |
| G-020 | Checks are slow, and the lint cache is invalidated by docs changes                                     | P2             | nr           | [P2](../phases/P2-green-baseline.md)         |
| G-021 | `src/core` holds non-domain `build/` and `relay/` code                                                 | P3             | nr           | [P4](../phases/P4-restructure.md)            |
| G-022 | `/debug` is routed with no production gate                                                             | P2             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-023 | The provider contract has a single-string setup and full-read list, and duplicates `MAX_RECORDS`       | P2             | C            | deferred (see [phases](../phases/README.md)) |
| G-024 | Subscriptions are not wired (`watchRecords` is unused)                                                 | P3             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-025 | CI skips the stories, the convex project and the relay build; Pages is not gated                       | P2             | C            | [P7](../phases/P7-ci.md)                     |
| G-026 | The pre-commit hook never blocks                                                                       | P3             | C            | [P5](../phases/P5-tooling.md)                |
| G-027 | Relay scrubbing is pattern-based                                                                       | P3             | nr           | [P6](../phases/P6-functional-redesign.md)    |
| G-028 | Two chart stacks ship (ECharts and Recharts)                                                           | P3             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-029 | `react-force-graph-2d` has no importer (planned for the node-studio Explore view; see carry-over)      | P3             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-030 | "Add to build" machinery exists for 4 unlisted bundles                                                 | P2             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-031 | Speculative scaffolding has no consumer                                                                | P3             | C            | [P6](../phases/P6-functional-redesign.md)    |
| G-032 | Tests are slow, and some test docs or packages rather than behaviour                                   | P2             | nr           | [P5](../phases/P5-tooling.md)                |
| G-033 | `apps/docs` is not an app                                                                              | P3             | C            | [P4](../phases/P4-restructure.md)            |
| G-034 | The Renovate cap `~0.152.0` contradicts the `0.156.0` pin                                              | P3             | C            | [P2](../phases/P2-green-baseline.md)         |
| G-035 | Doc links point at the archived `docs/target`                                                          | P1             | nr           | [P2](../phases/P2-green-baseline.md)         |
| G-036 | `plugins.config.test.ts:74` hard-codes a POSIX path, so it fails on Windows                            | P1             | C            | [P2](../phases/P2-green-baseline.md)         |
