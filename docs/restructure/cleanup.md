# Cleanup list (awaiting your approval)

This lists what happens to the old planning and research material once you approve the new docs. Nothing has been deleted yet. Superseded files are deleted, not archived; git history (commit `4550705`) keeps them. Delete this file once the list is done.

## Delete: replaced by the new docs

| Path                                                                         | Replaced by                                                                      | Note                                                                                                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ecc/work/01-current-state.md`                                          | [research/current-state.md](research/current-state.md)                           | Re-verified; corrections listed there                                                                                                                    |
| `docs/ecc/work/02-research/*.md` (6 files)                                   | [research/](research/README.md) topic files, [decisions.md](decisions.md)        | Re-verified and condensed                                                                                                                                |
| `docs/ecc/work/04-plan.md`, `04-plan/*.md` (4 files)                         | [phases.md](phases.md), [decisions.md](decisions.md), [workflow.md](workflow.md) | The S0–S8 stages became phases P0–P9                                                                                                                     |
| `docs/ecc/restructure-playbook.md`, `docs/ecc/how-to-use-ecc.md`             | [workflow.md](workflow.md), [research/ecc.md](research/ecc.md)                   | The memory note `use-ecc-skills` already points to the new workflow                                                                                      |
| `docs/ecc/20261121-ecc-agent-sort.md`                                        | —                                                                                | ECC install sorting; machine setup, not project docs                                                                                                     |
| `docs/ecc/README.md`                                                         | —                                                                                | Machine-level ECC, rtk and settings notes with revert steps. **Keep a copy outside the repo if you want those notes**                                    |
| `docs/STATUS.md`                                                             | [README.md](README.md)                                                           | Now a one-line pointer. Its open items moved to [research/carry-over.md](research/carry-over.md)                                                         |
| `docs/current-state.md`                                                      | [research/current-state.md](research/current-state.md)                           | The storage-key table was carried over. The data-flow and "where state lives" sections were **not**; re-derive them from the code when a step needs them |
| `docs/archive/AGENTS-PRE.md`                                                 | [research/carry-over.md](research/carry-over.md)                                 | Its rules are listed there for D-06                                                                                                                      |
| `docs/archive/_EXTRA/**` (perf scripts, results, screenshots, spike patches) | [research/carry-over.md](research/carry-over.md) "Measurements"                  | Not runnable (`SidePanelSplit.tsx` is gone); nothing references them                                                                                     |

## Delete after you skim them (not fully extracted)

No re-verification pass read these in full. Skim them for anything worth keeping, then delete.

- `docs/review/architecture-audit.md`. Its P1–P11 findings are said to be reconfirmed in the gap register; that claim is unverified.
- `docs/review/20261121-1517-ChatGPT-New chat.md`. Its direction D1–D6 is in [research/current-state.md](research/current-state.md) §C.
- `docs/archive/target/architecture.md` and `docs/archive/target/contracts.md`.
- `docs/archive/node-studio/*`. `src/features/node-studio/AGENTS.md` covers the same scope (A-8: keep node-studio).

## Keep, flagged

`apps/docs/` (the capability catalog) is kept but not verified. Do not use it as evidence. Its `potential.md` holds ideas only. Mismatches with the code (checked at `4550705`):

- It says the browser default is IndexedDB; the code uses `localStorage`.
- It lists Convex as providing search, assets, jobs and sign-in; only records exist, with no auth.
- Paraglide, Ajv and `@mantine/schedule` are not dependencies.
- It names Recharts as the default chart; the default widget uses ECharts.
- It says Sentry is an optional plugin; it lives in `src/lib/sentry/`.
- It lists context tabs, nav, commands and a "YAML nav manifest" as decided; there are no implementations.
- It lists many plugin kinds; the code has widget, datasource and record-provider kinds, plus two empty ones.

Where it moves to is a P4 question (G-033).

## References to update when deleting

| Where                                                                      | Points to                                                      | Action                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `README.md`                                                                | `docs/target/*`, `docs/STATUS.md`, `docs/current-state.md`     | Fixed in this pass, except the storage-keys link, which goes when `docs/current-state.md` is deleted |
| `oxlint.config.ts:166,219`, `lint/plugin.js:108`, `lint/rules.test.ts:106` | `docs/target/contracts.md`, `docs/current-state.md` (comments) | **Code comments: they need your OK.** Repoint them in P2                                             |
| `lint/docs.test.ts`                                                        | every `docs/**/*.md` link                                      | Deleting the old docs removes most dead links. Whether the test stays is D-09                        |
| `.github/renovate.json5:32,51`, `vite.config.ts:116`                       | GitHub URLs pinned to commit `0e400dd`                         | None needed; they don't depend on local files                                                        |
