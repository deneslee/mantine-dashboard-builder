# Research

Short evidence summaries, one per topic. Each has a "Last verified" commit and date. Research for a later phase or step goes into that step's spec, unless it serves several steps.

## How claims are tagged

| Tag                      | Meaning                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- |
| **Repo fact (verified)** | Checked against code, config or tests at the stated commit, with `file:line`     |
| **External evidence**    | From a primary source (URL). It says whether it was re-fetched                   |
| **Measured, not re-run** | A number from an earlier run                                                     |
| **Hypothesis**           | No source, or inference only                                                     |
| **Proposal**             | A recommendation. It is never a decision; see [../decisions.md](../decisions.md) |

All of these are snapshots. Before you act on a row, re-check it against the code. If the code differs, fix the row and its date.

## Topics

| File                                             | Answers                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| [current-state.md](current-state.md)             | What exists today: facts, the gap register G-001…G-036, the original requirements |
| [workspace-layout.md](workspace-layout.md)       | `apps/` and `packages/` layout and package boundaries                             |
| [app-structure.md](app-structure.md)             | Folders inside the web app: features, routes, naming                              |
| [plugin-capabilities.md](plugin-capabilities.md) | The plugin model, record providers, auth, "add to build"                          |
| [task-runner.md](task-runner.md)                 | `vp run` vs Turborepo, Nx and moon; cache inputs                                  |
| [tests-lint-ci.md](tests-lint-ci.md)             | Test tiers, lint rule set, CI shape                                               |
| [harnesses.md](harnesses.md)                     | How Claude Code, Codex and Antigravity load instructions, skills and agents       |
| [ecc.md](ecc.md)                                 | What each ECC skill writes and asks for; the ten compliance suggestions           |
| [carry-over.md](carry-over.md)                   | Useful items from old docs that are slated for deletion                           |
