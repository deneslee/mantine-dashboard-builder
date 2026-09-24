# Tasks: Project Structure (bulletproof-react, lightly adapted)

Sep 24, 2026 · v1.1.0 · Reference: [plan-02.md](../plan-02.md)

- [ ] **Baseline with oxlint.** Add the per-layer `no-restricted-imports` overrides and `import/no-cycle` as warnings ([plan-02 enforcement](../plan-02.md#enforcement-oxlint-only-no-dependency-cruiser)). Done when the warning list is saved in the research file and shows the `shell ↔ notifications` cycle.
- [ ] **Move errors and loading into the shared layer.** `features/errors` → `components/errors`, `features/loading` → `components/feedback` + `hooks/useDelayedPending`, with the move committed separately from the import edits. Done when build, test and lint pass.
- [ ] **Split `shared/` and move the shared helpers.** `config.ts` → `config/`, `errors/` → `lib/errors`, `user/` → `lib/user.tsx`, `wait()` → `utils/wait.ts`; delete the empty `hooks|types|utils` folders. Done when `src/shared` is gone and build, test and lint pass.
- [ ] **Move `src/test` to `src/testing`.** Update `setupFiles` in `vitest.config.ts` and the oxlint override glob. Done when `pnpm test` passes.
- [ ] **Split notifications.** `notify` → `lib/notify.tsx`, store → `stores/inbox.ts`, and `Inbox.tsx` and the tab stay in `features/notifications`. Done when `notify.test.tsx` passes and the Inbox tab shows new warnings.
- [ ] **Break the shell ↔ notifications cycle.** `useContextTabs` takes `globalTabs`, `app/shell.tsx` passes `notificationsTab`, and `ContextTab` goes to the shared layer. Done when `import/no-cycle` reports nothing.
- [ ] **Move the shell to `components/shell`.** Done when build, test and lint pass and the Shell stories render.
- [ ] **Remove the barrels.** Delete `features/*/index.ts` and `design-system/index.ts`, rewrite imports as direct paths, and remove the old index-only import rule. Done when no `index.ts` remains under `features/` and the entry chunk has no `react-draggable`.
- [ ] **Move routes to `app/routes`.** Update `routesDirectory` and `generatedRouteTree`, the oxlint globs, and regenerate the route tree. Done when `pnpm dev` and `pnpm build` work and every route loads.
- [ ] **Switch the boundary rules to error.** The direction rules and `import/no-cycle` go to error, with one fixture that imports across features. Done when `pnpm lint` fails on the fixture and passes without it.
- [ ] **Update AGENTS.md and the docs.** New Structure section (tree, import direction, deliberate changes from bulletproof, no barrels), and fix path references in `docs/*.md` and plans 03–05. Done when no doc mentions `src/features/shell`, `src/shared` or `features/*/index.ts`.
