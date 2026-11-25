---
id: T7
title: Spike the unverified items
status: planned
depends_on: []
---

## Do

- Throwaway branch. Answer each item yes or no; a no reopens ADR-0004 or ADR-0005:
  - [ ] Type-aware lint (tsgolint) across workspace packages
  - [ ] Wildcard `exports` across mixed `.ts` and `.tsx` files
  - [ ] Convex bundling a TS-source workspace package
  - [ ] PostCSS and Mantine CSS from a linked package
  - [ ] Vitest drive-letter path on Windows
  - [ ] Excluding `docs/**` from cache inputs fixes the lint cache miss
- Write the results as a research file in this milestone

## Done when

- Every item answered, with evidence

## Rollback

- Delete the spike branch
