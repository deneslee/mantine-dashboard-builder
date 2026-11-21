# ECC agent-sort: DAILY vs LIBRARY for mantine-dashboard-builder

Date: 2026-11-21 · ECC 2.2.3 (Claude plugin `ecc@ecc`, user scope) · Mode: audit, nothing installed or removed.

Inputs are facts from the repo and from ECC's own manifests and installer dry runs. Recommendations and open questions are marked as such.

## STACK (observed)

| Area             | Evidence                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language         | 269 `.ts` + 152 `.tsx`, `tsconfig*.json`, 34 `.css`. No `.py/.go/.rs/.java/.kt/.swift/.vue` sources                                                 |
| UI               | React 19, Mantine 8 (`@mantine/*`), TanStack Router/Query/Table/Virtual, Zustand + zundo + immer, echarts/recharts, react-grid-layout               |
| Build            | Vite+ (`vite-plus`, `vp run check:*`), `vite.config.ts`, oxlint (`oxlint.config.ts`), stylelint                                                     |
| Tests            | 115 `*.test.*`/`*.stories.tsx` files, Vitest, Testing Library, Storybook 10 + addon-vitest/a11y, Playwright browser mode                            |
| Backend          | Convex (`convex/schema.ts`, `records.ts`, `convex-test`), `relay/` workspace: Hono + mssql + mongodb (+ `relay/Dockerfile`), AWS SDK clients in app |
| Package manager  | pnpm 12 (`packageManager`, `pnpm-lock.yaml`, workspace `relay`)                                                                                     |
| CI               | `.github/workflows/ci.yaml` (vp check:lint/css/fmt/unit/build), `github-pages.yaml`                                                                 |
| Operator surface | Windows 11, PowerShell tool on, MCP: mantine (project), qartez (user), convex plugin; ongoing architecture audit (`AGENTS.md`, `docs/review/`)      |

## Constraint that shapes the plan (observed)

- **Plugin skills can't be trimmed one by one.** `skillOverrides` doesn't apply to plugin skills (code.claude.com/docs/en/skills). The repo's 17 `convex:*: "off"` entries in `.claude/settings.local.json` therefore do nothing.
- **Agents can be hidden.** `permissions.deny: ["Agent(<name>)"]` works for built-in and custom subagents (code.claude.com/docs/en/sub-agents). The exact name format for plugin agents (`ecc:<name>`) is untested.
- **ECC's managed installer isn't narrow either.** Every dry run, including `--skills <22 ids>`, pulled in all 72 agents, all 99 commands and all 23 rule sets, because of module dependencies (`framework-language` requires `rules-core`). `--without baseline:rules` fails with exactly that error.

| Dry run (`--target claude`)                | ops | skills | agents | commands | rule sets |
| ------------------------------------------ | --- | ------ | ------ | -------- | --------- |
| `--skills <22 DAILY>`                      | 589 | 155    | 72     | 99       | 23        |
| `--profile minimal`                        | 435 | 54     | 72     | 99       | 23        |
| `--profile minimal --with lang:typescript` | 562 | 130    | 72     | 99       | 23        |

- **ECC rules are mostly path-scoped.** 111 of 121 rule files have `paths:`. `common` (10 files, ~20 KB) has none, so it would load every session. The plugin installs no rules at all today.

## DAILY (recommended, with evidence)

### Skills (22 of 328)

