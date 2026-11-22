# ADR-0003: Target workspace layout

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Phase**    | [P1](../restructure/phases/P1-first-decisions.md)                                                                                    |
| **Blocks**   | the restructure phase.                                                                                                               |
| **Research** | [target-structure](../restructure/target-structure.md) (the trees), [workspace-layout](../restructure/research/workspace-layout.md). |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

Is the target `apps/{web,relay}` plus `packages/*`, reached by moving the apps first and extracting packages afterwards?

## Decision

Not decided.

**Recommendation (research):** (a).

## Alternatives Considered

- (a) apps first (`apps/web`, `apps/relay`, Convex as a package), then shared code extracted into `packages/*`;
- (b) apps only: `apps/web` and `apps/relay`, no shared packages yet;
- (c) keep today's single-package layout.

## Consequences

Written when the decision is accepted.
