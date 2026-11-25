---
id: T2
title: Move old research into the new places
status: planned
depends_on: []
---

## Do

- Move with history, from the repo root (PowerShell or bash):

```sh
mkdir docs/research
git mv docs/restructure/research/current-state.md docs/research/R1-current-state.md
git mv docs/restructure/research/workspace-layout.md docs/milestones/M2-target-structure/R2-workspace-layout.md
git mv docs/restructure/research/app-structure.md docs/milestones/M2-target-structure/R3-app-structure.md
git mv docs/restructure/research/plugin-capabilities.md docs/research/R4-plugin-capabilities.md
git mv docs/restructure/research/task-runner.md docs/research/R5-task-runner.md
git mv docs/restructure/research/tests-lint-ci.md docs/research/R6-tests-lint-ci.md
git mv docs/restructure/research/harnesses.md docs/research/R7-harnesses.md
git mv docs/restructure/research/ecc.md docs/research/R8-ecc.md
git mv docs/restructure/research/carry-over.md docs/research/R9-carry-over.md
```

- Add frontmatter from `.agents/skills/planning/templates/research.md` to each file
- Replace D-xx with ADR ids (ADR = D + 1, for example D-03 → ADR-0004); fix links

## Done when

- `node scripts/plan-index.mjs --check` passes
- `vp test run lint/docs.test.ts` passes
