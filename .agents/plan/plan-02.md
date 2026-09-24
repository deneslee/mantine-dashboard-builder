# Plan 02: Project Structure (bulletproof-react, lightly adapted)

Sep 24, 2026 · v1.2.0 · Tasks: [task-r02-03.md](./tasks/task-r02-03.md) · Research: [research-r02-project-structure.md](./research/research-r02-project-structure.md)

**v1.2 changes:** the merged Sentry prototype (`src/integrations/`) gets a place: its SDK code goes to `lib/sentry/`, its UI to `features/integrations/` (new migration step 5). `useMotion` (Plan 01) moves from `shared/hooks/` to `hooks/`.

**v1.1 changes:** decisions settled: the shell goes to `components/shell/`, routes go to `app/routes/`, and there's no dependency-cruiser. Rules are enforced with oxlint only, adding `import/no-cycle` for cycles. The duplicated `wait()` helper moves to `utils/`.

**Order:** 2 of 6 · **Depends on:** Plan 01's bundle task (or absorbs it) · **Blocks:** Plan 03, Plan 04, Plan 05 (new code should land in its final place)

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
    shell/                   Shell, navbar, sidebar, context-bar, panel + its store/hooks/model (from features/shell)
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
4. **A shared module may keep its own store and hooks together.** `components/shell/` keeps its Zustand store, `ShellProvider` and hooks. Only `ShellProvider` knows it's Zustand (AGENTS.md composition rule).
5. **Routes live in `app/routes/`** and stay thin. `-name.tsx` files are still ignored by the router.
6. **The app layer composes registries and cross-feature wiring.** Dashboards receive widgets and datasources through a provider, so they never import them (Plan 05).
7. **Barrel files:** none in `features/` or the shared folders. `design-system/index.ts` also goes; import `design-system/theme/theme` and similar directly.

## Three inversions (the only non-mechanical changes)

1. **Shell ↔ notifications cycle:**
   - The shell stops importing `notificationsTab`. `useContextTabs` merges the route's tabs with a `globalTabs` prop.
   - `app/shell.tsx` passes `[notificationsTab]`.
   - `ContextTab` moves to `types/` (or stays in `components/shell/model` as a shared type).
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
4. **Shell:** fix the cycle (inversion 1), then move `features/shell` → `components/shell`.
5. **Sentry prototype:** `src/integrations/sentry/*` minus its UI → `lib/sentry/`; the catalog, Sentry page and `sentry/components/` → `features/integrations/components/`; `registry.ts` and `types.ts` → `features/integrations/`. Delete `src/integrations/index.ts` and `sentry/index.ts` (barrels). `App.tsx`, `router.ts` and `main.tsx` import `@/lib/sentry/runtime`; the routes import the page components directly. Behaviour and UI stay exactly as they are; Plan 06 decides what to keep.
6. **Remove barrels:** delete `features/*/index.ts` and `design-system/index.ts` and rewrite imports as direct paths (a codemod or `qartez_move`/`qartez_rename_file` keep references updated). Fixes the root cause behind Plan 01's bundle problem.
7. **Routes:** `src/routes` → `src/app/routes`. Update `routesDirectory` and `generatedRouteTree` in `vite.config.ts` and the oxlint override globs, then regenerate `routeTree.gen.ts`.
8. **Turn enforcement on:** switch the oxlint direction rules and `import/no-cycle` to **error**. The baseline must be empty.
9. **Docs:** rewrite AGENTS.md › Structure (tree, import direction, changes from bulletproof, no barrels), and fix path references in `docs/*.md` and the other plans.

## Decisions (settled Sep 24, 2026)

1. **Shell location:** `components/shell/` (shared, with its own store and hooks).
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
