---
id: T3
title: Delete the old planning docs
status: planned
depends_on: [T2]
---

## Do

- Delete what `docs/restructure/cleanup.md` lists, plus `docs/restructure/` and `docs/adr/`
- Skim `docs/review/*` first for anything to keep
- Update links in `README.md`, `AGENTS.md`, `CLAUDE.md`
- Code comments that point at old docs (`oxlint.config.ts`, `lint/plugin.js`, `lint/rules.test.ts`): ask the user first

## Done when

- No file links to a deleted doc
- `vp test run lint/docs.test.ts` passes

## Rollback

- `git revert` the commit
