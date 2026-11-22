# ADR-0013: URLs and package scope

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                                                                                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**    | [P1](../restructure/phases/P1-first-decisions.md)                                                                                                                                                                                                                 |
| **Blocks**   | package extraction (scope), app renames (URLs).                                                                                                                                                                                                                   |
| **Research** | [target-structure](../restructure/target-structure.md) (the trees), [app-structure](../restructure/research/app-structure.md). Renaming URLs breaks bookmarks and shared links; the scope appears only in import paths, because packages are not published (A-1). |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

Rename user-visible URLs (`/datasources/$id` to `/connections/$connectionId`)? What is the package scope?

## Decision

Not decided.

**Recommendation (Claude):** rename the URLs (`/connections/…`) and use `@dashboard-builder`.

## Alternatives Considered

- URLs: (a) rename to match the new names, or (b) keep today's.
- Scope: (a) `@dashboard-builder`, (b) `@repo` (the Turborepo convention), or (c) another name.

## Consequences

Written when the decision is accepted.
