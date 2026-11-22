# How to use ECC for this restructure

This is a quick reference: what to run, when, and what you get back. The plan is [work/04-plan.md](work/04-plan.md). The reason for each choice is in [work/04-plan/ecc-compliance.md](work/04-plan/ecc-compliance.md).

**Names.** Commands start with `/` (for example `/ecc:orch-refine-code <what>`). Skills are invoked by name ("use `ecc:council` for …"). Agents are named in the prompt ("use agent `ecc:architect`").

**Paths.** Tell every skill to write under `docs/ecc/work/`, not its default location (playbook "Where outputs go").

## Per stage

| When                        | Run                                                                 | For                                         | You get back                                                                                        |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| S0: a contested choice      | `ecc:council` with **one question** and short context               | Structured disagreement before deciding     | A Council block in chat: four positions, consensus, strongest dissent, recommendation. **No file.** |
| S0: after each decision     | `ecc:architecture-decision-records` → `docs/ecc/work/03-decisions/` | Recording the decision                      | A draft ADR shown first; it is written **only after you approve it**                                |
| S0: confusing terms         | `ecc:context-and-decisions`                                         | A glossary (`CONTEXT.md`)                   | Proposed wording; the file is created only after approval                                           |
| S0, S5: high-risk change    | `ecc:intent-driven-development`                                     | Acceptance criteria                         | `AC-001…` criteria, each with a check, written only if you name a path                              |
| Before any non-trivial step | `ecc:change-impact`                                                 | Blast radius and rollback                   | Code, data, interface, test, doc and release impact. A missing rollback blocks the step             |
| S1: a bug (e.g. G-036)      | `/ecc:orch-fix-defect <what is broken>`                             | Failing test, then fix                      | Gate 1 plan, the fix, review, Gate 2 commit (`fix:`)                                                |
| S2–S3: moves and renames    | `/ecc:orch-refine-code <what to restructure>`                       | Restructure without changing behaviour      | Green before and after; Gate 1 plan and Gate 2 commit (`refactor:`)                                 |
| S5: a behaviour change      | `/ecc:orch-change-feature <new behaviour>`                          | Changing a working feature                  | Tests updated first, then code; Gate 1 and Gate 2                                                   |
| S5: dead code               | `/ecc:refactor-clean`                                               | Removing one item at a time                 | A "Dead Code Cleanup" summary (deleted, skipped). It reverts itself if tests break                  |
| S5: tidy-up                 | agent `ecc:code-simplifier`                                         | Simpler code with the same behaviour        | An edited diff for review                                                                           |
| S5: auth or secrets         | `ecc:security-review`, agent `convex:convex-reviewer`               | Security findings                           | Ranked findings                                                                                     |
| S7: tests                   | `ecc:test-collaboration` (inventory only), `ecc:react-testing`      | Test value and gaps                         | An inventory with keep or cut evidence                                                              |
| S8: docs                    | `ecc:living-docs-governance`, then `ecc:docs-governance` (audit)    | Real `AGENTS.md` and `CLAUDE.md`, doc roles | A role map, plus `audit-docs.py` exit 0                                                             |

## Every step

1. **Branch.** Follow `ecc:git-workflow`, one branch per step. Optionally turn on `ecc:safety-guard` Freeze for the folder being changed.
2. **Before:** `ecc:change-impact`.
3. **Do the step** with the command from the table.
4. **Check:** run `ecc:verification-loop`. In this repo that means `vp run check:lint`, `check:css`, `check:fmt`, `check:unit` and `check:build`. You get a report with Build, Types, Lint, Tests and Diff.
5. **Review:** `/ecc:orch-review`. It ends with APPROVE or CHANGES_REQUESTED, and CRITICAL and HIGH findings must be fixed.
6. **Commit:** `ecc:conventional-commit-review` drafts the message. You confirm at the orch Gate 2.
7. **After:** `ecc:change-impact` compares what was planned with the actual diff. Mark the G-rows in 01 §2 as done.

## Helpers

- **Command list:** `ecc:plan-orchestrate docs/ecc/work/04-plan.md --scope=step:S2` prints the ready-to-paste command per step. Steps that are not `/orch-*` show as `BLOCKED — run manually`, which is expected.
- **Which ECC command for a job:** `ecc:ecc-recipes <workflow>`. For a single command, use `ecc:ecc-guide <name>`.
- **Long sessions:** `ecc:strategic-compact` at stage boundaries, and `/ecc:save-session` and `/ecc:resume-session` between days.
- **Plan review:** `ecc:plan-canvas` for annotating and approving the plan in a browser.
