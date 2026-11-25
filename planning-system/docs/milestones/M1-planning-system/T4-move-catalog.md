---
id: T4
title: Move the capability catalog to docs/catalog
status: planned
depends_on: []
---

## Do

- `git mv apps/docs docs/catalog`
- Fix paths in `docs/catalog/scripts/generate-catalog.mjs` and its run command
- Fix the `apps/docs/**/*.md` glob in `lint/docs.test.ts`
- Keep the "unverified" warning on the catalog

## Done when

- Catalog script runs
- `vp test run lint/docs.test.ts` passes
