# Research

One file per topic. Each file's title says which decisions it was done for, and its first section gives the one question it answers. Each has a "Last verified" commit and date.

## Files

| File                                             | Question it answers                                                             | Done for                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [baseline-audit.md](baseline-audit.md)           | What exists today? Facts F-01…, browser storage keys                            | every ADR                                                                                                                                                                                         |
| [gap-register.md](gap-register.md)               | What is wrong or missing, and which phase fixes it? G-001…G-036                 | the [phases](../phases/README.md)                                                                                                                                                                 |
| [workspace-layout.md](workspace-layout.md)       | How should `apps/` and `packages/` be laid out, and where are the boundaries?   | [0003](../../adr/0003-target-workspace-layout.md), [0004](../../adr/0004-package-set-and-names.md), [0006](../../adr/0006-boundary-and-layer-rules.md)                                            |
| [app-structure.md](app-structure.md)             | How are folders inside the web app organised: features, routes, naming?         | [0004](../../adr/0004-package-set-and-names.md), [0005](../../adr/0005-app-folder-organisation.md), [0013](../../adr/0013-urls-and-package-scope.md), [0018](../../adr/0018-shared-vocabulary.md) |
| [plugin-capabilities.md](plugin-capabilities.md) | What should the plugin model, record providers, auth and "add to build" be?     | [0007](../../adr/0007-plugin-model.md), [0012](../../adr/0012-add-to-build.md), [0016](../../adr/0016-connections-vault-storage.md)                                                               |
| [task-runner.md](task-runner.md)                 | `vp run`, or Turborepo, Nx or moon? What are the cache inputs?                  | [0008](../../adr/0008-task-runner.md), [0001](../../adr/0001-green-baseline-before-moves.md)                                                                                                      |
| [tests-lint-ci.md](tests-lint-ci.md)             | Which test tiers, which lint rule set, and what CI shape?                       | [0001](../../adr/0001-green-baseline-before-moves.md), [0006](../../adr/0006-boundary-and-layer-rules.md), [0009](../../adr/0009-test-and-lint-scope.md), [0010](../../adr/0010-ci-shape.md)      |
| [ecc.md](ecc.md)                                 | What does each ECC skill write and ask for? The ten compliance suggestions      | [0002](../../adr/0002-per-step-workflow-weight.md), [0011](../../adr/0011-coverage-target.md)                                                                                                     |
| [harnesses.md](harnesses.md)                     | How do Claude Code, Codex and Antigravity load instructions, skills and agents? | the planning system ([P0](../phases/P0-planning-system.md))                                                                                                                                       |
| [carry-over.md](carry-over.md)                   | What was useful in the deleted old docs?                                        | [0006](../../adr/0006-boundary-and-layer-rules.md), [0007](../../adr/0007-plugin-model.md), [0014](../../adr/0014-chart-widgets.md)                                                               |

Research for a later phase or step goes into that step's spec, unless it serves several steps.

## How claims are tagged

| Tag                      | Meaning                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| **Repo fact (verified)** | Checked against code, config or tests at the stated commit, with `file:line`  |
| **External evidence**    | From a primary source (URL). It says whether it was re-fetched                |
| **Measured, not re-run** | A number from an earlier run                                                  |
| **Hypothesis**           | No source, or inference only                                                  |
| **Proposal**             | A recommendation. It is never a decision; see the [ADRs](../../adr/README.md) |

All of these are snapshots. Before you act on a row, re-check it against the code. If the code differs, fix the row and its date.
