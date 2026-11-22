# ADR-0002: How heavy is the per-step workflow?

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**    | [P1](../restructure/phases/P1-first-decisions.md)                                                                                                                                |
| **Blocks**   | first implementation step.                                                                                                                                                       |
| **Research** | [research/ecc.md](../restructure/research/ecc.md) lists what each ECC skill requires and the ten suggestions; [workflow.md](../restructure/workflow.md) is the proposed routine. |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

Which of ECC's ten compliance suggestions apply? They were: per-step brief, model tier, rollback and branch; one council run per conflict; a manual-step list; one deletion per cleanup run; `git-workflow`; `safety-guard`; `module-regression`.

## Decision

Not decided.

**Recommendation (Claude):** (b).

## Alternatives Considered

- (a) all ten;
- (b) scale with risk: a spec, a verification step and a rollback note always, with council, impact files and regression ledgers only for high-risk steps;
- (c) minimal.

## Consequences

Written when the decision is accepted.
