# ADR-0004: Package set and names

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**    | [P1](../restructure/phases/P1-first-decisions.md)                                                                                                                                               |
| **Blocks**   | package extraction.                                                                                                                                                                             |
| **Research** | [target-structure](../restructure/target-structure.md) (the trees), [workspace-layout](../restructure/research/workspace-layout.md), [app-structure](../restructure/research/app-structure.md). |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

Which packages exist, and what are they called?

- `domain` or `core`?
- Plugin contracts inside `plugins`, or their own package?
- The relay wire contract inside `domain`, or separate?
- `packages/plugins` as one package, or one per kind?
- Where do `src/utils` and `core/build` go?

## Decision

Not decided.

**Recommendation (research):** the two research files disagree. Settle it with one `ecc:council` run.

## Alternatives Considered

- (a) `domain`, `ui`, `plugins`, `convex`;
- (b) (a) plus `shell`, `platform`, `plugin-api`, `relay-contract`.

## Consequences

Written when the decision is accepted.
