# Restructure: start here

This page is the entry point for you and for any agent session. It owns the current phase, what is blocked, and the next action.

## Now

|                 |                                                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase**       | P0, planning system review ([phases.md](phases.md))                                                                                                                                            |
| **Waiting on**  | Your review of these documents and of the [cleanup list](cleanup.md)                                                                                                                           |
| **Blocked**     | Everything else. No application code changes until P0 is approved                                                                                                                              |
| **Next action** | After P0 is approved: delete the old docs per the cleanup list, add `.governance/docs-map.json`, then decide the P1 items in [decisions.md](decisions.md) (D-01, D-02, D-03, D-04, D-11, D-13) |
| **Updated**     | 2026-11-22, commit `4550705`                                                                                                                                                                   |

## Reading order

Read only what the task needs.

1. **This page.**
2. **[decisions.md](decisions.md):** your answers so far (A-1…A-12) and the open decisions. Only `accepted` entries are decisions.
3. **[phases.md](phases.md):** the phase order, the step status, and which gaps each phase covers.
4. **[workflow.md](workflow.md):** how one step is run, which ECC skills to use, and where output goes.
5. **[research/](research/README.md):** evidence, only for the topic at hand.
6. **[../adr/](../adr/README.md):** accepted decisions.

## Rules for this folder

- **One owner per fact.**

  | Fact                 | Owner                           |
  | -------------------- | ------------------------------- |
  | Status               | this page                       |
  | Phase and step state | [phases.md](phases.md)          |
  | Decision state       | [decisions.md](decisions.md)    |
  | Decision reasoning   | an ADR                          |
  | Evidence             | [research/](research/README.md) |

  Other files link to the owner instead of copying it.

- **Research and specs are snapshots.** Re-check a row against the code before acting on it.
- **Nothing becomes accepted without the user's explicit approval.** This covers proposals from Claude, ChatGPT, ECC or research.
- **Superseded docs are deleted, not archived.** Git history keeps them.

## Not in scope here

`apps/docs/` (the capability catalog) has not been verified, and it contradicts the code in several places (see [cleanup.md](cleanup.md)). Don't use it as evidence. Its "potential" content is ideas only and is not loaded by default.
