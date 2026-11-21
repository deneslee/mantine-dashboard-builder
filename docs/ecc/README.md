# ECC for the repository review

How ECC (Everything Claude Code, plugin `ecc@ecc` 2.2.3) and the surrounding Claude Code setup are configured for this review, and how to use them.

- **Start here:** [restructure-playbook.md](restructure-playbook.md), the step-by-step review run with ECC.
- **Scope:** this folder replaces `docs/review/` as the starting point. The playbook deliberately does not take `docs/review/` as input, so the review runs fresh.

Written 2026-11-21. Facts below were verified in that session unless marked otherwise.

## Current setup (machine-level, not in the repo)

| Area                           | State                                                                                                                                  | Where                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| ECC plugin                     | `ecc@ecc` 2.2.3, user scope, marketplace `https://github.com/affaan-m/ECC.git`                                                         | `claude plugin list`                                                        |
| ECC hook profile               | `standard`                                                                                                                             | `~/.claude/settings.json` → `pluginConfigs`                                 |
| GateGuard (fact-forcing gate)  | off: `ECC_GATEGUARD=off`                                                                                                               | `~/.claude/settings.json` → `env`                                           |
| Observer (continuous learning) | off: `ECC_SKIP_OBSERVE=1` (it cost ~1.6 s per tool call)                                                                               | same                                                                        |
| MCP pre-probe                  | off: `ECC_DISABLED_HOOKS=pre:mcp-health-check` (each qartez probe waited the full 5 s timeout)                                         | same                                                                        |
| ECC runtime packages           | `@iarna/toml`, `ajv`, `js-yaml`, `sql.js`, `zod` (ECC-pinned versions)                                                                 | `~/.claude/ecc-deps` (pnpm), `NODE_PATH` in settings `env`                  |
| Skill listing budget           | `skillListingBudgetFraction: 0.05`, so all ~442 plugin skills and commands keep their descriptions (~44K tokens/turn)                  | `~/.claude/settings.json`                                                   |
| rtk                            | covers Bash **and** PowerShell; DeepSeek timeout 180 s; extra rule for `pnpx/pnx/pnpm dlx vp …`, `vpr …`, `vp check`, `vp fmt --check` | `~/.claude/settings.json` hooks, `%APPDATA%\rtk\pipeline.toml`              |
| rtk and MCP                    | qartez and mantine MCP output passes through **uncompressed**; other MCP servers are compressed locally                                | `%APPDATA%\rtk\pipeline.toml` (`qartez-passthrough`, `mantine-passthrough`) |
| Local skills                   | removed (`.claude/skills`, `.agents/skills`, `skills-lock.json` emptied)                                                               | repo                                                                        |

### Reverting

- **Whole settings file:** `~/.claude/settings.json.bak-*` are snapshots taken before each change (`bak-nodepath`, `bak-rtkmatcher`, `bak-gateguard`, `bak-eccperf`, `bak-skillbudget`). Copy the one from before the change you want to undo over `settings.json`, then restart Claude Code.
- **Skill budget only:** delete the `skillListingBudgetFraction` line.
- **A single ECC hook:** remove its entry from the `env` block (`ECC_GATEGUARD`, `ECC_SKIP_OBSERVE`, `ECC_DISABLED_HOOKS`).
- **Local skills:** `git checkout skills-lock.json` restores the committed lock (2 entries). The 15 patterns.dev skills came from `PatternsDev/skills` @ `48bf58a`; reinstall with the `skills` CLI if needed.

## Known limits

- **Plugin skills can't be hidden one by one.** `skillOverrides` has no effect on them (the 17 `convex:*: "off"` entries in `.claude/settings.local.json` do nothing). To hide an agent use `permissions.deny: ["Agent(<name>)"]`; the exact plugin name format (`ecc:<name>`) is untested.
- **Models with 200K windows** (Haiku, many subagents) still truncate the skill list. Name ECC skills explicitly in prompts (`use ecc:blueprint`).
- **Path-gated skills** (frontmatter `paths:`) load only once Claude touches a matching file.
- **Cloud sessions** load no plugins and no `~/.claude`, so ECC isn't there. Only files committed to `.claude/` reach them.
- **ECC's npm packages:** Claude Code doesn't install them (ECC's `package.json` uses `overrides`), hence `~/.claude/ecc-deps`. Update that folder when ECC changes its dependencies.
- **`rtk hook check`** gives misleading results for this repo. Use `rtk pipeline explain --tool PowerShell --command "…"`.
