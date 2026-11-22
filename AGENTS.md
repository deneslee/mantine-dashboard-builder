# Agent instructions

This repository is in **restructure review mode**. Its architecture, layout, naming, plugin system and docs are all open for reconsideration.

**Start here:** [docs/restructure/README.md](docs/restructure/README.md). It holds the current phase, what is blocked, the next action and the reading order.

## Rules

- **Docs are claims, not facts.**
  - This covers `README.md`, `docs/**`, `apps/docs/**`, earlier plans, and agent or AI recommendations (Claude, ChatGPT, ECC).
  - Check claims against code, config, tests or primary sources before relying on them. Where they differ, the code wins: record the difference.
- **Keep four things apart** in everything you write:
  - verified facts, with evidence (`file:line` or a URL);
  - the user's requirements;
  - proposals;
  - open questions.
- **Only the user accepts a decision.** Nothing moves to `accepted` in [docs/restructure/decisions.md](docs/restructure/decisions.md) or becomes an ADR without the user's explicit approval.
- **Ask first.**
  - Do not change application code, move files or delete anything without the user's explicit approval for that change.
  - Editing the planning docs under `docs/restructure/` and `docs/adr/` is allowed.
- **One owner per fact.** Link to the owning doc instead of copying it ([docs/restructure/README.md](docs/restructure/README.md) lists the owners).

## Working

- **Steps.** Run each step per [docs/restructure/workflow.md](docs/restructure/workflow.md): spec, approval, change, checks, review, approval to commit.
- **Checks.**
  - `vp run check:lint`, `vp run check:css`, `vp run check:fmt`, `vp run check:unit`, `vp run check:build`.
  - While working, run single tests with `vp test run <path>`.
  - Lint and unit runs are slow: minutes, not seconds.
- **Tools.**
  - A code index (qartez) for code facts.
  - Context7 for current library docs.
  - The Mantine MCP before writing UI.
  - Primary sources for external claims.
