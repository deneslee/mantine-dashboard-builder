# 02 Project structure (bulletproof-react, lightly adapted)

Status: done (Sep 24, 2026) · Cross-cutting · Research: [project-structure](../../research/project-structure.md)

## Objective

Move from "light feature-based, with cross-feature imports through `index.ts`" to bulletproof-react's **layers where imports go one way**:

- no imports across features,
- no barrel files,
- the app layer composes features.

This is a mechanical move plus three small inversions. There is no behaviour change and no Feature-Sliced Design.

## Target structure

```
src/
  app/                       APP LAYER: may import anything; the only place features meet
    routes/                  TanStack file routes (moved from src/routes), thin
    App.tsx  Providers.tsx  router.ts  queryClient.ts  global.css
    shell.tsx                <Shell globalTabs={[notificationsTab]}> composition (inversion 1)
    registry.ts              widget/datasource maps (Plan 05)
    breadcrumbs.ts           useBreadcrumbs() (Plan 04)

  features/                  FEATURE LAYER: may import shared + design-system, never another feature or app
    dashboards/  api/{client,dto,mapper,queries}.ts  components/  hooks/  model/  store.ts?
    settings/    components/  hooks/  model/
    notifications/ components/Inbox.tsx  tab.ts           (inbox UI only)
    debug/
    integrations/  components/ (catalog, Sentry page, settings, verification)  registry.ts
                             Sentry prototype UI, for show only; rebuilt or dropped in Plan 06
    (later) widgets/  datasources/

  components/                SHARED LAYER: shared UI; imports only shared + design-system
    errors/                  ErrorState, WidgetBoundary, NotFound, RouteError, AppCrash, OfflineBanner (from features/errors)
    feedback/                Skeletons, SlowHint, RouteProgress (from features/loading)
    layouts/shell/           Shell, navbar, sidebar, context-bar, panel + its store/hooks/model (from features/shell)
  hooks/                     useDelayedPending, useMotion (Plan 01, now in shared/hooks)
  lib/                       notify.tsx (from notifications), errors/AppError (from shared/errors), user.tsx (from shared/user)
    sentry/                  runtime.ts (startSentry, connectRouter, reportError) + client, router, telemetry, settings, types
                             (from src/integrations/sentry; the app uses only runtime.ts, which loads the SDK lazily)
  stores/                    inbox.ts (from notifications/store: notify writes to it, so it's shared)
  config/                    config.ts (from shared/config.ts)
  types/                     ContextTab, DataFrame, WidgetDefinition, DatasourceDefinition, … (as needed)
  utils/
  testing/                   render, setup, storyRouter (from src/test)

  design-system/             LOWEST LAYER: tokens, theme, Mantine extensions, Page, layers.css (Plan 03)
```

**Allowed imports:** `design-system` ← shared (`components`, `hooks`, `lib`, `stores`, `config`, `types`, `utils`, `testing`) ← `features` ← `app`.

## Changes from plain bulletproof-react (deliberate)

1. **`design-system/` is its own lowest layer**, below `components/`. It owns the tokens and theme (Plan 03), so it can't depend on anything else.
2. **Features keep `api/{client,dto,mapper,queries}.ts` and `model/`** (types and zod), instead of bulletproof's `api/` + `types/`. That keeps the AGENTS.md rule that the UI never sees DTOs.
3. **File names stay PascalCase, named after the export** (AGENTS.md), not kebab-case.
4. **A shared module may keep its own store and hooks together.** `components/layouts/shell/` keeps its Zustand store, `ShellProvider` and hooks. Only `ShellProvider` knows it's Zustand (AGENTS.md composition rule).
5. **Routes live in `app/routes/`** and stay thin. `-name.tsx` files are still ignored by the router. A route may import several features and wrap parts in its own Suspense or error boundary; that's where features meet (bulletproof's discussion route does exactly this with `discussions` + `comments`). A page built only from shared UI needs no feature folder at all.
6. **The app layer composes registries and cross-feature wiring.** Dashboards receive widgets and datasources through a provider, so they never import them (Plan 05).
7. **Barrel files:** none in `features/` or the shared folders. `design-system/index.ts` also goes; import `design-system/theme/theme` and similar directly.

## Three inversions (the only non-mechanical changes)

