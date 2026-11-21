# Restructure review playbook (with ECC)

Goal: a fresh, evidence-backed review of the repository that ends in a **staged migration plan**: restructure first, then tooling, simplification, CI and tests. The plan is decided up front; carrying it out comes later, one approved step at a time.

Ground rules (from the audit `AGENTS.md`):

- Don't take existing docs, `docs/review/`, plans or agent rules as fact. They are inputs to check, not requirements.
- No changes to application code, no moves, no deletions without explicit approval. Phases 1–4 below are read-only, apart from writing review documents.
- Keep observed facts, user requirements, recommendations and open questions separate in every document.
- Research is allowed to be token-heavy: Exa, Context7 and the Mantine MCP are encouraged when a decision depends on current tool behaviour.

## Where outputs go

ECC skills have their own default paths (`plans/`, `docs/adr/`, `docs/retro/`, `docs/impacts/`, `.claude/notes`). During the review, tell each skill to write here instead, so nothing scatters and nothing is mistaken for an accepted decision:

```
docs/ecc/work/
  01-current-state.md      Phase 1
  02-research/<topic>.md   Phase 2
  03-decisions/NNNN-*.md   Phase 3 (draft ADRs; promoted to docs/adr/ only once accepted)
  04-plan.md               Phase 4 (blueprint output)
  impacts/<step>.md        Phase 5 (change-impact before/after per step)
```

## Phase 1 — Current state (read-only)

qartez exploration already exists, so this phase consolidates it rather than starting over.

| Use                                                                                                                                                                    | Why                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| qartez: `qartez_map`, `qartez_boundaries`, `qartez_hotspots`, `qartez_unused`, `qartez_clones`, `qartez_smells`, `qartez_health` (or the `/qartez_arch_review` prompt) | Graph-level facts: importance, boundary violations, dead and duplicate code, complexity                                              |
| agent `ecc:code-explorer`, once per area: `src/`, `convex/`, `relay/`, `apps/docs`, plugin system (`plugins.config.ts`, `plugins.json`, `scripts/`, `lint/`)           | Execution paths and layers per area, each in its own context                                                                         |
| skill `ecc:brownfield-retrospective`                                                                                                                                   | Gap register on four axes (thinking, coding practice, missing features, technology). Point it at `docs/ecc/work/01-current-state.md` |
| command `/ecc:update-codemaps` (optional)                                                                                                                              | Compact structure maps, reusable as context in later phases                                                                          |

Example prompt:

> Use ecc:brownfield-retrospective on the whole repo. Inputs: qartez results (run qartez_map, qartez_boundaries, qartez_unused, qartez_clones, qartez_hotspots) and one ecc:code-explorer pass per area (src, convex, relay, apps/docs, plugin system). Ignore docs/review and existing plans as sources of truth. Write to docs/ecc/work/01-current-state.md with sections: Observed facts / Gap register / Open questions.

## Phase 2 — Research (token-heavy on purpose)

