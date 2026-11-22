# 04 — Restructure plan

2026-11-22 · `ecc:blueprint`, reviewed by agent `ecc:architect`. Status: **draft**, not approved.

**Inputs, and only these:**

- [01-current-state.md](01-current-state.md): facts, the gap register (G-xxx) and the answers in §3.1.
- [02-research/README.md](02-research/README.md): summary, conflicts C1–C6 and answers.
- The five topic files in [02-research/](02-research/).
- [restructure-playbook.md](../restructure-playbook.md).

**Rules:**

- Nothing is planned that the inputs do not contain.
- Research recommendations are **draft ADRs** until the user accepts them in S0. Open items stay open until S0.
- The stage order is U10: restructure, tooling, simplification, CI, tests. Three additions are made:
  - **S1** (green baseline) comes before the moves. Sources: README "Stage 0 comes before any move"; tests-lint-ci §6.4 ("Do it now"); workspace-layout §6 point 1. **This changes U10 and needs the user's OK.**
  - **S1b** (spike) settles the README's unverified list.
  - **S8** (docs reset) is playbook Phase 6.

Detail goes in [04-plan/](04-plan/) only where a stage needs it.

## Stages

| #   | Stage                                                              | Scope (refs)                                                                                                                                                                                                                                                                                                                                         | ECC                                                                                                                                                                                    | Exit criteria                                                                                                                   |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| S0  | **Decisions** (playbook Phase 3)                                   | Conflicts, open questions, and research recommendations as draft ADRs (G-003) → [S0-decisions.md](04-plan/S0-decisions.md)                                                                                                                                                                                                                           | `ecc:council`<br>`ecc:architecture-decision-records` (writes to `03-decisions/`)<br>`ecc:context-and-decisions` (glossary)<br>`ecc:intent-driven-development`<br>agent `ecc:architect` | Every S0 row is accepted, or deferred with a reason                                                                             |
| S1  | **Green baseline** (no moves)                                      | G-035, G-036, G-034. Cut `lint/docs.test.ts`, `lint/toolchain.test.ts`, and `lint/rules.test.ts` with its fixtures; move compiler case 2 to a script. Choose the test environment by file extension instead of `NODE_TESTS` (G-019). Add `'!docs/**'` to the cache inputs (G-020). Refs: tests-lint-ci §6.4 and §7 points 1–2; task-runner §5 step 1 | `ecc:change-impact`<br>`/ecc:orch-refine-code`<br>`ecc:verification-loop`                                                                                                              | All `check:*` green on Windows. A docs-only change gives a cache hit, or the S1b result says why not                            |
| S1b | **Spike** (throwaway branch)                                       | The README list "A spike, not more research", including tsgolint across packages and whether `!docs/**` is enough (and whether fmt should get the same exclusion)                                                                                                                                                                                    | `ecc:verification-loop`                                                                                                                                                                | Each item answered yes or no in an ADR note. A "no" re-opens the matching S0 row (workspace-layout §6 "What would change this") |
| S2  | **Restructure: workspace** (moves only)                            | workspace-layout §6 point 2 (Option A); names per C2 and C4 → [S2-S3-restructure.md](04-plan/S2-S3-restructure.md)                                                                                                                                                                                                                                   | `ecc:change-impact` (before and after)<br>`/ecc:orch-refine-code`<br>`/ecc:orch-review`                                                                                                | Same tests pass; equivalent build. Path-keyed config is re-keyed in the same commit (workspace-layout §5)                       |
| S3  | **Restructure: packages and app folders** (moves and renames only) | workspace-layout §6 point 3; app-structure §5; packages per C1–C4; features per C6; routes per C7 → [S2-S3-restructure.md](04-plan/S2-S3-restructure.md)                                                                                                                                                                                             | Same as S2, one PR per package or area                                                                                                                                                 | As S2. Persisted localStorage keys are unchanged                                                                                |
| S4  | **Tooling**                                                        | task-runner §5 steps 2 and 4. tests-lint-ci §6.2 rule set, adjusted by C5 and the S0 lint answers; `layer()` and `no-datasource-query` per C5 (needs the S1b tsgolint result). Add `GITHUB_*` to the `check:build` `cache.env` (tests-lint-ci §7 point 3)                                                                                            | `/ecc:orch-refine-code`<br>`ecc:verification-loop`                                                                                                                                     | The rule set matches the S0 ADR. Lint and test times re-measured against 01 §1.10                                               |
| S5  | **Simplification** (functional changes)                            | plugin-capabilities §5 and §7 (subject to their S0 ADRs); G-030 per S0; auth and drafts per the answers; credential hardening (G-005, G-027) → [S5-simplification.md](04-plan/S5-simplification.md)                                                                                                                                                  | `/ecc:refactor-clean`<br>`/ecc:orch-change-feature`<br>`/ecc:orch-refine-code`<br>`ecc:security-review`<br>agent `ecc:code-simplifier`                                                 | Each closed G-row has evidence. The conformance suite covers the new auth cases                                                 |
| S6  | **CI**                                                             | tests-lint-ci §6.3 and §3.7: one workflow, an aggregator check, deploy gated on CI and built from the artifact, keeping today's deploy behaviour. Stories job optional (answer 6). Relay bundle build, no image (answer 7). task-runner §5 step 3: Actions cache restore, kept only if measured faster                                               | `ecc:verification-loop`<br>`/ecc:code-review`                                                                                                                                          | `github-pages.yaml` removed; the deploy needs CI; one required check                                                            |
| S7  | **Tests**                                                          | tests-lint-ci §6.1 tiers and budgets; cut change detectors; merge RTL tests into story plays once the story set settles (§6.4)                                                                                                                                                                                                                       | `ecc:test-collaboration`<br>`ecc:react-testing`<br>`ecc:verification-loop`                                                                                                             | The §6.1 budgets are met, or the gap is recorded                                                                                |
| S8  | **Docs reset** (playbook Phase 6)                                  | Real `AGENTS.md` and `CLAUDE.md` (the audit versions are retired); accepted ADRs move to `docs/adr/`; local library skills copied in (U11)                                                                                                                                                                                                           | `ecc:living-docs-governance`<br>`ecc:docs-governance`                                                                                                                                  | Docs describe the new tree; doc links resolve                                                                                   |

## Order

```
S0 ──────────┐
S1 ── S1b ───┴── S2 ─ S3 ─ S4 ─ S5 ─ S6 ─ S7 ─ S8
```

- S1 does not depend on S0 and can run alongside it.
- S2 needs both S0 and S1b.
- From S2 on, the stages are serial: each one changes paths the next one reads.

## Every step

- **Checks:** `vp run check:lint`, `check:css`, `check:fmt`, `check:unit` and `check:build`. Add `check:stories` once it runs as an optional CI job.
- **Size:** one PR-sized change per step. A red check blocks the next step.
- **Before and after each step:**
  - `ecc:change-impact` writes `impacts/<step>.md`;
  - `/ecc:orch-review` runs before the commit;
  - the step names the G-rows it closes in the 01 §2 register.
- **Changing the plan:** a split, skip or re-order needs a note here and the user's OK.
- **At execution time:** `ecc:plan-orchestrate` prints the command for each step.
