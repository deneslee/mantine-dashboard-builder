# ADR-0012: "Add to build" (G-030)

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Phase**    | [P6](../restructure/phases/P6-functional-redesign.md)                                                                          |
| **Blocks**   | the plugin steps, and how path-coupled the move is.                                                                            |
| **Research** | [plugin-capabilities](../restructure/research/plugin-capabilities.md). Every type in every build was measured at +6.1 kB gzip. |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

The live site can commit `plugins.json` with a GitHub token and then rebuild. Keep this, or ship every datasource type in every build?

## Decision

Not decided.

**Recommendation (research):** drop the flow and ship every type.

## Alternatives Considered

four alternatives, listed in plugin-capabilities.

## Consequences

Written when the decision is accepted.
