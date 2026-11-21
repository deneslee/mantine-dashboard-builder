# Status

Last update: Nov 21, 2026. This page records what changed and what is open. It is not a plan: the target and the order of work are in [target/architecture.md](target/architecture.md).

## Done on Nov 21, 2026

We checked the review audit again against `main`. Each finding that was still true went into one of these PRs:

| PR                                                                   | Change                                                                                                 | State  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| [#49](https://github.com/deneslee/mantine-dashboard-builder/pull/49) | Git stops tracking `floorplan/` (third-party tool output). Local copies stay on disk.                  | Open   |
| [#50](https://github.com/deneslee/mantine-dashboard-builder/pull/50) | Sentry is optional. It starts once per page load and the app works without a DSN.                      | Merged |
| [#51](https://github.com/deneslee/mantine-dashboard-builder/pull/51) | CI runs on pull requests. Node and pnpm versions agree. Unused packages are removed.                   | Merged |
| [#52](https://github.com/deneslee/mantine-dashboard-builder/pull/52) | Fixes the import cycle in the Google plugin, 14 dead links, and errors in `README.md` and `AGENTS.md`. | Open   |

## Next

1. Merge #49 and #52. Before you merge #52, check its links to old docs at commit `0e400dd`.
2. Decide these open items:
   - **Floorplan history.** #49 removes the files from the tree only. To remove them from git history too, a history rewrite and a force-push are necessary.
   - **`src/lib/records/watchRecords.ts`.** Nothing uses it, but [target/contracts.md](target/contracts.md) lists it in the record-provider contract. Delete it, or keep it for a provider that can push changes.
   - **`docs/node-studio/`.** It is a plan, and `AGENTS.md` says the repo holds no plans. Keep it, or move it out.
   - **Convex AI guidelines.** `AGENTS.md` points to `convex/_generated/ai/guidelines.md`, but the file is not in the repo. Run `pnpm dlx convex ai-files install`, or remove the line.

## Later

- **Convex auth.** The functions in `convex/records.ts` are public and do not check auth. Add auth before you deploy Convex.
- **Sentry DSN.** Set `VITE_SENTRY_DSN` when the app goes live. Until then, Sentry stays off.
