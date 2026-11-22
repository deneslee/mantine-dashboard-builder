# ADR-0007: Plugin model

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                        |
| ------------ | ---------------------------------------------------------------------- |
| **Phase**    | [P6](../restructure/phases/P6-functional-redesign.md)                  |
| **Blocks**   | the functional-redesign phase.                                         |
| **Research** | [plugin-capabilities](../restructure/research/plugin-capabilities.md). |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

- One `definePlugin` per plugin folder?
- A records host scoped to the app instance, instead of a module-global provider?
- Auth as part of the record provider?
- Delete the unused `ActionPlugin`, `ContextPanelPlugin` and `subscribe`?
- Keep `optionsEditor`?

## Decision

Not decided.

**Recommendation (research):** its Option A.

## Alternatives Considered

given in plugin-capabilities.

## Consequences

Written when the decision is accepted.
