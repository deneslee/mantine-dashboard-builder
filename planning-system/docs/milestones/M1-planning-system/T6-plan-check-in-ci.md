---
id: T6
title: Run the planning check in CI
status: proposed
depends_on: []
---

## Do

- Add `node scripts/plan-index.mjs --check` to the CI workflow

## Done when

- A stale `roadmap.md` fails CI
