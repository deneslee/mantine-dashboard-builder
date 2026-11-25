# Agent instructions

This repository is in **restructure review mode**. Its architecture, layout, naming, plugin system and docs are all open for reconsideration.

**Start here:** [docs/roadmap.md](docs/roadmap.md) (generated). The product: [docs/PRODUCT.md](docs/PRODUCT.md).

## Planning

- Before you create or change a planning file in `docs/`, read `.agents/skills/planning/SKILL.md`. For `docs/PRODUCT.md`, also read `.agents/skills/product-brief/SKILL.md`.
- After a change, run `node scripts/plan-index.mjs`.
- `docs/restructure/` and `docs/adr/` are old. Task T3 deletes them. Do not add to them.

## Rules

- **Docs are claims, not facts.**
  - This covers `README.md`, `docs/**`, `apps/docs/**`, earlier plans, and agent or AI recommendations (Claude, ChatGPT, ECC).
  - Check claims against code, config, tests or primary sources before relying on them. Where they differ, the code wins: record the difference.
- **Keep four things apart** in everything you write:
  - verified facts, with evidence (`file:line` or a URL);
  - the user's requirements;
  - proposals;
  - open questions.
- **Only the user accepts a decision.** Only the user sets `accepted` or `rejected` on a decision in `docs/decisions/`, or `done` on a milestone.
- **Ask first.**
  - Do not change application code, move files or delete anything without the user's explicit approval for that change.
  - Editing the planning files in `docs/` is allowed.
- **One owner per fact.** Link to the owning file instead of copying it. A status lives only in its own file's frontmatter.

## Working

- **Steps.** Until ADR-0003 is decided, run each task per [docs/restructure/workflow.md](docs/restructure/workflow.md): spec, approval, change, checks, review, approval to commit.
- **Checks.**
  - `vp run check:lint`, `vp run check:css`, `vp run check:fmt`, `vp run check:unit`, `vp run check:build`.
  - `node scripts/plan-index.mjs --check` for the planning files.
  - While working, run single tests with `vp test run <path>`.
  - Lint and unit runs are slow: minutes, not seconds.
- **Tools.**
  - A code index (qartez) for code facts.
  - Context7 for current library docs.
  - The Mantine MCP before writing UI.
  - Primary sources for external claims.
