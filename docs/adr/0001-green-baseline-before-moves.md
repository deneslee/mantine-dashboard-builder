# ADR-0001: Green baseline before the moves?

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**    | [P1](../restructure/phases/P1-first-decisions.md)                                                                                                                                             |
| **Blocks**   | phase order.                                                                                                                                                                                  |
| **Research** | [tests-lint-ci](../restructure/research/tests-lint-ci.md) "Measured"; [task-runner](../restructure/research/task-runner.md); [workspace-layout](../restructure/research/workspace-layout.md). |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

Should the red tests and the lint cache be fixed _before_ any folder move? That changes your order A-10.

## Decision

Not decided.

**Recommendation (research):** (a). A move can only be shown to keep behaviour if the checks pass before it.

## Alternatives Considered

- (a) baseline first, then moves;
- (b) keep A-10 and fix tests in the tests phase.

## Consequences

Written when the decision is accepted.
