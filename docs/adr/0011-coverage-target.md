# ADR-0011: Coverage target

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                   |
| ------------ | --------------------------------------------------------------------------------- |
| **Phase**    | [P1](../restructure/phases/P1-first-decisions.md)                                 |
| **Blocks**   | first `orch-*` run.                                                               |
| **Research** | ECC's `orch-*` and `tdd` skills default to 80 %. Your A-11 says shrink the suite. |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

Adopt ECC's 80 % coverage target?

## Decision

Not decided.

**Recommendation (Claude):** (b). Tell ECC commands to skip the 80 % gate.

## Alternatives Considered

- (a) 80 % on changed code;
- (b) no number: every changed behaviour has a test;
- (c) no target.

## Consequences

Written when the decision is accepted.
