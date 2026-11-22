# S0 — Decisions to settle

Each row is settled in one of three ways: by an ADR in `03-decisions/` (draft, then accepted by the user), by `ecc:council`, or by a user answer.

## Answered: record as ADRs

Sources: [02-research/README.md](../02-research/README.md) "Answers" and [01-current-state.md](../01-current-state.md) §3.1.

| Topic                           | Answer                                                                        | Covers                 |
| ------------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| Second app                      | None now. Structure the repo monorepo-style anyway (01 Q1).                   | D1                     |
| Users                           | Several users, no live interaction (01 Q2)                                    | G-004, G-024           |
| Credentials                     | **Probably** stay in the browser vault. Effect: "document and harden" (01 Q3) | G-005                  |
| Capability selection            | Included at build time; the **user picks in the UI** (README 1)               | plugin-capabilities §7 |
| Auth                            | Convex Auth for now (README 2)                                                | G-004                  |
| Drafts                          | Browser-local, keyed by user (README 4)                                       | G-007 (drafts only)    |
| Storybook tests in CI           | Optional (README 6)                                                           | G-025                  |
| Relay image                     | Not deployed; build the bundle only (README 7)                                | G-025                  |
| node-studio, explore, templates | Keep (README 8)                                                               | G-031 (partly)         |

## Research recommendations: draft ADRs for the user to accept or reject

| Recommendation                                                                              | Source                 |
| ------------------------------------------------------------------------------------------- | ---------------------- |
| Workspace target Option B, reached through Option A                                         | workspace-layout §6    |
| Plugin model Option A (`definePlugin`, a records host; auth is part of the record provider) | plugin-capabilities §7 |
| Task runner: `vp run` only (playbook Phase 3 lists this as a council question)              | task-runner §5         |
| Test tiers, lint rule set and CI shape                                                      | tests-lint-ci §6       |

## Needs the user

| Item                                                                                   | Options (source)                          |
| -------------------------------------------------------------------------------------- | ----------------------------------------- |
| G-030 "add to build"                                                                   | Alternatives 1–4 (plugin-capabilities §4) |
| Rename user-visible URLs                                                               | app-structure §5.3                        |
| Package scope                                                                          | workspace-layout §4.2, app-structure §5.3 |
| Keep design-token lint rules as warnings? Keep `no-explicit-any` and `ban-ts-comment`? | tests-lint-ci §7, open questions 2 and 3  |
| `WidgetPlugin.optionsEditor`: keep or delete                                           | plugin-capabilities §5                    |
| Should `/debug` ship to production? Gate it or drop it                                 | 01 Q10, G-022                             |
| Both chart widgets, or one?                                                            | 01 Q7, G-028                              |
| Do connections and vault entries become records, or stay local?                        | 01 Q6, G-007                              |
| Can a signed-in user still choose browser storage?                                     | plugin-capabilities §7, Unresolved #3     |

## Needs `ecc:council`, then an ADR

| #   | Conflict                                                                                           | Sources                                                  |
| --- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| C1  | Package list: `domain, ui, plugins, convex`, or also `shell, platform, plugin-api, relay-contract` | workspace-layout §4.2; app-structure §5.4                |
| C2  | Name of the domain package: `domain` or `core`                                                     | same                                                     |
| C3  | Plugin contracts inside `plugins`, or in their own package                                         | workspace-layout §4.1; app-structure §5.4                |
| C4  | Relay wire contract inside `domain`, or separate                                                   | workspace-layout §5 (G-021 note); 01 §1.2                |
| C5  | Layer rules after the move: re-key them, or replace them with package boundaries                   | workspace-layout §6 point 4; tests-lint-ci §3.4 and §6.2 |
| C6  | Feature folders by file kind or by concern                                                         | app-structure §3.1, §5.1, §5.7 (FSD caveat); D6          |
| C7  | Route directory: stays `src/app/routes`, or moves to `src/routes`                                  | workspace-layout §4.2 Option B; app-structure §5.2       |

## Glossary (`ecc:context-and-decisions`)

Two term lists need to be reconciled into one `CONTEXT.md`:

- plugin-capabilities §6, rows G-001 and G-002;
- app-structure §5.3, the collision renames.

## Exit

- Every row is accepted or deferred with a reason.
- Acceptance criteria are written for each stage (`ecc:intent-driven-development`).
- The user OKs S1 running before the moves (it changes U10).
