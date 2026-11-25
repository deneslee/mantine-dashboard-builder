# ECC surface: which skills load every session (research, `ecc:agent-sort`, 2026-11-22)

## Question

ECC 2.2.3 loads about 414 skills and commands into every session in this repo, plus 72 agents. Which ones does the repo actually use, and how can the rest be kept reachable without being loaded by default?

**Status:** the skills and commands step of the install plan was applied on 2026-11-22, with the user's approval: 387 `ecc:*` entries were added to `.claude/settings.local.json`. The other plan items (agents, rules, hooks) are still proposals.

## Stack (repo facts, verified)

- **TypeScript and React 19.** 269 `.ts` and 152 `.tsx` files (`git ls-files`); `react ^19.3.1` and `typescript ^7.0.2` in `package.json`.
- **UI.** Mantine 9.8.1, TanStack Router/Query/Table/Virtual, Zustand, ECharts and Recharts (`package.json`).
- **Tooling.**
  - Vite+ (`vp`) runs dev, lint, format, test and build (`package.json` scripts).
  - Vitest uses the Playwright browser provider (`vitest.config.ts:3`, `:62`).
  - Storybook 10 with `addon-a11y` (`.storybook/`, `*.stories.tsx`).
  - Stylelint (`package.json`).
- **Backend.**
  - Convex (`convex/`).
  - The `relay/` Node package with a Dockerfile (`pnpm-workspace.yaml`, `relay/Dockerfile`).
  - AWS SDK clients.
- **CI.** GitHub Actions runs `vp run check:lint|css|fmt|unit|build` (`.github/workflows/ci.yaml:36-48`).
- **Package manager.** pnpm 12.
- **Not present.**
  - No `.py` files.
  - No Go, Rust, JVM, Swift, Dart, PHP or Ruby sources.
  - The healthcare terms found in `src/` are test fixture names only (`src/core/records/recordKeys.test.ts:10`). "CDSS" in the folder path is not evidence.

## How ECC is installed today (verified)

- **Plugin.** `ecc@ecc` is enabled at user scope with `hook_profile: standard` (`~/.claude/settings.json`).
  - Set there: `ECC_GATEGUARD=off`, `ECC_SKIP_OBSERVE=1`, `ECC_DISABLED_HOOKS=pre:mcp-health-check`.
- **Size.** 328 skills, 99 commands (the two lists overlap, so 414 unique names), 72 agents. Counted from the plugin cache, version 2.2.3.
- **Rules.**
  - No ECC rules are installed: `~/.claude/rules` does not exist, and the repo has no `.claude/rules`.
  - `orch-pipeline` still cites `rules/common/*.md`, including the 80 % coverage rule. workflow.md says not to enforce that until ADR-0011 is decided.
- **Hooks.**
  - All 56 hook commands in `hooks/hooks.json` are `node -e …`, so they run on Windows.
  - Nothing there is off-stack for this repo.
- **The lever that already exists.**
  - `.claude/settings.local.json` uses `skillOverrides` for plugin skills: `convex:*` is `off` and `anthropic-skills:docx|pdf|pptx|xlsx` are `user-invocable-only`.
  - The file is git-ignored (`~/.config/git/ignore:4`), so the setting is per-machine and per-project.

## DAILY (27): loaded every session

| Item                                                                                                                                            | Evidence                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `council`, `architecture-decision-records`                                                                                                      | ADR process: [workflow.md](../workflow.md), [adr/README.md](../../adr/README.md), ADR-0004                              |
| `change-impact`, `git-workflow`, `documentation-lookup`, `verification-loop`, `conventional-commit-review`, `security-review`, `refactor-clean` | step routine, [workflow.md:11-34](../workflow.md)                                                                       |
| `orch-refine-code`, `orch-fix-defect`, `orch-change-feature`, `orch-review`                                                                     | change table and review gate, [workflow.md:26-33](../workflow.md)                                                       |
| `docs-governance`                                                                                                                               | `.governance/docs-map.json` and `audit-docs.py`, [workflow.md:66](../workflow.md)                                       |
| `orch-pipeline`, `tdd-workflow`, `code-review`, `build-fix`, `plan`                                                                             | the orch-* skills delegate to these (`orch-pipeline/SKILL.md:34`, `:65-94`). Demoting them would break the step routine |
| `typescript-patterns`                                                                                                                           | 421 TS/TSX files                                                                                                        |
| `react-patterns`, `react-testing`, `react-review`, `react-build`, `react-test`                                                                  | React 19, Testing Library and Vitest in `package.json`                                                                  |
| `vite-patterns`                                                                                                                                 | Vite+ and `vite.config.ts`                                                                                              |
| `frontend-a11y`                                                                                                                                 | Storybook `addon-a11y`, Mantine UI                                                                                      |

