# ADR-0005: App folder organisation

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**    | [P4](../restructure/phases/P4-restructure.md)                                                                                                                                 |
| **Blocks**   | the app-folder steps.                                                                                                                                                         |
| **Research** | [target-structure](../restructure/target-structure.md) (the trees), [app-structure](../restructure/research/app-structure.md). Your direction D6 points to file-kind folders. |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

How are folders inside `apps/web` organised?

- Features grouped by file kind (`components/`, `hooks/`) or by concern?
- Routes in `src/app/routes` or `src/routes`?
- Kebab-case folder names?
- The renames that fix name clashes (see ADR-0018)?

## Decision

Not decided.

**Recommendation (research):** file kind first, with routes in `src/routes`.

## Alternatives Considered

given in app-structure.

## Consequences

Written when the decision is accepted.