| Skill                                                       | Evidence                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| typescript-patterns, coding-standards, error-handling       | 421 .ts/.tsx files                                              |
| react-patterns, frontend-patterns                           | React 19, 152 .tsx                                              |
| react-performance                                           | echarts/recharts, react-virtual, react-grid-layout dashboards   |
| react-testing, tdd-workflow                                 | 115 test/story files, Vitest + Testing Library                  |
| e2e-testing                                                 | Playwright + `@vitest/browser-playwright`                       |
| vite-patterns                                               | `vite.config.ts`, Vite+                                         |
| verification-loop                                           | CI runs vp check:lint/css/fmt/unit/build                        |
| frontend-a11y                                               | `@storybook/addon-a11y`, Mantine UI                             |
| make-interfaces-feel-better                                 | Mantine dashboard UI, 34 CSS files                              |
| security-review                                             | relay runs mssql/mongodb drivers, AWS SDK clients               |
| git-workflow                                                | GitHub repo, PR flow                                            |
| architecture-decision-records, search-first                 | active architecture audit                                       |
| documentation-lookup                                        | fast-moving Mantine/TanStack/Convex APIs                        |
| configure-ecc, context-budget, ecc-guide, strategic-compact | ECC operation (ECC's own `lean@1` kernel names the first three) |

### Agents (18 of 72)

typescript-reviewer, react-reviewer, code-reviewer, silent-failure-hunter, type-design-analyzer (TS) · build-error-resolver, react-build-resolver (Vite+) · tdd-guide, pr-test-analyzer, e2e-runner (tests) · security-reviewer (relay DB drivers) · a11y-architect · performance-optimizer · docs-lookup · planner, architect, code-explorer, refactor-cleaner (audit/redesign)

### Commands (25 of 99)

plan, code-review, orch-review, pr, prp-commit, build-fix, react-review, react-build, react-test, test-coverage, quality-gate, checkpoint, refactor-clean, orch-refine-code, orch-fix-defect, orch-change-feature, security-scan, update-docs, harness-audit, setup-pm, model-route, aside, ecc-guide, save-session, resume-session

### Rules (4 of 22)

common (always loaded) · typescript, react, web (path-scoped to matching files)

### Hooks (standard profile)

| Hook                                                                                                                                                                                                                                                                           | Bucket                                 | Note                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bash dispatcher (`pre:bash:block-no-verify`, command-log audit/cost, pr-created, build-complete; tmux/push/commit-quality reminders only in `strict`), config-protection, mcp-health-check (pre/post), pre:compact, suggest-compact, skill:track, session/lifecycle bootstraps | DAILY                                  | Safety and bookkeeping; work on Windows                                                                                                                                                                                                         |
| gateguard-fact-force (`pre:edit-write:`, `pre:powershell:`, `pre:bash:`)                                                                                                                                                                                                       | **Disabled (decided 2026-11-21)**      | `ECC_GATEGUARD=off` in `~/.claude/settings.json` env. It had blocked about 8 calls this session                                                                                                                                                 |
| pre:observe (every tool)                                                                                                                                                                                                                                                       | **Disabled (decided after measuring)** | `ECC_SKIP_OBSERVE=1`. Measured 1,555–1,751 ms per tool call vs 378 ms skipped; it had logged 451 KB to `~/.local/share/ecc-homunculus/` that day                                                                                                |
| pre:mcp-health-check                                                                                                                                                                                                                                                           | **Disabled**                           | `ECC_DISABLED_HOOKS=pre:mcp-health-check`. It spawns a second copy of each stdio MCP server; qartez never exits, so each probe hit the 5 s timeout (5,274 ms), once per 2-minute cache window. `post:mcp-health-check` (real failures) stays on |
| config-protection                                                                                                                                                                                                                                                              | DAILY (note)                           | Blocks edits to existing `.stylelintrc.json` but not `oxlint.config.ts`: inconsistent coverage for this repo's linters                                                                                                                          |
| pre:write:doc-file-warning                                                                                                                                                                                                                                                     | **Keep (decided)**                     | Warns only, never blocks, and only on ad-hoc names (NOTES, TODO, …) outside structured folders                                                                                                                                                  |
| plan-canvas-sessions (SessionStart)                                                                                                                                                                                                                                            | LIBRARY                                | Only needed if you use `/plan-canvas`                                                                                                                                                                                                           |
| hookify-runtime                                                                                                                                                                                                                                                                | LIBRARY                                | No hookify rules exist yet; cheap to keep                                                                                                                                                                                                       |

## LIBRARY (keep reachable, don't load by default)

- **Skills (306):** every language/framework stack absent from the repo (Python/Django/FastAPI, Go, Rust, Java/Spring/Quarkus, Kotlin/Android, Swift/iOS, C++/C#/F#, PHP/Laravel, Ruby/Rails, Perl, Dart/Flutter, Godot, Angular, Vue/Nuxt, Next.js, React Native) and all domain packs (healthcare, homelab/network, supply chain/logistics, finance/billing, prediction markets/Ito, social/marketing/media/video, scientific DBs, ML/PyTorch). Also borderline items for this repo: backend-patterns, api-design, docker-patterns (relay), database-migrations, design-system, accessibility, browser-qa, click-path-audit, codebase-onboarding, workspace-surface-audit, agent-sort, skill-stocktake, deep-research, exa-search.
- **Agents (54):** agent-evaluator, bengali-reviewer, chief-of-staff, code-architect, code-simplifier, comment-analyzer, commit-reviewer, conversation-analyzer, cpp-build-resolver, cpp-reviewer, csharp-reviewer, dart-build-resolver, database-reviewer, django-build-resolver, django-reviewer, doc-updater, fastapi-reviewer, flutter-reviewer, fsharp-reviewer, gan-evaluator, gan-generator, gan-planner, gdscript-reviewer, go-build-resolver, go-reviewer, harmonyos-app-resolver, harness-optimizer, healthcare-reviewer, homelab-architect, java-build-resolver, java-reviewer, kotlin-build-resolver, kotlin-reviewer, loop-operator, marketing-agent, mle-reviewer, network-architect, network-config-reviewer, network-troubleshooter, opensource-forker, opensource-packager, opensource-sanitizer, php-reviewer, python-reviewer, pytorch-build-resolver, rag-pipeline-reviewer, ruby-reviewer, rust-build-resolver, rust-reviewer, seo-specialist, spec-miner, swift-build-resolver, swift-reviewer, vue-reviewer
- **Commands (74):** all cpp/go/kotlin/rust/flutter/python/vue/fastapi/gradle variants, epic-_, instinct-_, hookify-_, multi-_, gan-_, prp-plan/prd/implement/pr, loop-_, marketing-campaign, jira, pm2, santa-loop, skill-create/health/host-compat, ui-canvas, plan-canvas, token-card, update-codemaps, and others.
- **Rules (18):** angular, arkts, cpp, csharp, dart, fsharp, golang, java, kotlin, nuxt, perl, php, python, react-native, ruby, rust, swift, vue

## INSTALL PLAN (recommendation)

### A. Keep the plugin and trim what can be trimmed (recommended now)

1. **Hide the 54 LIBRARY agents** with `permissions.deny` entries in `.claude/settings.local.json` (this repo only, not committed) or `~/.claude/settings.json` (all repos). Test the name format on one agent first (`Agent(ecc:vue-reviewer)` vs `Agent(vue-reviewer)`), then add the rest.
2. **Hooks:** done. GateGuard is off via `ECC_GATEGUARD=off`; observer and doc-file-warning stay. To disable other single hooks later, list their IDs in `ECC_DISABLED_HOOKS`.
3. **Skills/commands:** leave the plugin's full set. Claude Code already caps the skill listing at about 1% of the context window and drops descriptions of the least-used skills first. Check the real cost with `/skill-doctor` and `/context`.
4. **Convex:** the plugin is DAILY (`convex/` exists). The 17 `convex:*` overrides are ineffective. Keep them only as documentation of intent, or remove them later.

Cost: minutes. Saves the agent listing (roughly 54 long descriptions). Skills stay as they are.

### B. Managed install for per-skill control (later, if A isn't enough)

1. `claude plugin uninstall ecc@ecc`, then run `ecc install --target claude --profile minimal --with lang:typescript` (130 skills, all agents, commands and rules land in `~/.claude/`).
2. Set `skillOverrides` (which works for user skills): DAILY = default `on`, LIBRARY = `"name-only"` (stays visible to a router and costs only its name) or `"off"`.
3. Deny the LIBRARY agents as in A.1.
4. Optionally add `.claude/skills/skill-library/SKILL.md` as a router (grouped trigger keywords pointing at LIBRARY skills), or use an external `UserPromptSubmit` router such as skillfish-router or meta-router.

Costs: you lose plugin auto-update (you'd run `ecc update` yourself), the hook wiring changes, and this needs its own dry run plus a `/configure-ecc` re-check. Not tested here beyond the dry runs above.

### C. Project-scoped for cloud sessions (open question)

Cloud sessions load neither plugins nor `~/.claude`. Committing the DAILY skills and agents into the repo's `.claude/` (`--target claude-project`) would make them available there. Because of module dependencies this means hundreds of files in the repo, so it's not recommended during the audit.

## VERIFICATION

- Ran: repo file-type counts, `package.json`/workspace/CI inspection, an ECC component inventory (328 skills, 72 agents, 99 commands, 22 rule sets, 21+ hook entries), a classifier script (every DAILY id exists in ECC: missing = none), installer dry runs (table above), and a rule path-scoping scan.
- Not verified: the `Agent(ecc:…)` deny name format; whether `skillOverrides` hides `~/.claude/commands/*` entries after a managed install; the real per-turn token cost (use `/context` and `/skill-doctor`).
- Nothing was installed, removed, or changed by this report.

## Open questions

1. ~~Keep or disable GateGuard, `pre:observe`, `doc-file-warning`?~~ Decided: GateGuard off, the other two kept.
2. Is A enough, or do you want B's per-skill control (accepting manual updates)?
3. Should the redesigned repo carry a project-scoped DAILY set for cloud sessions (C)?
4. Is the 58-skill `.claude/skills/` set (patterns.dev style, several Vue-only) part of this sort? It's outside ECC and was not classified here.
