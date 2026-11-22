# Workflow

How a step is run, which ECC skills and tools to use, and where their output goes. **Status: proposal.** How much of this applies to each step is decision D-02.

## Roles

- **Coordinator: the main session (Claude, Codex or Antigravity).** It reads the [start page](README.md), runs the step, and asks you at each gate. There is no separate orchestrator agent.
- **Specialists:** ECC agents and skills, named per job below.
- **Tools:**
  - qartez for code facts;
  - Context7 (`ecc:documentation-lookup`) for current library docs;
  - the Mantine MCP for UI work;
  - Exa for web sources;
  - `vp run check:*` for verification.

## One step

1. **Spec.** Write `specs/<phase>-<step>.md` from the template below. Do only the research this step needs.
2. **Gate 1.** You approve the spec.
3. **Branch.** One branch per step (`ecc:git-workflow`).
4. **Impact.** For high-risk steps only (data, auth, public interfaces, mass moves), run `ecc:change-impact` and put its result in the spec. A missing rollback blocks the step.
5. **Do the work** with the command for the kind of change:

   | Kind of change                 | Command                                     |
   | ------------------------------ | ------------------------------------------- |
   | Move or rename, same behaviour | `/ecc:orch-refine-code`                     |
   | Bug                            | `/ecc:orch-fix-defect`                      |
   | Behaviour change               | `/ecc:orch-change-feature`                  |
   | Dead code                      | `/ecc:refactor-clean`, one deletion per run |
   | Config or docs only            | plain edits                                 |

6. **Verify.** Run `ecc:verification-loop` using `vp run check:lint`, `check:css`, `check:fmt`, `check:unit` and `check:build`.
7. **Review.** Run `/ecc:orch-review`. CRITICAL and HIGH findings block the step. Add `ecc:security-review` and agent `convex:convex-reviewer` for auth or secrets.
8. **Gate 2.** You confirm the commit. `ecc:conventional-commit-review` drafts the message.
9. **Close.** Tick the step in [phases.md](phases.md), mark the G-rows it closes, and update the start page. Record a decision in the queue and an ADR only if one was made.

## Spec template (`specs/<phase>-<step>.md`)

```md
# <phase>-<step>: <title>

Status: draft | approved | done
Decisions used: D-xx (accepted only)

## Scope — in / out

## Evidence — links to research rows, plus anything newly checked (file:line)

## Change — what moves or changes

## Verify — commands and the expected result

## Rollback — how to undo; irreversible effects (data, persisted keys, URLs)
```

## Where ECC output goes

ECC skills each have their own default paths. Tell every skill which of these to use:

| Output                                      | Goes to                                                                                                                           | ECC default it replaces                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Plans                                       | [phases.md](phases.md) and `specs/`                                                                                               | `plans/` (`blueprint`), `.claude/plans/` (`/plan`)    |
| Decisions                                   | the [decisions.md](decisions.md) queue; an ADR in [../adr/](../adr/README.md) only once you accept                                | —                                                     |
| Impact reports                              | the step's spec, under Evidence or Rollback                                                                                       | the response only (`change-impact`)                   |
| Research                                    | `research/<topic>.md`, tagged by how each claim was checked                                                                       | —                                                     |
| Glossary                                    | per D-18                                                                                                                          | `CONTEXT.md`                                          |
| Task status                                 | [phases.md](phases.md)                                                                                                            | an issue tracker                                      |
| Doc roles (map, status, history, ADR index) | `.governance/docs-map.json`, added at the end of P0, so ECC's read-only `audit-docs.py` can check links, ADR statuses and orphans | defaults such as `CLAUDE_MAP.md`, `PROJECT_STATUS.md` |

## Other defaults

- **Coverage.** Don't enforce ECC's 80 % default until D-11 is decided.
- **Parallel work.** Use one session per step, and never let two writers touch the same files.
- **Size of reviews.** Run `ecc:council` once per contested question, with short context. It writes no files.

## Candidates for later (not created)

Add these only once the module boundaries are known (after P4) and a job recurs:

- **Nested instruction files.** `AGENTS.md` per package. Each harness loads them differently (see [research/harnesses.md](research/harnesses.md)), so the root file must stay enough on its own.
- **A project skill for "run one step".** It would need both `.agents/skills/` and `.claude/skills/`. `.claude/skills` is git-ignored today. Revisit if agents keep drifting from the routine above.
- **Project agents.** Formats differ per harness. A candidate is a read-only verifier for "does this research row still hold?".
