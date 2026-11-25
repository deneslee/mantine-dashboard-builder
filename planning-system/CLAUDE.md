@AGENTS.md

## Claude Code only

- **ECC skills.** Use the ECC (`ecc:*`) skills and agents named in [docs/restructure/workflow.md](docs/restructure/workflow.md) instead of generic agents.
- **Output paths.** Plans, tasks, research and decisions go only where `.agents/skills/planning/SKILL.md` says. Do not write to `plans/`, `.claude/plans/` or `docs/impacts/`.
- **Project skills.** They are in `.agents/skills/`, which Claude Code does not load. Read their `SKILL.md` directly, as AGENTS.md says. `.claude/skills/` is git-ignored.