1. **Shell ↔ notifications cycle:**
   - The shell stops importing `notificationsTab`. `useContextTabs` merges the route's tabs with a `globalTabs` prop.
   - `app/shell.tsx` passes `[notificationsTab]`.
   - `ContextTab` moves to `types/` (or stays in `components/layouts/shell/model` as a shared type).
2. **Moving `notify` breaks the inbox link:** `notify` moves to `lib/` and must still write warnings and errors to the inbox. The inbox store therefore moves to `stores/inbox.ts`, and the feature keeps only `Inbox.tsx` and the tab.
3. **Settings reaches into the shell:** `useAppearanceForm` uses shell hooks. That's allowed once the shell is shared, so no change is needed. Record it as the intended pattern.

## Enforcement (oxlint only; no dependency-cruiser)

- **Direction rules: `no-restricted-imports` overrides by folder:**
  - `src/design-system/**`: no `@/app`, `@/features`, `@/components`, `@/lib`, `@/stores`, `@/hooks`
  - shared folders: no `@/features/**` and no `@/app/**`
  - `src/features/**`: no `@/app/**` and no `@/features/**`
- **Relative imports:** inside a feature, imports are relative. An import from another feature through the alias is therefore always an error. Also ban the relative pattern `**/features/**` inside `src/features/**`, so `../../../features/x` is caught too.
- **Cycles:** enable oxlint's `import` plugin with `import/no-cycle`. Check that it runs acceptably fast with `--type-aware`.
- **Delete the barrel rule:** the old `@/features/*/*`-must-go-through-index rule is removed, since there are no barrels any more.
- **Why no dependency-cruiser:** these rules cover this repo's size. Revisit it only if a violation gets past oxlint.

## Migration steps (each is its own commit; build, test and lint must pass after each)

1. **Baseline:** add the oxlint direction rules and `import/no-cycle` as **warnings** and save the list of violations. It should show the `shell ↔ notifications` cycle.
2. **Moves with no edits** (`git mv`, then update imports; keep moves and edits in separate commits so history follows the files):
   - `features/errors` → `components/errors`
   - `features/loading` → `components/feedback` + `hooks/useDelayedPending`
   - `shared/config.ts` → `config/`
   - `shared/errors` → `lib/errors`
   - `shared/user` → `lib/user.tsx`
   - `shared/hooks/useMotion.ts` (+ test) → `hooks/`
   - `src/test` → `src/testing` (update `vitest.config.ts`)
   - `wait(ms)` (duplicated in `DebugPage.tsx` and `useAppearanceForm.ts`) → `utils/wait.ts`
   - delete the then-empty `shared/` folders
3. **Notifications split:** `notify` → `lib/notify.tsx`, store → `stores/inbox.ts`, UI stays in the feature.
4. **Shell:** fix the cycle (inversion 1), then move `features/shell` → `components/layouts/shell`.
5. **Sentry prototype:** `src/integrations/sentry/*` minus its UI → `lib/sentry/`; the catalog, Sentry page and `sentry/components/` → `features/integrations/components/`; `registry.ts` and `types.ts` → `features/integrations/`. Delete `src/integrations/index.ts` and `sentry/index.ts` (barrels). `App.tsx`, `router.ts` and `main.tsx` import `@/lib/sentry/runtime`; the routes import the page components directly. Behaviour and UI stay exactly as they are; Plan 06 decides what to keep.
6. **Remove barrels:** delete `features/*/index.ts` and `design-system/index.ts` and rewrite imports as direct paths (a codemod or `qartez_move`/`qartez_rename_file` keep references updated). Fixes the root cause behind Plan 01's bundle problem.
7. **Routes:** `src/routes` → `src/app/routes`. Update `routesDirectory` and `generatedRouteTree` in `vite.config.ts` and the oxlint override globs, then regenerate `routeTree.gen.ts`.
8. **Turn enforcement on:** switch the oxlint direction rules and `import/no-cycle` to **error**. The baseline must be empty.
9. **Docs:** rewrite AGENTS.md › Structure (tree, import direction, changes from bulletproof, no barrels), and fix path references in `docs/*.md` and the other plans.

## Decisions (settled Sep 24, 2026)

1. **Shell location:** `components/layouts/shell/` (shared, with its own store and hooks). Bulletproof's example app keeps its app frame in `components/layouts/`.
2. **Routes:** move to `app/routes/`.
3. **dependency-cruiser:** not added. oxlint direction rules plus `import/no-cycle` are enough for now.

