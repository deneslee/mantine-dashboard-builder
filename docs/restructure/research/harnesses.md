# Agent harnesses: how instructions, skills and agents load (research for the planning system, P0)

**Research for:** how `AGENTS.md`, `CLAUDE.md`, skills and agents are laid out ([P0](../phases/P0-planning-system.md)).

Last verified: 2026-11-22, from official docs only. Each row cites its source page. The harnesses in use are Claude Code, Codex and Antigravity (user answer, 2026-11-22).

## Question this answers

What does each harness read from the repository, so that one set of instructions works in all three without copying it?

## Verified (official docs)

| Surface             | Claude Code                                                                                                                                                                          | Codex                                                                                                                                                       | Antigravity                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Root instructions   | `CLAUDE.md` or `.claude/CLAUDE.md`. It reads `AGENTS.md` **only when no `CLAUDE.md` exists**. If both exist, it reads only `CLAUDE.md`, unless `CLAUDE.md` imports `@AGENTS.md` [C1] | `AGENTS.md` (`AGENTS.override.md` wins). `CLAUDE.md` is read only if it is listed in `project_doc_fallback_filenames` [X1]                                  | `AGENTS.md` and `GEMINI.md` (also under `.agents/`), always on [A1]                                                                 |
| Nested instructions | Ancestors load at launch. A subdirectory's `CLAUDE.md` (or its `AGENTS.md`, where it has no `CLAUDE.md`) loads when a file there is first read [C1]                                  | Walks from the repo root down to the cwd, one file per directory. Nearer files come later. Combined size is capped at 32 KiB (`project_doc_max_bytes`) [X1] | Reads the workspace folder and its parents up to the repo root. **Subfolders below the workspace are not read** [A1]                |
| Imports             | `@path`, up to 4 hops deep. Paths in backticks are not imported [C1]                                                                                                                 | Not documented                                                                                                                                              | Not documented                                                                                                                      |
| Scoped rules        | `.claude/rules/*.md` with `paths:` frontmatter [C1]                                                                                                                                  | None documented                                                                                                                                             | `.agents/rules/*.md` with `trigger: always_on \| model_decision \| glob \| manual`. An invalid trigger drops the rule silently [A1] |
| Project skills      | `.claude/skills/<name>/SKILL.md`. **Anything under `.agents/` is not read** [C1, C2]                                                                                                 | `.agents/skills/<name>/SKILL.md`, from the cwd up to the repo root [X2]                                                                                     | `.agents/skills/<name>/SKILL.md` [A2]                                                                                               |
| Project agents      | `.claude/agents/*.md`, Markdown with `name` and `description` frontmatter [C3]                                                                                                       | `.codex/agents/*.toml` with `name`, `description` and `developer_instructions` [X3]                                                                         | `.agents/agents/<name>.md` [A3]                                                                                                     |

Sources:

- [C1] https://code.claude.com/docs/en/memory: the AGENTS.md section, "How CLAUDE.md files load", and path-specific rules.
- [C2] https://code.claude.com/docs/en/skills: the Agent Skills open standard. Six frontmatter fields are portable.
- [C3] https://code.claude.com/docs/en/sub-agents
- [X1] https://developers.openai.com/codex/guides/agents-md
- [X2] https://developers.openai.com/codex/skills
- [X3] https://developers.openai.com/codex/subagents
- [A1] https://antigravity.google/docs/rules/
- [A2] https://antigravity.google/docs/skills/
- [A3] https://antigravity.google/docs/customization-discovery/

## Repo facts (verified)

| Fact                                                                                      | Evidence                 |
| ----------------------------------------------------------------------------------------- | ------------------------ |
| `CLAUDE.md` is a single line, `@AGENTS.md`, so all three harnesses get the same root text | `CLAUDE.md:1`            |
| `.claude/skills` is git-ignored                                                           | `.gitignore:9`           |
| `.codex/config.toml` is empty, and there is no `.agents/` folder                          | file listing, 2026-11-22 |

## Consequences (proposals, not decided)

- **Keep `AGENTS.md` as the one shared instruction file**, and have `CLAUDE.md` import it with `@AGENTS.md` plus a few Claude-only lines. This works in all three harnesses without copying anything.
- **Nested instructions behave differently in each harness.** Antigravity ignores files below the workspace folder. Codex reads only the path down to the cwd. Claude loads them on demand. If nested `AGENTS.md` files are added later, the root file must still be enough on its own.
- **A shared project skill needs two locations:** `.agents/skills/` for Codex and Antigravity, and `.claude/skills/` for Claude, plus a gitignore change. Not needed now (user answer: no skill yet).
- **Agent formats differ in all three** (Markdown, TOML, Markdown). Project agents would be written per harness, so add one only where a recurring job justifies it.

## Open

- Whether Claude Code's `.claude/plans/` is a documented convention: not found in the docs read. Not needed, because plans live in `docs/restructure/`.
