# 08 Structure cleanup

Status: open · Cross-cutting · Runs before the rest of [07](07-dashboard-model.md) (Sep 30) · Depends on: 02, 03 (done) · Sources: [Refine concepts](https://refine.dev/docs/guides-concepts/general-concepts/), [Perses dashboard spec](https://perses.dev/perses/docs/api/dashboard/), [schema.org CreativeWork](https://schema.org/CreativeWork), [bulletproof-react structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md), [zustand persist](https://github.com/pmndrs/zustand/blob/main/docs/reference/middlewares/persist.md), [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon), [Vitest projects](https://vitest.dev/guide/projects)

## Goal

Make the code easy to read and ready to split into packages:

- **One vocabulary.** Each name says what the thing is: `DashboardPage`, not `DashboardView`; `Dashboard`, not `dashboardDoc` / `DashboardDocDto` / `Dashboard`.
- **One home per kind of state**, with the same provider/store/hook pattern everywhere.
- **Package-shaped folders** enforced by lint, so the planned monorepo (pnpm + Turborepo) is mostly `git mv`.
- **A test and story policy** that says what gets tested, how and where, with real-browser tests.
- **Current planning and docs.** Planning lives in `.agents/planning/`; `docs/` is for people, with a new [architecture.md](../../../docs/architecture.md).

The Sep 30 review of the edit MVP found:

- a red gate: lint and Prettier failed, and `@babel/core` 8 silently switched the React Compiler off for 10 components;
- an invisible edit drawer;
- a corrupt saved copy breaking the dashboard list;
- tests that import no product code;
- three provider stacks;
- confusing names and thin folders.

This plan fixes all of that before 07 continues.

## Design

### Target tree

```text
src/
  main.tsx
  app/        App  Providers (the one provider stack)  router  queryClient
              plugins.ts (the only file importing built-in plugins)  nav.ts (app routes)
              NotFound  RouteError  AppCrash  routes/
  features/
    dashboards/
      DashboardListPage.tsx   /dashboards
      DashboardPage.tsx       /dashboards/$id
      DetailsPanel.tsx        context-bar panel
      dashboardTabs.ts        context-bar tab list
      dashboardSearch.ts      route search schema
      data/    dashboardApi  dashboardQueries  widgetDataQuery  drafts  useAutoRefresh
      state/   createDashboardStore  DashboardProvider  useDashboard
      grid/    DashboardGrid  WidgetTile  WidgetHeader  focusWidgetMenu
      header/  EditToolbar  RefreshButton  TimeRangePicker  RefreshPicker  formatRange  dashboardFile
      editor/  EditDrawer  WidgetForm  AddWidgetForm  PlacementDialog  QueryEditor  LeaveDialog   (lazy chunk)
    settings/       SettingsPage  AppearanceForm  SettingsSection  useAppearanceForm  settingsTabs
    notifications/  InboxPanel  notificationsTab
    integrations/   IntegrationsPage  SentryPage  sentry/*  getIntegrations   (mechanical; 06 rebuilds it)
    debug/          DebugPage
  plugins/    WidgetPlugin  DatasourcePlugin  PluginsProvider  usePlugins
              widgets/{chart,kpi,table}/  datasources/{mock,localJson}/
  shell/      Shell  ShellProvider  useShell  createShellStore  ContextTab  Nav  Panel
              RouteProgress  OfflineBanner  useMainLock  navbar/  sidebar/  contextBar/  breadcrumbs/
  core/       dashboard/ (dashboardSchema, migrateDashboard, layout)  time/ (timeRange)
              data/ (DataFrame)  errors/ (AppError)
  ui/         tokens/ (primitives, semantic, dimensions)  theme/ (theme, mantine.d.ts, components/<Name>Theme)
              components/ (Page, ErrorState, QueryBoundary, Skeletons)  global.css
  lib/        notify/ (notify, ActionMessage, useInbox)  sentry/  storage  useMotion  useCurrentUser
  utils/      wait
  testing/    setup  render  TestRouter  AppStory  fixtures/ (dashboards, nav)
```

Gone: `components/`, `design-system/`, `hooks/`, `stores/`, `types/`, `config/`, `features/widgets/`, `features/datasources/`, `scripts/`.

### Layer rules

| Folder      | May import (besides itself) | Also banned                                                                                                      |
| ----------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `utils/`    | nothing                     | –                                                                                                                |
| `core/`     | utils                       | every runtime or type import of react, @mantine, @tanstack, zustand, dayjs, recharts, react-grid-layout, @sentry |
| `ui/`       | core, utils                 | lib, shell, plugins, features, app; `@tanstack/react-router`                                                     |
| `lib/`      | core, ui, utils             | shell, plugins, features, app                                                                                    |
| `shell/`    | core, ui, utils, lib        | plugins, features, app                                                                                           |
| `plugins/`  | core, ui, utils             | lib, shell, features, app                                                                                        |
| `features/` | all of the above            | `@/plugins/widgets/**`, `@/plugins/datasources/**`, other features, app                                          |
| `app/`      | everything                  | –                                                                                                                |

- Nothing in `src` imports `testing/`. Tests, stories and `.storybook/` may import anything.
- Only `ui/` imports `ui/tokens/primitives`.
- The style-rule exemptions narrow to `ui/tokens/**` and `ui/theme/**`.

### Naming rules

- **Files:** named after the main export, and short. PascalCase for components and types (`DataFrame.ts`, `Nav.ts`); camelCase for functions and modules (`dashboardApi.ts`, `formatRange.ts`). Folders are camelCase (`contextBar/`, `localJson/`). No `types.ts`, `context.ts`, `utils.ts` or `index.ts`, and no barrels.
- **Roles:**
  - `*Page` (a routed screen), `*Panel` (context-bar or side content), `*Dialog`, `*Form`, `*Menu`.
  - `*Provider` (puts a context into React), `use*` (hooks), `create*Store` (store factories), `*Schema` (zod schemas), `*Plugin` (plugin contracts).
- **Values:**
  - Booleans start with `is`, `has`, `should` or `can`.
  - Handlers are `handle*`; props stay `on*`.
  - Constants are UPPER_SNAKE (`GRID_COLUMNS`, `ERROR_TITLES`).
  - Utility functions are descriptive verbs (`generateUniqueId`, `formatRange`, `getFieldLabel`).
- **Feature folders** group by area (`data/`, `state/`, `grid/`, `header/`, `editor/`), not by type. A small feature stays flat.

### State

Each piece of state has one owner:

- server data in TanStack Query;
- shareable or back-button state in URL search params;
- the edited document, its baseline and undo history in the per-dashboard store;
- frame UI in the shell store;
- static values (plugins, nav, user) in a context set once in `app/`;
- everything else in component state.

A store comes from a `create*Store` factory. One `*Provider` puts it into React, and it is read only through the hooks in `use*.ts`, which also holds the context. Derived values (`isDirty`, `canUndo`) are computed, never stored twice. The dashboard store loses `mode`: the URL owns it, and a restored draft redirects to `?mode=edit` in the route's `beforeLoad`.

### Dashboard document

- **One flat type.** `dashboardSchema` (zod) and `type Dashboard = z.infer<…>` are exactly the saved and exported JSON. A widget's id is its key.
- **`schemaVersion` replaces `version`.** `migrateDashboard(json)` upgrades old files that still have `version: 1`.
- **Layout items keep react-grid-layout's names** `{ i, x, y, w, h }`.
- **The `metadata`/`spec` envelope** arrives with 07's v2 migration, in one `migrateV1toV2` function.

### Storage

- **Keys:** `storageKey(name)` returns `dashboard-builder:<name>`. The prefix matters because the GitHub Pages origin is shared with other projects.
- **Versions live inside the values:**
  - Dashboards carry `schemaVersion`.
  - Zustand stores use persist's own `version` and `migrate`.
  - Mantine keys hold single tokens.
- **API:** `readStored(key, parse)`, `writeStored` and `removeStored`. A corrupt value throws `AppError('validation')` and is kept.
- **Legacy keys:** `migrateLegacyKeys()` runs once in `main.tsx`: it copies each of the six `.v1` keys to its new name if that is absent, then removes the old one (`// ponytail: delete after 2027-01`). `color-scheme` starts fresh.
- **Pre-paint script:** `index.html` reads `dashboard-builder:color-scheme`, and a test pins that.

| Old                                                                      | New                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `shell.v1`, `notifications.v1`, `motion.v1`, `color-scheme`              | `dashboard-builder:shell`, `:notifications`, `:motion`, `:color-scheme` |
| `dashboard.saved.v1:<id>`, `dashboard.draft.v1:<id>`, `sentry.config.v1` | `dashboard-builder:saved:<id>`, `:draft:<id>`, `:sentry`                |

### Tests and stories

| Code                                                                            | Tested with                                                                                                                          | Vitest project      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `core/`, `utils/`, datasource plugins, lint rules, compiler and doc-link checks | a unit test for every function with branching logic                                                                                  | `node`              |
| stores (`create*Store`)                                                         | action semantics: undo steps, save, discard, draft                                                                                   | `dom`               |
| hooks with timers or DOM                                                        | `renderHook`                                                                                                                         | `dom`               |
| components                                                                      | a story per visual state (render and a11y in Chromium); play functions for user flows; an RTL test only for logic a story can't show | `storybook` / `dom` |
| thin routes, layout wrappers, generated code                                    | not tested                                                                                                                           | –                   |

- **No test without product code.** A test that imports no product code is deleted.
- **Stories:**
  - Stories have no `title:`; autotitle mirrors the folders.
  - Story names are states.
  - Fixtures come from `testing/fixtures/`.
  - `staticDirs: ['../public']`.
- **One provider stack.** `app/Providers` serves the app, `testing/render` and the Storybook preview. `AppStory url=…` renders the real router for page stories.

### File moves

The patterns: shared UI goes to `ui/`, error pages to `app/`, the frame to `shell/`, pure logic to `core/`, contracts and built-ins to `plugins/`, and services to `lib/`. Where a name was bad, the export is renamed too.

| Old                                                                                                                                                                                        | New                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design-system/components/Page/Page.*`                                                                                                                                                     | `ui/components/Page.*`                                                                                                                                                                                                                                                                                                                                                      |
| `components/errors/ErrorState.*`                                                                                                                                                           | `ui/components/ErrorState.*`                                                                                                                                                                                                                                                                                                                                                |
| `components/errors/WidgetBoundary.*`                                                                                                                                                       | `ui/components/QueryBoundary.*` (`QueryBoundary`)                                                                                                                                                                                                                                                                                                                           |
| `components/feedback/skeletons/Skeletons.*`, `feedback/Skeletons.stories.tsx`                                                                                                              | `ui/components/Skeletons.*` (`DashboardSkeleton` → `GridSkeleton`)                                                                                                                                                                                                                                                                                                          |
| `design-system/theme/theme.ts` + `components.ts`                                                                                                                                           | `ui/theme/theme.ts` (the component map inlined)                                                                                                                                                                                                                                                                                                                             |
| `design-system/theme/components/<Name>.ts`, `styles/<Name>.module.css`                                                                                                                     | `ui/theme/components/<Name>Theme.ts` + `.module.css`                                                                                                                                                                                                                                                                                                                        |
| `design-system/tokens/{primitives,semantic}.ts`, `tokens.ts`                                                                                                                               | `ui/tokens/{primitives,semantic}.ts`, `dimensions.ts` (`tokens` → `dimensions`; `grid.cols` → core `GRID_COLUMNS`)                                                                                                                                                                                                                                                          |
| `app/global.css`                                                                                                                                                                           | `ui/global.css`                                                                                                                                                                                                                                                                                                                                                             |
| `components/errors/{AppCrash,NotFound,RouteError}.tsx`                                                                                                                                     | `app/`                                                                                                                                                                                                                                                                                                                                                                      |
| `components/layouts/shell/**`                                                                                                                                                              | `shell/**`; `store.ts` + `model/types.ts` → `createShellStore.ts`; `context.ts` + `hooks/useShell.ts` → `useShell.ts` (adds `useShell(selector)`); `model/contextTabs.ts` → `ContextTab.ts`; `model/nav.ts` → `Nav.ts` (types) + `app/nav.ts` (`NAV`); `panel/Panel.*` → `Panel.*`; `context-bar/` → `contextBar/`; `hooks/useContextTabs`, `useBadgeCount` → `contextBar/` |
| `components/navigation/RouteBreadcrumbs.*`, `hooks/useBreadcrumbs.ts`                                                                                                                      | `shell/breadcrumbs/`                                                                                                                                                                                                                                                                                                                                                        |
| `components/feedback/RouteProgress.tsx`, `components/errors/OfflineBanner.tsx`                                                                                                             | `shell/`                                                                                                                                                                                                                                                                                                                                                                    |
| `features/dashboards/api/dto.ts` (+ test)                                                                                                                                                  | `core/dashboard/dashboardSchema.ts` (`dashboardDoc`, `dashboardDocV1`, `DashboardDocDto` → `dashboardSchema`, `Dashboard`)                                                                                                                                                                                                                                                  |
| (new)                                                                                                                                                                                      | `core/dashboard/migrateDashboard.ts`                                                                                                                                                                                                                                                                                                                                        |
| `features/dashboards/model/layouts.ts` (+ test)                                                                                                                                            | `core/dashboard/layout.ts` (`GridItem` → `LayoutItem`, `AuthoredLayouts` → `Layouts`, `toLayouts` → `resolveLayouts`, `byReadingOrder` → `compareReadingOrder`, `orderWidgets` from `toDocument`)                                                                                                                                                                           |
| `features/dashboards/model/timeRange.ts` (+ test)                                                                                                                                          | `core/time/timeRange.ts` (`RawRange` → `TimeRange`, resolved range → `ResolvedRange`, `refreshMs` → `parseRefreshInterval`); `dashboardSearch` → `features/dashboards/dashboardSearch.ts`                                                                                                                                                                                   |
| `types/dataframe.ts` (+ test)                                                                                                                                                              | `core/data/DataFrame.ts` (`toRows` → `frameToRows`, `fieldLabel` → `getFieldLabel`, `unitAffix` → `getUnitAffix`)                                                                                                                                                                                                                                                           |
| `lib/errors/AppError.ts` (+ test)                                                                                                                                                          | `core/errors/AppError.ts` (`errorTitles` → `ERROR_TITLES`)                                                                                                                                                                                                                                                                                                                  |
| `types/widget.ts`, `types/datasource.ts`                                                                                                                                                   | `plugins/WidgetPlugin.ts`, `plugins/DatasourcePlugin.ts` (drop unused `icon`, `capabilities.time/export/hoverSync`)                                                                                                                                                                                                                                                         |
| `features/dashboards/registry.ts`                                                                                                                                                          | `plugins/usePlugins.ts` + `PluginsProvider.tsx` (`DashboardRegistry` → `Plugins`, `useDashboardRegistry` → `usePlugins`)                                                                                                                                                                                                                                                    |
| `app/registry.ts`                                                                                                                                                                          | `app/plugins.ts` (`registry` → `plugins`)                                                                                                                                                                                                                                                                                                                                   |
| `features/widgets/**`, `components/table/useAppTable.ts`                                                                                                                                   | `plugins/widgets/**` (`options.ts` → `chartOptions.ts`, `tableOptions.ts`)                                                                                                                                                                                                                                                                                                  |
| `features/datasources/{mock,local-json}/**`                                                                                                                                                | `plugins/datasources/{mock,localJson}/**`                                                                                                                                                                                                                                                                                                                                   |
| `stores/inbox.ts`, `lib/notify/types.ts`                                                                                                                                                   | `lib/notify/useInbox.ts` (types split to their users)                                                                                                                                                                                                                                                                                                                       |
| `hooks/useMotion.ts`, `lib/user.tsx`, `lib/sentry/settings.ts`                                                                                                                             | `lib/useMotion.ts`, `lib/useCurrentUser.ts` (+ hook), `lib/sentry/sentryConfig.ts`                                                                                                                                                                                                                                                                                          |
| `features/dashboards/components/DashboardList.*`                                                                                                                                           | `DashboardListPage.*`                                                                                                                                                                                                                                                                                                                                                       |
| `features/dashboards/components/DashboardView.tsx`                                                                                                                                         | `DashboardPage.tsx`, split into `header/EditToolbar`, `header/RefreshButton` (owns `useIsFetching`), `header/dashboardFile.ts` (export, import checks), `editor/LeaveDialog`; the live-region announcer becomes a leaf                                                                                                                                                      |
| `features/dashboards/components/edit/EditTools.tsx`                                                                                                                                        | `editor/EditDrawer`, `WidgetForm`, `AddWidgetForm`, `PlacementDialog`, `QueryEditor`                                                                                                                                                                                                                                                                                        |
| `features/dashboards/components/DetailsTab.tsx`, `tabs.ts`                                                                                                                                 | `DetailsPanel.tsx`, `dashboardTabs.ts`                                                                                                                                                                                                                                                                                                                                      |
| `features/dashboards/api/{client,storage,repository,mapper,queries}.ts`                                                                                                                    | `data/dashboardApi.ts`, `drafts.ts`, `dashboardQueries.ts`, `widgetDataQuery.ts`; `repository.ts` and `mapper.ts` deleted                                                                                                                                                                                                                                                   |
| `features/dashboards/{store,DashboardProvider,context}.ts(x)`, `hooks/useDashboard.ts`                                                                                                     | `state/createDashboardStore.ts`, `DashboardProvider.tsx`, `useDashboard.ts` (`useDashboardState` → `useDashboard`, `useHistory` → `useUndoState`, `useDocumentReader` → `useReadDashboard`, `dirty` → `isDirty`)                                                                                                                                                            |
| `features/dashboards/components/grid/*`, `controls/*`                                                                                                                                      | `grid/*`, `header/*` (`rangeLabel` → `formatRange`; controls test and story split per component)                                                                                                                                                                                                                                                                            |
| `features/settings/components/*`, `hooks/*`, `model/tabs.ts`                                                                                                                               | `features/settings/*` (`AppearanceSettings` → `AppearanceForm`), `settingsTabs.ts`                                                                                                                                                                                                                                                                                          |
| `features/notifications/components/Inbox.*`, `tab.ts`, `Notifications.stories.tsx`                                                                                                         | `InboxPanel.*`, `notificationsTab.ts`, `InboxPanel.stories.tsx`                                                                                                                                                                                                                                                                                                             |
| `features/integrations/components/**`, `registry.ts`, `types.ts`                                                                                                                           | `features/integrations/**` flattened, `getIntegrations.ts`                                                                                                                                                                                                                                                                                                                  |
| `testing/storyRouter.tsx`                                                                                                                                                                  | `testing/TestRouter.tsx`; new `AppStory.tsx`, `fixtures/`                                                                                                                                                                                                                                                                                                                   |
| `components/feedback/SlowHint.tsx`, `hooks/useDelayedPending.*`, `components/WidgetsTab.tsx`, `config/config.ts` (`APP_NAME` → `sidebar/Brand.tsx`), the 4 decision-math tests, `scripts/` | deleted                                                                                                                                                                                                                                                                                                                                                                     |

## Tasks

Every step leaves `pnpm lint && pnpm format:check && pnpm build && pnpm test` green. Moves are `git mv` with import fixes only, committed apart from edits so `git log --follow` works.

### 0. Planning and docs

- [x] **Planning layout.** Move `.agents/plans` to `.agents/planning/plans` and research to `.agents/planning/research`. `docs/planning/tasks.md` becomes `.agents/planning/tasks.md`; `docs/planning/plan.md` becomes `.agents/planning/roadmap.md`, with Stack and Project structure moved to the new `docs/architecture.md`. Rewrite every relative link. Done when `docs/planning/` is gone and no doc names `.agents/plans/`.
- [x] **Everything current.**
  - tasks.md lists 08 first and gains the Edit UI polish section.
  - 07 gets its status, the review findings, and the browser-test task moved here.
  - AGENTS.md gets its Planning and Read-first tables.
  - The README is rewritten.
  - The memory notes are updated.
  - Done when a reader of any planning file or doc sees the same order and paths.
- [x] **Link check.** `lint/docs.test.ts` fails on any relative link in the root, `docs/`, `.agents/planning/`, `src/` or `lint/` markdown files that points at a missing file. Done when it passes on the tree and fails on a broken link.

### 1. Gate fixes

- [x] **React Compiler.** Pin `@babel/core` to `^7.29` (the peer range of `@rolldown/plugin-babel` allows it). Add `lint/compiler.test.ts`: a component with a destructured default must compile. Done when the test passes and the built `DashboardProvider` chunk imports `react/compiler-runtime`.
- [x] **Lint and format.** Fix `DashboardView.stories.tsx:40` and Prettier on `api/dto.test.ts`, and delete `scripts/` (step 2 replaces them). Done when `pnpm lint` and `pnpm format:check` pass.
- [x] **Dead code.** Delete the 4 decision-math tests, `useDelayedPending` (+ test), `SlowHint`, and `WidgetsTab` with its tab entry. Done when nothing imports them.
- [x] **Edit drawer height.** Move the height from `.drawerContent` to `.drawerInner`. Done when the palette's inputs are visible and clickable at 1440 × 900.
- [x] **Corrupt saved copy.** `listDashboards` falls back to the static summary per item; `getDashboard` still reports the problem. Done when a test with a corrupt copy shows the list intact.

### 2. Browser tests

- [ ] **Vitest projects.**
  - Split into `node`, `dom` and `storybook` projects (`@storybook/addon-vitest`, `@vitest/browser-playwright`, Chromium).
  - Add `.storybook/vitest.setup.ts` and `staticDirs: ['../public']`.
  - Add the scripts `test`, `test:unit` and `test:stories`.
  - Done when `pnpm test` runs all three.
- [ ] **CI.**
  - `github-pages.yaml` gets a `pull_request` trigger.
  - It runs lint, format check, `playwright install chromium` and `pnpm test` before the build.
  - It deploys only from main.
  - Done when a pull request runs the checks without deploying.
- [ ] **AppStory.** `createAppRouter(queryClient, history?)` and `testing/AppStory.tsx` render the real routes at a URL. Done when `DashboardPage` stories load `/dashboards/sales` with live mock data.
- [ ] **Editor play functions.** In `DashboardPage.stories.tsx`:
  - The states: View, Editing, WidgetOptions, QueryEditor, Empty, StorageError, RestoresDraft.
  - The flows ported from the deleted script: BlurCommitUndo, SaveThenUndo, Discard, DuplicateRemoveAdd (asserting the drawer is visible and clickable), MoveResizeDialogs (focus returns to the menu button; live-region text), ExportImportIdentity, LeaveGuard.
  - Done when they pass in Chromium. Then tick the matching 07 acceptance items.
- [ ] **A11y.** Every existing story runs as an a11y test. A story that fails gets `a11y: { test: 'todo' }` and a tasks.md line. Done when `pnpm test:stories` passes.

### 3. Moves

- [ ] **`ui/`.** The design-system and the generic components, as in the table. Done when `design-system/` is gone.
- [ ] **`shell/`.** Drop the `layouts/`, `hooks/`, `model/` and `panel/` levels. Done when `components/` holds nothing of the shell.
- [ ] **`core/`, `plugins/`, `lib/`, error pages to `app/`.** Done when `types/`, `stores/`, `hooks/`, `config/`, `components/`, `features/widgets/` and `features/datasources/` are gone.
- [ ] **Dashboards by area.** Move into `data/`, `state/`, `grid/`, `header/` and `editor/`; `DashboardView` moves whole to `DashboardPage` and `EditTools` whole to `editor/EditDrawer`. Done when `components/`, `api/`, `model/` and `hooks/` are gone from the feature.
- [ ] **Small features flat.** Flatten settings, notifications and integrations; `storyRouter` becomes `TestRouter`.

### 4. Renames

- [ ] **Exports.** Rename per the table above. Done when `grep` finds none of the old names (`dashboardDoc`, `DashboardRegistry`, `WidgetDefinition`, `RawRange`, `useDashboardState`, `DetailsTab`, …).
- [ ] **Booleans and handlers.** `is`/`has`/`should`/`can` booleans and `handle*` handlers across `src/`.

### 5. Edits

- [ ] **Plugins once.** `PluginsProvider` is mounted in `app/Providers`, not per route; `WidgetPlugin` is trimmed to its used fields.
- [ ] **One provider stack.**
  - `testing/render` and the Storybook preview use `app/Providers`.
  - The fixtures in `testing/fixtures/` replace the inline copies.
  - Stories drop `title:`.
  - Done when no test or story builds its own `QueryClient` or router by hand.
- [ ] **Flat document.**
  - Add `dashboardSchema`, `migrateDashboard` (+ test), `GRID_COLUMNS` and `orderWidgets`.
  - `public/data/dashboards/*.json` switch to `schemaVersion`.
  - Delete the mapper and DTO types.
  - Done when every read path (static, saved, draft, import) runs `migrateDashboard` → `dashboardSchema`.
- [ ] **Data module.** Add `dashboardApi` (list, get, save), `dashboardQueries`, `widgetDataQuery` and `drafts`; `createDashboardStore(dashboard, { shouldPersist, save })`; delete `repository.ts`. Done when the store tests pass with a fake `save`.
- [ ] **Split the page and the editor.**
  - `DashboardPage` becomes layout only.
  - Add `EditToolbar`, `RefreshButton`, `dashboardFile.ts` (+ test: export in reading order, import round-trip, unknown types rejected) and `LeaveDialog`.
  - Add `WidgetForm`, `AddWidgetForm`, `PlacementDialog` and `QueryEditor`.
  - Done when the compiler test script shows no bailouts in these files.
- [ ] **Mode in the URL.** Remove `mode` from the store. The route's `beforeLoad` redirects to `?mode=edit` when a draft exists, and `isEditing` is passed as props. Done when the RestoresDraft story passes and the sync effect is gone.
- [ ] **Shell.** Nav comes from `app/nav.ts` through `ShellProvider`; the context and hooks live in `useShell.ts`. Done when `shell/` has no app route data.
- [ ] **Storage.**
  - Add `lib/storage.ts` (+ test): round trip, corrupt value kept, legacy move, the index.html key.
  - Switch every key over, and add `migrateLegacyKeys` in `main.tsx`.
  - Parse the Sentry config with zod.
  - Done when no `.v1` key is written.
- [ ] **Style exemptions.** Narrow them to `ui/tokens` and `ui/theme`, and fix any hits.

### 6. Lint

- [ ] **Layer rules.** Write the per-folder rules above in `oxlint.config.ts`, plus fixtures under `lint/fixtures/src/**`. Done when each violation fixture fails, the allowed contract import passes, and `pnpm lint` is green on the tree.

### 7. Docs

- [ ] **Architecture.** `docs/architecture.md` switches to the new layers, data flow, state owners and storage keys.
- [ ] **AGENTS.md.** Rewrite Structure, Naming, State and Testing from this plan.
- [ ] **README.** Update the repo map to the new paths.
- [ ] **Other docs.** Fix paths in `docs/*` and 07.
- [ ] **Close.** Move this plan to `done/` and tick it in tasks.md.

## Decisions

- **Sep 30: package-shaped folders** (`app`, `features`, `plugins`, `shell`, `core`, `ui`, `lib`, `utils`, `testing`) instead of the bulletproof-react shared folders. Chosen over keeping today's layers with cleaned names, and over a real monorepo now.
- **Sep 30: `design-system/` becomes `ui/`**, merged with the generic shared components. `app/styles/` was rejected: every layer would import from `app/`.
- **Sep 30: flat dashboard JSON with one type** and `schemaVersion`. Perses's `metadata`/`spec` envelope comes with 07's v2; schema.org field names (`name`, `keywords`, `dateModified`) were rejected as unfamiliar to dashboard authors. Layout items keep `{ i, x, y, w, h }`.
- **Sep 30: a plain data module, no repository interface** until a second implementation exists (Refine's data provider was the reference, not the pattern).
- **Sep 30: tests next to their code**; browser tests through Storybook's Vitest addon, not Playwright scripts.
- **Sep 30: PascalCase, short names**, with `is`/`has`/`should` booleans, `handle*` handlers, UPPER_SNAKE constants and verb-named utilities.
- **Sep 30: no version in storage keys.** The version lives in the value, and there is no second envelope around dashboards, which already carry `schemaVersion`.
- **Sep 30: planning moves to `.agents/planning/`.** `docs/` is for people, with `architecture.md` holding the stack and structure.

## Out of scope

- **The edit UI redesign and the React pitfalls from the review.** Tracked in [tasks.md › Edit UI polish](../tasks.md#edit-ui-polish-not-planned-yet).
- **The integrations rebuild and the runtime Sentry DSN.** Plan 06 covers them.
- **`.kiro/specs`.** It stays untouched.

## Verification

- **Step 0:**
  - `grep -rn "docs/planning\|\.agents/plans/"` finds nothing.
  - `lint/docs.test.ts` passes.
  - tasks.md lists 08, then 07's rest, then 07 stage 3.
  - The README has no `shell.v1` or `src/design-system`.
- **After every commit:** `pnpm lint && pnpm format:check && pnpm build && pnpm test` pass. Move commits show `R` entries in `git show --stat -M`.
- **Gate:** `pnpm why @babel/core` shows 7.x only, and the built chunks contain `compiler-runtime`.
- **Data edits:** a manual pass in `pnpm dev`:
  - list, open sales, edit, save;
  - reload and check the draft is restored;
  - export, import, discard;
  - check `/dashboards/perf` scrolls smoothly.
- **Layers:**
  - `pnpm lint` fails on each fixture violation.
  - `find src -name index.ts` finds nothing.
  - The removed folders no longer exist.
- **Storage:** load the old build, save a dashboard, then load the new build. The saved dashboard and the sidebar width survive, and no `.v1` key remains.
- **Stories:** every story passes render and a11y in Chromium, or is on the tasks.md todo list. The 7 editor flows pass.