## Out of scope

New features, renaming components, changing behaviour, and Feature-Sliced Design layers (`entities/`, `widgets/`, `pages/`).

## Risks

- **Large diff across many files.** Mitigation: moves without edits in their own commits, qartez or codemod-driven reference updates, and a green build after every step.
- **The TanStack route move breaks the generated route tree.** Mitigation: step 7 is on its own, with the dev server and a build checked right after.
- **Plans 03–06 refer to old paths.** Mitigation: step 9 updates them. Plans 03–06 run after this one.

## Verification

- After every step: `pnpm build`, `pnpm test` and `pnpm lint` pass, and Storybook builds.
- Final:
  - `pnpm lint` passes with the direction rules and `import/no-cycle` on error, and a fixture with a cross-feature import fails
  - `find src/features -name index.ts` returns nothing
  - no `src/integrations/` remains, and the first load still contains no Sentry code (`startSentry` imports it lazily)
  - the entry chunk contains no `react-draggable`, confirming Plan 01's bundle fix still holds without `sideEffects` doing the work

## Tasks

- [x] **Baseline with oxlint.** Add the per-layer `no-restricted-imports` overrides and `import/no-cycle` as warnings ([enforcement](#enforcement-oxlint-only-no-dependency-cruiser)). Done when the warning list is saved in the research file and shows the `shell ↔ notifications` cycle.
- [x] **Move errors and loading into the shared layer.** `features/errors` → `components/errors`, `features/loading` → `components/feedback` + `hooks/useDelayedPending`, with the move committed separately from the import edits. Done when build, test and lint pass.
- [x] **Split `shared/` and move the shared helpers.** `config.ts` → `config/`, `errors/` → `lib/errors`, `user/` → `lib/user.tsx`, `hooks/useMotion.ts` (+ test) → `hooks/`, `wait()` → `utils/wait.ts`; delete the then-empty folders. Done when `src/shared` is gone and build, test and lint pass.
- [x] **Move `src/test` to `src/testing`.** Update `setupFiles` in `vitest.config.ts` and the oxlint override glob. Done when `pnpm test` passes.
- [x] **Split notifications.** `notify` → `lib/notify.tsx`, store → `stores/inbox.ts`, and `Inbox.tsx` and the tab stay in `features/notifications`. Done when `notify.test.tsx` passes and the Inbox tab shows new warnings.
- [x] **Break the shell ↔ notifications cycle.** `useContextTabs` takes `globalTabs`, `app/shell.tsx` passes `notificationsTab`, and `ContextTab` goes to the shared layer. Done when `import/no-cycle` reports nothing.
- [x] **Move the shell to `components/layouts/shell`.** Done when build, test and lint pass and the Shell stories render.
- [x] **Move the Sentry prototype ([step 5](#migration-steps-each-is-its-own-commit-build-test-and-lint-must-pass-after-each)).** SDK code → `lib/sentry/`, UI → `features/integrations/`, delete both `index.ts` barrels, and point `App.tsx`, `router.ts` and `main.tsx` at `@/lib/sentry/runtime`. No behaviour or UI changes. Done when `src/integrations/` is gone, `runtime.test.ts` and `sentry.test.ts` pass, and the first load still has no Sentry code.
- [x] **Remove the barrels.** Delete `features/*/index.ts` and `design-system/index.ts`, rewrite imports as direct paths, and remove the old index-only import rule. Done when no `index.ts` remains under `features/` and the entry chunk has no `react-draggable`.
- [x] **Move routes to `app/routes`.** Update `routesDirectory` and `generatedRouteTree`, the oxlint globs, and regenerate the route tree. Done when `pnpm dev` and `pnpm build` work and every route loads.
- [x] **Switch the boundary rules to error.** The direction rules and `import/no-cycle` go to error, with one fixture that imports across features. Done when `pnpm lint` fails on the fixture and passes without it.
- [x] **Update AGENTS.md and the docs.** New Structure section (tree, import direction, deliberate changes from bulletproof, no barrels), and fix path references in `docs/*.md` and plans 03–05. Done when no doc mentions `src/features/shell`, `src/shared` or `features/*/index.ts`.
