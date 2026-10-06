<!-- intent-skills:start -->

## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:

- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

# AGENTS.md

Rules for humans and coding agents working in this repo. Read before writing code. This file holds the rules; the reasons and details live in the docs each section links to, so don't copy them here.

## Commands

    pnpm dev              # http://localhost:5173
    pnpm build            # typecheck + production build
    pnpm lint             # oxlint (type-aware) + Stylelint
    pnpm test             # Vitest: node + jsdom tests and every story in Chromium; `pnpm test <path>` runs one file
    pnpm test:unit        # node + jsdom only (fast)
    pnpm test:stories     # stories only (needs `pnpm exec playwright install chromium` once)
    pnpm storybook        # http://localhost:6006

**Before you call a change done:**

- `pnpm lint` and the tests for what you touched pass. Run `pnpm build` when types, imports or routes changed.
- Every new component state has a story, and every behaviour a test.
- Prettier has formatted the files, and the commit message follows Conventional Commits.
- The plan is current ([Planning](#planning)).

## Read first

Versions are in `package.json`; the stack, the layers, the data flow and where state lives are in [architecture.md](docs/architecture.md).

| Working on                               | Read                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| What to build next, and fixed decisions  | [roadmap.md](.agents/planning/roadmap.md), [tasks.md](.agents/planning/tasks.md)                     |
| How the app fits together                | [architecture.md](docs/architecture.md)                                                              |
| Navbar, sidebar, context bar, panes      | [shell.md](docs/ui/shell.md)                                                                         |
| Styles, tokens, the Mantine theme        | [design-system.md](docs/ui/design-system.md)                                                         |
| Toasts, errors, loading                  | [feedback.md](docs/ui/feedback.md)                                                                   |
| Dashboards, widgets, datasources, charts | [dashboard.md](docs/dashboard/dashboard.md), [grid-and-charts.md](docs/dashboard/grid-and-charts.md) |
| Planned work                             | Its plan in `.agents/planning/plans/`                                                                |

## Mantine first

1. **Read the docs for the installed Mantine version** before using or replacing a component or hook: its Styles API (selectors, CSS variables, data attributes) and the theming pages (`createTheme`, `Component.extend`, `vars`, `classNames`, variants). [mantine.dev/llms.txt](https://mantine.dev/llms.txt) indexes every page as markdown.
2. **Check the `@mantine/core` and `@mantine/hooks` exports before writing a component or hook.** Several custom ones here turned out to exist (`useTimeout`, `VisuallyHidden`, `EmptyState`, `Tooltip.Group`, `Splitter` / `useSplitter`). So do `DataList`, `Menubar`, `ComboboxPopover`, `Scroller`, `OverflowList`, `FloatingWindow`, `useNetwork` and `useHotkeys`.
3. **Icon buttons** are `ActionIcon` + `Tooltip` + `aria-label`, never a custom button or `UnstyledButton`.
4. **Dropdowns, selects and searchable lists** use `Combobox`, or `Select` / `Autocomplete` / `MultiSelect`, which wrap it.
5. **Router links inside Mantine components** use `renderRoot={(props) => <Link to="…" {...props} />}`, so they stay real anchors with preloading.

## Styling and tokens

How the tiers work and where a new value goes: [design-system.md](docs/ui/design-system.md).

- **Outside `ui/tokens` and `ui/theme`, use semantic tokens only.**
  - CSS: `var(--app-*)`, or Mantine variables that aren't palette shades (`--mantine-spacing-*`, `--mantine-radius-*`, `--mantine-primary-color-filled`).
  - TSX: token keys and the constants in `semantic.ts`: `gap="xs"`, `fw={fontWeight.medium}`, `size={iconSize.sm} stroke={iconStroke}`, `h={chart.height.md}`.
  - `dimensions.ts` holds only the layout numbers TS needs (`shell`, `zIndex`, `grid`).
- **No inline `style`.** Component defaults and variants go in `ui/theme/components/<Name>Theme.ts` (plus `<Name>Theme.module.css` when they need CSS); everything else in a CSS module.
- **Status colors are aliases:** `color="danger"`, never `color="red"`. The aliases are `brand`, `neutral`, `danger`, `warning`, `success` and `info`; `dimmed` and `bright` are fine too.
- **Radius and shadow come from the theme.** Don't pass `radius=` or `shadow=` in feature code.
- **Focus and press:** `className="mantine-focus-auto"` for the focus ring on custom focusable elements (no custom `:focus-visible` CSS); `mantine-active` for press feedback.
- **Viewport classes** (`visibleFrom` / `hiddenFrom`) only in the shell. Inside a page, use `@container` queries: `<main>`'s width depends on the panels, not the screen.
- **Scheme-dependent CSS** (`light-dark()`, `@mixin light/dark`) only in `ui/tokens` and `ui/theme`.
- **Lint enforces these rules**, and `lint/rules.test.ts` proves each one fires. Exempt: `ui/tokens/**`, `ui/theme/**`, stories, tests, and `features/integrations/**` until [06](.agents/planning/plans/06-sentry.md) rebuilds it. The `ui/tokens/Tokens` story shows every semantic variable in both schemes.

## Structure

Package-shaped folders, so each can move to `packages/` when the repo becomes a monorepo. The layers, data flow and state owners are drawn in [architecture.md](docs/architecture.md).

    src/
      app/          the only place features and built-in plugins meet: routes/ (thin TanStack file routes;
                    `-name.tsx` files are ignored), Providers, router, queryClient, plugins.ts, error pages
      features/     dashboards, settings, notifications, integrations, debug; grouped by area inside
                    (dashboards: data/ state/ grid/ header/ editor/ inspect/), small features flat
      shell/        the app frame: Shell, ShellProvider, useShell, navbar/, sidebar/, contextBar/, breadcrumbs/
      plugins/      WidgetPlugin and DatasourcePlugin contracts, usePlugins; widgets/*, datasources/*
      lib/          services: notify/ (toasts, inbox), sentry/, useMotion, useCurrentUser
      ui/           look only: tokens/, theme/, components/ (Page, ErrorState, QueryBoundary, Skeletons)
      core/         plain TypeScript, no React: dashboard/, time/, data/ (DataFrame), errors/ (AppError)
      utils/        tiny helpers (wait)
      testing/      render, TestRouter, AppStory, setup: tests and stories only

- **Imports go down the tree above, never up** (`testing/` aside): `app` on top, `utils` at the bottom. `plugins/` imports only `core`, `ui` and `utils`; `shell/` never imports `plugins/`. oxlint enforces it with one rule per folder (`oxlint.config.ts`), plus `import/no-cycle`; `lint/rules.test.ts` proves each rule fires on the fixtures in `lint/fixtures/src/`. `core/` also may not use React, Mantine, TanStack, zustand or other UI and state libraries, and `ui/` may not use the router.
- **Features never import each other, `app/`, or a built-in widget or datasource.** Combine them in `app/`:
  - A route may import several features and wrap parts in its own Suspense or error boundary.
  - A feature that needs something from another asks for it (props, context); `app/` passes it in, e.g. `ShellProvider nav` and `globalTabs`, `PluginsContext`.
  - Code both need moves down a layer.
- **No barrel files (`index.ts`).** Import the file that defines the name: `@/ui/components/ErrorState`, `@/lib/notify/notify`. Barrels defeat tree-shaking.
- **Relative imports** inside a feature or folder; `@/…` across folders.
- **Where does it go?** Look only → `ui/`. Pure logic → `core/`. A service with side effects → `lib/`. The frame → `shell/`. Knows the domain or fetches data → `features/`. Places things on a page → `app/routes/`.

## Naming

Short and plain: `Shell`, `Sidebar`, `ContextBar`, `notify`, `useSidebar`. No `AppShellSidebarPanelContainer`.

- **Files** are named after their main export. PascalCase for components and types (`DataFrame.ts`), camelCase for functions and modules (`dashboardApi.ts`, `formatRange.ts`), camelCase folders (`contextBar/`). No generic `types.ts`, `context.ts`, `utils.ts` or `index.ts` in new code.
- **Suffixes:** `*Page` for a routed screen, `*Panel` for context-bar content, `*Dialog`, `*Form`, `*Menu`; `*Provider` puts a context into React, `use*` is a hook, `create*Store` a store factory, `*Schema` a zod schema, `*Plugin` a plugin contract.
- **Booleans** start with `is`, `has`, `should` or `can`: `isDirty`, `isEditing`, `hasFailed`, `canUndo`. Options passed to a library keep the library's names.
- **Handlers** are `handle*` (`handleRemove`); props that take them are `on*` (`onClose`).
- **Constants** are UPPER_SNAKE: `GRID_COLUMNS`, `ERROR_TITLES`, `MAX_ITEMS`.
- **Functions** are descriptive verbs: `formatRange`, `getFieldLabel`, `frameToRows`, `resolveLayouts`.

## React and state

The skills below cover the general rules; these are this project's choices.

- **Composition:** no boolean mode props; pick parts or variants (`ErrorState.Full | Inline | Banner`, `ChartSkeleton | TableSkeleton`). Compound components share context (`Panel.*`, `ErrorState.*`, `Page.*`) and export each part by name as well, for Fast Refresh. Children over render props.
- **React 19:** `ref` as a prop and `use(Context)`; no `forwardRef`.
- **One owner per kind of state:** server data in TanStack Query; shareable or back-button state in the URL; the dashboard being edited in its store; the frame in the shell store; static values (plugins, user) in a context set once in `app/Providers`; the rest in components ([architecture.md › Where state lives](docs/architecture.md#where-state-lives)).
- **Stores:** a `create*Store` factory, one `*Provider`, read only through `use*` hooks. Only `ShellProvider` knows the shell uses Zustand; consumers call `useSidebar`, `useContextBar`, `useShellActions`. Selectors return primitives or use `useShallow`; callbacks read state with `getState()`. Derived values (`isDirty`, `canUndo`) are computed, never stored.
- **Performance:** lazy-load anything heavy or conditional (routes through the router's `autoCodeSplitting`, context-bar tabs, widgets, datasource adapters). One Suspense boundary per tile or tab, not per page. Drag and resize values stay out of React state and commit on release. The canvas has its own rules in [grid-and-charts.md](docs/dashboard/grid-and-charts.md).
- **react-grid-layout:** the v2 API only, never `react-grid-layout/legacy`.
- **localStorage:** keys come from `storageKey(name)` (`@/lib/storage`). The version lives in the value, not the key: zustand persist's `version`, with a `migrate` when a persisted field changes; dashboards carry `schemaVersion`. Never persist transient UI such as open drawers.

## Notifications, errors, loading

Levels, timings and the full tables are in [feedback.md](docs/ui/feedback.md).

- **Toasts** go through `notify.*` from `@/lib/notify/notify`, never `notifications.show`. The title says the outcome first, in under 60 characters.
- **Mutations:** errors toast automatically; `meta.successMessage` opts into a success toast.
- **Errors:** throw or map to `AppError` (`@/core/errors/AppError`). Routes use `RouteError` / `NotFound`; widgets sit in `QueryBoundary`. First-load errors render inline, never as a toast.
- **Loading:** a skeleton shaped like the content, from `@/ui/components/Skeletons`. Refetches keep the old data and show no skeleton.

## Testing

| Code                                           | Tested with                                                                                                                          | Vitest project      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `core/`, `utils/`, datasource plugins, `lint/` | a unit test for every function with branching logic                                                                                  | `node`              |
| stores (`create*Store`)                        | action semantics: undo steps, save, discard, draft, persisted migrations                                                             | `dom`               |
| hooks with timers or DOM                       | `renderHook` from `@/testing/render`                                                                                                 | `dom`               |
| components                                     | a story per visual state (render and a11y in Chromium), play functions for user flows, an RTL test only for logic a story can't show | `storybook` / `dom` |
| thin routes, layout wrappers, generated code   | not tested                                                                                                                           | –                   |

- **Tests sit next to their code** (`DataFrame.test.ts` beside `DataFrame.ts`). A test that imports no product code is deleted.
- **One provider stack:** `render` and `renderHook` from `@/testing/render`, and every story, run inside `app/Providers`. Routers come from `createTestRouter` / `TestRouter`; page stories render the real app with `<AppStory url="…" />`. Don't build a `QueryClient` or a router by hand.
- **Stories** have no `title:` (the sidebar mirrors `src/`), are named after states (`Default`, `Empty`, `Error`, `Editing`), and fail on any a11y violation; `color-contrast` is off until the light-scheme tokens pass.

## Skills

| Skill                                                           | Use it for                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `vercel-composition-patterns`                                   | Component APIs: parts, variants, providers                                |
| `vercel-react-best-practices`                                   | Render and bundle performance; its Next.js and server rules don't apply   |
| `web-design-guidelines`                                         | Reviewing a screen for accessibility, focus, forms and motion before a PR |
| `mantine-custom-components`, `mantine-combobox`, `mantine-form` | Components on Mantine's Styles API, Combobox, forms                       |

Don't use `frontend-design` in this repo: it picks its own fonts and palettes, and ours come from the tokens.

<!-- Workflow instructions -->

## Planning

Planning lives in `.agents/planning/`; `docs/` holds only human-facing docs about what is built.

| Where                                  | Holds                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `.agents/planning/roadmap.md`          | What we're building, locked decisions, phases, open questions                |
| `.agents/planning/tasks.md`            | The checklist: done, next in order, notes for work that has no plan          |
| `.agents/planning/plans/NN-slug.md`    | One piece of work, with its design and file-level tasks; `NN` is build order |
| `.agents/planning/plans/done/`         | Finished plans, kept in git                                                  |
| `.agents/planning/research/<topic>.md` | Background for one or more plans; its second line links the plan it serves   |
| `docs/architecture.md`                 | Stack, layers, data flow, state owners, storage keys: how the app fits today |
| `docs/ui/`, `docs/dashboard/`          | How the built parts work ([Read first](#read-first))                         |
| `README.md`                            | What the app is, how to run it, a map of the repo                            |

- **One home per fact.** Link to the doc or plan that holds a fact instead of restating it. Relative links must resolve; `lint/docs.test.ts` checks them.
- **Plan layout:** `# NN Title`, then one line: `Status: open | done (date) · Phase N | Cross-cutting · Depends on: … · Research: …`. Sections: Goal, Design, Tasks, Decisions, Verification; add Out of scope, Open decisions or Risks when they help.
- **Tasks:** `- [ ] **Title.** What to do. Done when …`. Tick `[x]` as you go; `[-]` for dropped or moved work, saying why or where to.
- **Changing a plan:** edit it in place and add a dated line to Decisions. No version numbers in file names or headers; git keeps the history.
- **New work:** add a line to `.agents/planning/tasks.md`; write a plan when it needs a design or more than a few tasks.
- **Finishing:** move the plan to `done/`, tick its line in `tasks.md`, move any tasks it leaves open there, and update the doc in `docs/` (and the README, if the repo map or the try-it URLs changed) that describes what was built.

<!-- /Workflow instructions -->
