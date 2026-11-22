# Phases

This file owns the phase order and the status of each step. The current phase and the next action are on the [start page](README.md); how to run a step is in [workflow.md](workflow.md).

**Status:** this phase list is a proposal and is not yet approved (P0).

- Steps are written only when their phase is next. Each step gets a small spec in [specs/](specs/README.md) with focused research, a scope, a verification and a rollback, sized to its risk.
- The "Candidate scope" column lists known gaps (G-rows in [research/current-state.md](research/current-state.md) §B). It is not a commitment.

**Order.** Phases run in order. Restructuring (P4) is kept apart from functional redesign (P6): P4 moves code without changing behaviour. P2 (green baseline) before P4 is what D-01 proposes, and it changes your order U10.

| #   | Phase                                | Goal                                                                                                                      | Needs decisions                    | Candidate scope                                                                                                                     | Status        |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| P0  | Planning system review               | You approve this docs set and the [cleanup list](cleanup.md); then old docs deleted and `.governance/docs-map.json` added | —                                  | —                                                                                                                                   | **in review** |
| P1  | First decisions                      | Settle what blocks P2–P4                                                                                                  | D-01, D-02, D-03, D-04, D-11, D-13 | —                                                                                                                                   | not started   |
| P2  | Green baseline                       | All checks pass on Windows; docs changes no longer invalidate the cache                                                   | D-01, D-09 (partly)                | G-036, G-035, G-034, G-020 (cache inputs, `GITHUB_*` env)                                                                           | not started   |
| P3  | Spike (throwaway branch)             | Answer the unverified items before moving code                                                                            | D-03                               | the list below                                                                                                                      | not started   |
| P4  | Restructure (moves and renames only) | New layout, same behaviour, same tests passing                                                                            | D-03, D-04, D-05, D-13, D-18       | G-012, G-021, G-008, G-013, G-033, G-001 (renames), G-019 (re-key)                                                                  | not started   |
| P5  | Tooling                              | Lighter lint, package boundaries, faster tests; library skills copied in (U11)                                            | D-06, D-08, D-09                   | G-019, G-020, G-026, G-032 (environment)                                                                                            | not started   |
| P6  | Functional redesign                  | Plugin model, records host, auth and drafts per user, credential hardening, deletions                                     | D-07, D-12, D-14, D-15, D-16, D-17 | G-002, G-004, G-005, G-006, G-007, G-009, G-010, G-011, G-014, G-015, G-016, G-017, G-022, G-024, G-027, G-028, G-029, G-030, G-031 | not started   |
| P7  | CI                                   | One workflow, one required check, deploy gated on CI                                                                      | D-10                               | G-025                                                                                                                               | not started   |
| P8  | Tests                                | Suite cut to what is useful, within the time budgets                                                                      | D-09, D-11                         | G-032                                                                                                                               | not started   |
| P9  | Docs finish                          | Final `AGENTS.md`, ADRs complete, docs-map updated, re-audit (`audit-docs.py`)                                            | —                                  | G-003, G-035                                                                                                                        | not started   |

**Deferred, with reasons:**

- **G-023** (structured provider config): wait until a second backend type needs it.
- **G-018** (app identity): there is no second app (A-1).

## P3 spike items (unverified everywhere)

Each item gets a yes or no. A "no" reopens D-03 or D-04.

- type-aware lint (tsgolint) across workspace packages;
- wildcard `exports` across mixed `.ts` and `.tsx` files;
- Convex bundling a TS-source workspace package;
- PostCSS and Mantine CSS from a linked package;
- the Vitest drive-letter path on Windows;
- whether excluding `docs/**` from the cache inputs fixes the lint cache miss.

## Steps

Steps are added here once a phase starts, one row per independently reviewable change.

| Step | Spec | Status |
| ---- | ---- | ------ |
| —    | —    | —      |