One file per topic in `docs/ecc/work/02-research/`. Use `ecc:search-first` (adopt, extend or build), `ecc:deep-research` (cited, multi-source; it expects Exa tools named `web_search_exa`/`web_fetch_exa`, which the connected Exa MCP provides; Firecrawl isn't connected), `ecc:documentation-lookup` (Context7) and the Mantine MCP.

**Tooling is researched now, even though it changes later:** the folder layout depends on it (Turborepo/Nx-style `apps/` and `packages/` with clear package boundaries, versus a flatter layout with `vp run` caching).

| Topic                              | Questions                                                                                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task running and caching           | `vp run` / `vpr` and its caching vs Turborepo vs Nx vs moon, **alongside** Vite+ (not replacing it). Local and CI caching, remote cache, affected-only runs, Windows support                               |
| Workspace layout                   | Target shape for a Vite SPA + Convex + `relay/` (Hono + DB drivers) + `apps/docs`: what becomes a package, where shared types live, pnpm workspace and catalogs                                            |
| Plugin system                      | Is the current plugin architecture (`plugins.config.ts`, `plugins.json`, `relay`) earning its complexity? Simpler alternatives                                                                             |
| Test strategy                      | Which tests earn their cost: unit vs component vs Storybook vs Playwright browser mode; removing tests that check nothing useful; test runtime budget                                                      |
| Lint and format scope              | oxlint, stylelint and `vp fmt`: code only (no doc linting), a strictness level that catches bugs rather than style noise, the custom `lint/` rules                                                         |
| CI                                 | GitHub Actions shape: caching, affected-only, required vs optional checks, Pages deploy                                                                                                                    |
| React and app patterns             | React 19 SPA patterns (no SSR/Next.js), state (Zustand + zundo), TanStack Router/Query/Table, Mantine 8 conventions. Sources: react.dev, patterns.dev (SPA-relevant parts only), TanStack and Mantine docs |
| Package-shipped skills (for later) | Which TanStack Intent skills to copy into local skills after the tooling work, and how to keep them in sync (`intent stale`)                                                                               |

Example prompt:

> Use ecc:deep-research for "task runner and caching alongside Vite+: vp run/vpr vs Turborepo vs Nx vs moon for a pnpm workspace on Windows + GitHub Actions". Use Exa and Context7, cite sources, give confidence levels. Write docs/ecc/work/02-research/task-runner.md. End with a recommendation and what would change the recommendation.

## Phase 3 — Decisions

| Use                                       | Why                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| skill `ecc:council`                       | Four perspectives for contested choices (e.g. Turborepo vs `vp run` only; how many packages)             |
| skill `ecc:architecture-decision-records` | One draft ADR per decision in `docs/ecc/work/03-decisions/`, with alternatives and consequences          |
| skill `ecc:context-and-decisions`         | A short glossary (`CONTEXT.md`) if domain terms (dashboard, panel, plugin, relay, record…) are ambiguous |
| skill `ecc:intent-driven-development`     | Acceptance criteria per decision ("restructure done when…")                                              |
| agent `ecc:architect`                     | Second opinion on the target architecture                                                                |

Decisions you've already set as requirements (record them as **user requirements**, not recommendations):

- Keep Vite+; consider better task running and caching (`vpr`, caching, possibly Turborepo, Nx or similar) alongside it.
- Tests are too heavy and partly pointless; the test suite should shrink to what is useful.
- Linting is too much and too strict (including doc linting); reduce scope.
- Order: restructure, then tooling, simplification, CI and tests.
- Library skills (e.g. TanStack) get copied in locally after the tooling work, not loaded via Intent hooks.

## Phase 4 — Staged plan

| Use                          | Why                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| skill `ecc:blueprint`        | Turns the decisions into one-PR-sized steps with a dependency graph, parallel-step detection, a self-contained brief per step, verification commands and exit criteria. Output to `docs/ecc/work/04-plan.md` |
| skill `ecc:plan-orchestrate` | Reads the plan and prints the ECC command to run for each step                                                                                                                                               |
| skill `ecc:change-impact`    | Impact analysis per step before starting (call paths, data, contracts, tests, docs)                                                                                                                          |

Order in the plan: **restructure (moves only, behaviour unchanged) → tooling → simplification → CI → tests**, each with its own verification gate.

## Phase 5 — Execution (needs approval per step)

| Use                                                         | Why                                                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| command `/ecc:orch-refine-code`                             | Behaviour-preserving refactor: confirm green, restructure, stay green, review, gated commit. The default for restructure steps |
| command `/ecc:refactor-clean`, agent `ecc:refactor-cleaner` | Dead code (knip/depcheck/ts-prune), one verified removal at a time                                                             |
| agent `ecc:code-simplifier`                                 | Simplify after the structure is in place                                                                                       |
| skill `ecc:change-impact` (second half)                     | Compare planned impact with the actual diff                                                                                    |
| command `/ecc:orch-review` or `/ecc:code-review`            | Review before each commit                                                                                                      |
| skill `ecc:verification-loop`, command `/ecc:quality-gate`  | Run the repo's checks (`vp run check:*`; rtk digests them)                                                                     |

## Phase 6 — Documentation reset

`ecc:living-docs-governance` and `ecc:docs-governance` give the docs clear roles (constitution, map, status, history). This produces the real `AGENTS.md` and `CLAUDE.md` once the audit versions are retired.

## Practical notes

- **Name ECC skills explicitly** (`use ecc:<name>`). With many plugin skills, explicit names are more reliable than auto-selection, especially in subagents with smaller windows.
- **Subagents for breadth, main session for decisions:** `code-explorer` and research passes run in their own context, and only summaries come back.
- **Large reads** (whole files over 450 lines) are routed by rtk to DeepSeek. For exact code, read ranges or use `qartez_read`; qartez output is never compressed.
- **Not useful for this review:** `ecc:multi-*` (needs an external runtime), the language packs for other stacks, `ecc:agent-sort` (already done), `ecc:harness-audit` (scores harness files, not architecture).