Caveat: workflow.md is itself `Status: proposal` (line 3). The first two groups are **DAILY pending ADR-0002**. If that ADR drops a step, its skill moves to LIBRARY.

## LIBRARY (387): reachable, not loaded by default

They stay installed and can still be invoked as `/ecc:<name>`. The full list is generated by the script described under Verification.

| Group                          | Examples                                                                                                                                                                                                                                                          | Why LIBRARY                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Other languages and frameworks | `django-*`, `golang-*`, `rust-*`, `kotlin-*`, `swift*`, `laravel-*`, `springboot-*`, `quarkus-*`, `python-*`, `cpp-*`, `dart-*`, `vue-*`, `nuxt4-*`, `angular-*`, their `*-build`, `*-review` and `*-test` commands                                               | no sources in the repo                                                               |
| Other domains                  | `healthcare-*`, `hipaa-*`, logistics, energy, trading, crypto, video, marketing, investor, social, network and homelab                                                                                                                                            | no domain code; the healthcare terms are fixture names only                          |
| On-stack but occasional        | `react-performance`, `e2e-testing`, `design-system`, `accessibility`, `error-handling`, `coding-standards`, `search-first`, `review-pr`, `orch-add-feature`, `orch-build-mvp`, `feature-dev`, `blueprint`, `docker-patterns`, `deployment-patterns`, `github-ops` | useful for some steps, not every session                                             |
| Doc-format references          | `story-lifecycle`, `brownfield-retrospective`, `codebase-onboarding`                                                                                                                                                                                              | [README.md:47-49](../README.md) borrows their formats; nothing invokes them per step |
| ECC housekeeping               | `configure-ecc`, `skill-stocktake`, `instinct-*`, `hookify*`, `loop-*`, `epic-*`, `multi-*`, `prp-*`, `sessions`, `save-session`                                                                                                                                  | operator tools, invoked by name                                                      |

## Install plan (proposal, not applied)

1. **Skills and commands.** Add the 387 LIBRARY names to `skillOverrides` in `.claude/settings.local.json` as `"ecc:<name>": "user-invocable-only"`.
   - Keep the `convex:*` and `anthropic-skills:*` entries that are already there.
   - Leave the DAILY names unset.
   - Don't use `off`. LIBRARY means reachable, not deleted.
2. **Agents.** No change. No per-project mechanism for plugin agents has been found (open question 1).
   - These agents are used by DAILY items: `planner`, `architect`, `tdd-guide`, `code-reviewer`, `security-reviewer`, `typescript-reviewer`, `react-reviewer`, `build-error-resolver`, `react-build-resolver`, `refactor-cleaner`, `commit-reviewer`.
3. **Rules.** Install none for now.
   - `typescript`, `react`, `web` and `common` match the stack.
   - But `common` brings the 80 % coverage rule, so wait for ADR-0011 (open question 2).
4. **Hooks.** No change. They are node-based and compatible with Windows. The user-scope profile is yours to keep.
5. **No `skill-library` router.** The `user-invocable-only` names already serve as the searchable library.
6. **Nothing in `.claude/skills/` or in user-scope settings.**

## Verification

What was checked:

- All 27 DAILY names exist in the plugin cache: the script reported `missing: []`.
- The generated override map has exactly 387 entries and no DAILY name in it.
  - Script: `sort.mjs` in the session scratchpad.
  - It is regenerated from the plugin cache, so it changes when ECC changes.
- Every LIBRARY item is either off-stack or not invoked by any DAILY item. This was checked against the orch-pipeline agent map.

Not verified:

- That `skillOverrides` hides these items in a live session. It takes effect in the next session.
- The 13 names that are both a skill and a command. Whether one override key covers both is untested.

## Open questions

1. Can plugin agents be scoped per project? If not, all 72 stay listed.
2. Should the ECC `typescript`, `react` and `web` rules be installed now, with `common` waiting for ADR-0011? Or should none be installed until ADR-0002?
3. Should the three doc-format skills (`story-lifecycle`, `brownfield-retrospective`, `codebase-onboarding`) stay model-invocable, in case agents need to read their formats?
