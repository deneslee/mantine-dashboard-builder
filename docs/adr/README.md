# Decisions (ADRs)

This page lists every restructure decision: one file per decision, with links. It owns each decision's **status**; the file owns its question, options and reasoning.

**What the statuses mean**

| Status                   | Meaning                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `proposed`               | **Not decided.** It may carry a recommendation from research or an agent |
| `accepted`               | You approved it. Only you set this status                                |
| `deprecated`             | No longer applies, or you rejected it. The file says why                 |
| `superseded by ADR-NNNN` | Replaced. The new ADR links back                                         |

A recommendation (from research, Claude, ChatGPT or ECC) is never a decision. Your requirements so far are in [../restructure/requirements.md](../restructure/requirements.md).

## Decide now (phase P1)

| ADR                                         | Decision                            | Recommendation (who)                                       | Research                                                                                                                                                                           |
| ------------------------------------------- | ----------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-green-baseline-before-moves.md) | Green baseline before the moves?    | (a) baseline first, then moves (research)                  | [tests-lint-ci](../restructure/research/tests-lint-ci.md)                                                                                                                          |
| [0002](0002-per-step-workflow-weight.md)    | How heavy is the per-step workflow? | (b) scale with risk (Claude)                               | [ecc](../restructure/research/ecc.md)                                                                                                                                              |
| [0003](0003-target-workspace-layout.md)     | Target workspace layout             | (a) apps first, then packages (research)                   | [target-structure](../restructure/target-structure.md), [workspace-layout](../restructure/research/workspace-layout.md)                                                            |
| [0004](0004-package-set-and-names.md)       | Package set and names               | research disagrees; one `ecc:council` run                  | [target-structure](../restructure/target-structure.md), [workspace-layout](../restructure/research/workspace-layout.md), [app-structure](../restructure/research/app-structure.md) |
| [0011](0011-coverage-target.md)             | Coverage target                     | (b) every changed behaviour has a test, no number (Claude) | —                                                                                                                                                                                  |
| [0013](0013-urls-and-package-scope.md)      | URLs and package scope              | rename URLs, scope `@dashboard-builder` (Claude)           | [app-structure](../restructure/research/app-structure.md)                                                                                                                          |

## Later phases

| ADR                                       | Decision                                                 | Phase                                                 | Recommendation (who)                               |
| ----------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| [0005](0005-app-folder-organisation.md)   | App folder organisation                                  | [P4](../restructure/phases/P4-restructure.md)         | file kind first, routes in `src/routes` (research) |
| [0018](0018-shared-vocabulary.md)         | Shared vocabulary                                        | [P4](../restructure/phases/P4-restructure.md)         | a `CONTEXT.md` after 0005 and 0007 (Claude)        |
| [0006](0006-boundary-and-layer-rules.md)  | Boundary and layer rules after the move                  | [P5](../restructure/phases/P5-tooling.md)             | package deps plus a few import rules (research)    |
| [0008](0008-task-runner.md)               | Task runner                                              | [P5](../restructure/phases/P5-tooling.md)             | `vp run` only (research)                           |
| [0009](0009-test-and-lint-scope.md)       | Test and lint scope                                      | [P5](../restructure/phases/P5-tooling.md)             | correctness rules only (research)                  |
| [0007](0007-plugin-model.md)              | Plugin model                                             | [P6](../restructure/phases/P6-functional-redesign.md) | Option A in plugin-capabilities (research)         |
| [0012](0012-add-to-build.md)              | "Add to build" (G-030)                                   | [P6](../restructure/phases/P6-functional-redesign.md) | drop it, ship every type (research)                |
| [0014](0014-chart-widgets.md)             | One chart widget or two?                                 | [P6](../restructure/phases/P6-functional-redesign.md) | none yet                                           |
| [0015](0015-debug-route-in-production.md) | `/debug` in production                                   | [P6](../restructure/phases/P6-functional-redesign.md) | none yet                                           |
| [0016](0016-connections-vault-storage.md) | Connections, vault and storage choice with several users | [P6](../restructure/phases/P6-functional-redesign.md) | none yet                                           |
| [0017](0017-credential-model.md)          | Credential model                                         | [P6](../restructure/phases/P6-functional-redesign.md) | none yet                                           |
| [0010](0010-ci-shape.md)                  | CI shape                                                 | [P7](../restructure/phases/P7-ci.md)                  | one workflow, deploy gated on CI (research)        |

All 18 are `proposed`; none is accepted yet.

## How an ADR file is written

The format comes from `ecc:architecture-decision-records`:

- **File name:** `NNNN-kebab-title.md`. Numbers are never reused.
- **Header:** Date, Status, Deciders, plus a table with the phase, what it blocks, and links to its research.
- **Sections:** Context (10 lines or fewer), Decision, Alternatives Considered, Consequences.

The rules:

- **Accepting.** When you accept, the Decision and Consequences sections are filled in and shown to you before the status changes to `accepted` here and in the file.
- **After acceptance.** An accepted ADR isn't edited. A change gets a new ADR that supersedes it.
- **Recording an older choice.** An ADR that records a choice made earlier is marked "reconstructed", with the original date if known.
