# ECC: artifacts, gates and the compliance suggestions (research for ADR-0002, ADR-0011)

**Research for:** [ADR-0002](../../adr/0002-per-step-workflow-weight.md), [ADR-0011](../../adr/0011-coverage-target.md).

Last verified: 2026-11-22, against the installed ECC 2.2.3 (`~/.claude/plugins/cache/ecc/ecc/2.2.3/{skills,commands}`). This is a primary source: each skill's own `SKILL.md` or command file.

## Question

Where does each ECC skill write its output, what approval does it ask for, and which of its rules does the [workflow](../workflow.md) adopt?

## Verified (ECC source files)

| Skill / command                 | Default output                                                         | Gates and rules                                                                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blueprint`                     | `plans/<name>.md`                                                      | Each step gets a brief, verification, exit criteria, model tier and rollback. An adversarial review comes before it is final. There is no user-confirm gate                                                                                   |
| `/plan`                         | `.claude/plans/<name>.plan.md`, but only in PRD mode; otherwise inline | Waits for an explicit confirm before any code is written                                                                                                                                                                                      |
| `/plan-prd`                     | `.claude/prds/<name>.prd.md`                                           | One gate per phase. It never invents requirements (`TBD — needs validation`)                                                                                                                                                                  |
| `plan-canvas`                   | Writes nothing; opens a local `.md` or `.html` file for annotation     | Its approve verdict counts as the `/plan` confirm                                                                                                                                                                                             |
| `architecture-decision-records` | `docs/adr/NNNN-*.md` plus a `README.md` index                          | Asks before creating `docs/adr/`. Shows a draft and writes only after approval. Statuses: `proposed \| accepted \| deprecated \| superseded by ADR-NNNN`. Context is 10 lines or fewer. Alternatives are required. Backfilled ADRs are marked |
| `context-and-decisions`         | `CONTEXT.md`, only when no glossary exists                             | Needs explicit approval for a new file. Holds terms only: no plans, status or rationale. Unconfirmed terms are marked `needs confirmation`                                                                                                    |
| `change-impact`                 | None by default; it reports in the response                            | Read-only. Covers code, data, interfaces, tests, docs and release. A missing rollback, compatibility window or note of irreversible effects blocks the change. "Do not force `docs/impacts/`"                                                 |
| `living-docs-governance`        | Reuses existing docs                                                   | Four roles: constitution, map, status, history. One owner per fact. Inventory first. It doesn't claim docs are auto-read unless a harness actually loads them                                                                                 |
| `docs-governance`               | Writes nothing; `audit-docs.py` is a read-only audit                   | Uses `.governance/docs-map.json` to map roles to real paths. Exit 0 means pass, with warnings allowed                                                                                                                                         |
| `skill-scout`                   | Writes nothing                                                         | Search local, then marketplace, then GitHub before creating a skill. Outcomes: use, fork or create                                                                                                                                            |
| `orch-*` (engine)               | Commits only after Gate 2                                              | Gate 1 is the plan, Gate 2 the commit. It sets **80 % coverage** on changed behaviour                                                                                                                                                         |
| `refactor-clean`                | Prints a console summary                                               | One deletion at a time, re-test after each, revert on failure. Code reachable only through `import()` is CAUTION                                                                                                                              |

**ECC disagrees with itself on plan location:** `plans/` (blueprint), `.claude/plans/` (`/plan`, `plan-canvas`), `.claude/prds/` (`/plan-prd`). This repo uses `docs/restructure/` instead (user answer, 2026-11-22).

The artifact-role contract says the issue tracker owns task status. This repo uses [phases/](../phases/README.md) instead (user answer).

## The ten compliance suggestions (proposals; see ADR-0002)

These came from comparing the old S0–S8 plan with the skills above.

1. Give each step a brief, a model tier, a rollback and a branch (blueprint).
2. Give data, auth and persisted-key steps a rollback and a compatibility window (change-impact).
3. Use `orch-fix-defect` for bugs. Don't use `orch-refine-code` for config-only changes.
4. Run one `council` per contested question.
5. Write down the approval gates for ADRs, `CONTEXT.md` and acceptance criteria.
6. Triage every gap row to a phase or to `wont-fix`, and re-audit at the end (brownfield-retrospective).
7. Mark the steps that `plan-orchestrate` will report as BLOCKED (manual).
8. One deletion per `refactor-clean` run.
9. Decide on the 80 % coverage target (ADR-0011).
10. Add `git-workflow`, `conventional-commit-review`, `safety-guard` and `module-regression`.

**Already reflected:**

- #2, #3, #8: in [workflow.md](../workflow.md).
- #5: in the [ADR index](../../adr/README.md).
- #6: in the [gap register](gap-register.md) (every G-row has a phase, or is deferred with a reason).

The rest wait on ADR-0002.
