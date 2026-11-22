# Restructure: start here

This page is the entry point for you and for any agent session. It owns the current phase, what is blocked, and the next action.

## Now

|                 |                                                                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**       | [P1: first decisions](phases/P1-first-decisions.md)                                                                                                                                                                                                                                                                     |
| **Waiting on**  | Your answers on six decisions: [0001](../adr/0001-green-baseline-before-moves.md), [0002](../adr/0002-per-step-workflow-weight.md), [0003](../adr/0003-target-workspace-layout.md), [0004](../adr/0004-package-set-and-names.md), [0011](../adr/0011-coverage-target.md), [0013](../adr/0013-urls-and-package-scope.md) |
| **Blocked**     | All implementation phases (P2+) until the P1 decisions are made. No application code changes without approval                                                                                                                                                                                                           |
| **Next action** | Discuss 0001 and 0002 first, because they shape every step. Then 0003 and 0004 together (one `ecc:council` run, with [target-structure.md](target-structure.md)), then 0011 and 0013                                                                                                                                    |
| **Updated**     | 2026-11-22: decisions, phases and research split into one file each, with index pages; proposed structure added                                                                                                                                                                                                         |

## Where to look

| I want to…                                            | Look at                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| See the proposed new structure and its alternatives   | [target-structure.md](target-structure.md): today's tree and each option's tree          |
| See every decision and its status                     | [../adr/README.md](../adr/README.md): one row per decision, linking its file             |
| Read one decision (question, options, recommendation) | its file, `../adr/NNNN-*.md`, which links its research                                   |
| See the phase order and what each phase needs         | [phases/README.md](phases/README.md): one row per phase, linking its file                |
| See what is wrong today and which phase fixes it      | [research/gap-register.md](research/gap-register.md)                                     |
| See what exists today (facts, storage keys)           | [research/baseline-audit.md](research/baseline-audit.md)                                 |
| See your requirements and answers so far              | [requirements.md](requirements.md)                                                       |
| Find the research behind a decision                   | [research/README.md](research/README.md): each file says which decisions it was done for |
| Run a step (spec, checks, review, ECC skills)         | [workflow.md](workflow.md)                                                               |

## Folder layout

```text
docs/
├── adr/                      one file per decision, plus the index (README.md)
└── restructure/
    ├── README.md             this page: status and where to look
    ├── target-structure.md   proposed repo trees, today vs each option
    ├── requirements.md       your answers and requirements
    ├── workflow.md           how a step is run
    ├── phases/               one file per phase, plus the index (README.md)
    ├── research/             one file per topic, plus the index (README.md)
    └── specs/                one spec per step, written when its phase starts
```

The layout follows ECC's own patterns:

- **Decisions:** one ADR file each, with an index (`ecc:architecture-decision-records`).
- **Phases:** one file per unit of work, with an index (`ecc:story-lifecycle`).
- **Research:** a baseline audit, a gap register and a target design (`ecc:brownfield-retrospective`).
- **This page:** a "Where to look" table (`ecc:codebase-onboarding`).

## Rules for this folder

- **One owner per fact.** Other files link to the owner instead of copying it.

  | Fact                                         | Owner                                |
  | -------------------------------------------- | ------------------------------------ |
  | Current phase and next action                | this page                            |
  | Phase order and status                       | [phases/README.md](phases/README.md) |
  | A phase's goal, gaps and steps               | its phase file                       |
  | Decision status                              | [../adr/README.md](../adr/README.md) |
  | A decision's question, options and reasoning | its ADR file                         |
  | Evidence                                     | [research/](research/README.md)      |

- **`proposed` means not decided.** Only you set an ADR to `accepted`. This covers proposals from Claude, ChatGPT, ECC or research.
- **Research and specs are snapshots.** Re-check a row against the code before acting on it.
- **Superseded docs are deleted, not archived.** Git history keeps them.

## Not in scope here

`apps/docs/` (the capability catalog) has not been verified, and it contradicts the code in several places (see [research/carry-over.md](research/carry-over.md), "apps/docs mismatches"). Don't use it as evidence. Its "potential" content is ideas only and is not loaded by default.
