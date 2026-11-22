# ADR-0006: Boundary and layer rules after the move

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**    | [P5](../restructure/phases/P5-tooling.md)                                                                                           |
| **Blocks**   | the tooling phase.                                                                                                                  |
| **Research** | [tests-lint-ci](../restructure/research/tests-lint-ci.md), [carry-over](../restructure/research/carry-over.md) "Engineering rules". |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

Should the `layer()` lint rules be re-keyed to the new paths, or replaced by package boundaries? Which of today's lint-enforced rules stay?

## Decision

Not decided.

**Recommendation (research):** (b), then (c) only if needed.

## Alternatives Considered

- (a) re-key `layer()`;
- (b) package deps plus a few `no-restricted-imports` rules;
- (c) `eslint-plugin-boundaries`.

## Consequences

Written when the decision is accepted.
