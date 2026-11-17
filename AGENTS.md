# AGENTS.md

## Commands

    pnpm dev:devtools     # same, plus TanStack Devtools, Vite DevTools and click-to-source (hold Alt+Shift, click)
    pnpm build            # production build
    pnpm lint             # oxlint + type check (tsgolint) + Stylelint; `pnpm typecheck` is the same lint run
    `vp test run <path>` runs one file, NEVER use pnpm test
    pnpm test:unit        # node + jsdom only (fast)
    pnpm test:changed     # only tests affected by uncommitted changes: the check while working
    pnpm relay            # the relay for Azure SQL and MongoDB, on http://127.0.0.1:8787
    pnpm deps             # outdated packages; `deps:up` picks interactively, `deps:mantine` etc. move a group together

**Before you call a change done:**

- `docs/target/` still matches what you built ([Planning](#planning)).

## Read first

| Working on                                                  | Read                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Where the app is going: the rules and the contracts         | [target/architecture.md](docs/target/architecture.md), [target/contracts.md](docs/target/contracts.md) |
| How the app is built today (not the goal, goes out of date) | [current-state.md](docs/current-state.md)                                                              |
| What's fixed, core or swappable, and the plugins            | [core.md](apps/docs/core.md), [potential.md](apps/docs/potential.md)                                   |

Older docs, plans and reviews are outside this repo, in the `builder-docs` folder. They are history, not guidance: do not read them unless asked.

For code exploring use qartez-mcp, `qartez` cli is also avaible

## Mantine first

1. Always use **mantine-mcp** when working on Ui
2. **Check the `@mantine/core` and `@mantine/hooks` exports before writing a component or hook.** Several custom ones here turned out to exist (`useTimeout`, `VisuallyHidden`, `EmptyState`, `Tooltip.Group`, `Splitter` / `useSplitter`). So do `DataList`, `Menubar`, `ComboboxPopover`, `Scroller`, `OverflowList`, `FloatingWindow`, `useNetwork` and `useHotkeys` and others.
3. **Icon buttons** are `ActionIcon` + `Tooltip` + `aria-label`, never a custom button or `UnstyledButton`.
4. **Dropdowns, selects and searchable lists** use `Combobox`, or `Select` / `Autocomplete` / `MultiSelect`, which wrap it.
5. **Router links inside Mantine components** use `renderRoot={(props) => <Link to="…" {...props} />}`, so they stay real anchors with preloading.

## Styling and tokens

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
- **Lint enforces these rules**, and `lint/rules.test.ts` proves each one fires. Exempt: `ui/tokens/**`, `ui/theme/**`, stories, tests, and `features/integrations/**` until [06](https://github.com/deneslee/mantine-dashboard-builder/blob/0e400dd/.agents/planning/plans/06-sentry.md) rebuilds it. The `ui/tokens/Tokens` story shows every semantic variable in both schemes.

## Structure

Package-shaped folders, so each can move to `packages/` when the repo becomes a monorepo. The layers, data flow and state owners are drawn in [current-state.md](docs/current-state.md).

    src/
      app/          the only place features and built-in plugins meet: routes/ (thin TanStack file routes;
                    `-name.tsx` files are ignored), Providers, router, queryClient, plugins.ts, error pages
      features/     dashboards, datasources, settings, notifications, integrations, debug; grouped by area inside
                    (dashboards: data/ state/ grid/ header/ editor/ inspect/), small features flat
      shell/        the app frame: Shell, ShellProvider, useShell, navbar/, sidebar/, contextBar/, breadcrumbs/
      plugins/      WidgetPlugin, DatasourcePlugin and OptionalPlugin contracts, usePlugins; widgets/*,
                    datasources/*, optional/* (in a build only when plugins.json lists them)
      lib/          services: notify/ (toasts, inbox), sentry/, vault/ (secrets), useMotion, useCurrentUser
      ui/           look only: tokens/, theme/, components/ (Page, ErrorState, QueryBoundary, Skeletons)
      core/         plain TypeScript, no React: dashboard/, time/, data/ (DataFrame), errors/ (AppError),
                    relay/ (the relay's contract), crypto/, build/
      utils/        tiny helpers (wait, slugify)
      testing/      render, TestRouter, AppStory, setup: tests and stories only
    relay/          beside src/: the Node server for SQL Server and MongoDB; it imports only src/core/

- **Imports go down the tree above, never up** (`testing/` aside): `app` on top, `utils` at the bottom. `plugins/` imports only `core`, `ui` and `utils`; `shell/` never imports `plugins/`. oxlint enforces it with one rule per folder (`oxlint.config.ts`), plus `import/no-cycle`; `lint/rules.test.ts` proves each rule fires on the fixtures in `lint/fixtures/src/` and `lint/fixtures/relay/`. `core/` also may not use React, Mantine, TanStack, zustand or other UI and state libraries, and `ui/` may not use the router.
- **Features never import each other, `app/`, or a built-in widget or datasource.** Combine them in `app/`:
  - A route may import several features and wrap parts in its own Suspense or error boundary.
  - A feature that needs something from another asks for it (props, context); `app/` passes it in, e.g. `ShellProvider nav` and `globalTabs`, `PluginsContext`.
  - Code both need moves down a layer.
- **Optional plugins reach the app only through `virtual:optional-plugins`**, which only `app/` imports; everything else gets them from `usePlugins()`.
  - Each one is an entry in `OPTIONAL_PLUGINS` (`plugins.config.ts`), and a build has it only when `plugins.json` lists it.
  - `relay/` imports only `src/core/`, and `src/` never imports a server package (`mssql`, `mongodb`, `hono`).
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
- **One owner per kind of state:** server data in TanStack Query; shareable or back-button state in the URL; the dashboard being edited in its store; the frame in the shell store; static values (plugins, user) in a context set once in `app/Providers`; the rest in components ([current-state.md › Where state lives](docs/current-state.md#where-state-lives)).
- **Stores:** a `create*Store` factory, one `*Provider`, read only through `use*` hooks. Only `ShellProvider` knows the shell uses Zustand; consumers call `useSidebar`, `useContextBar`, `useShellActions`. Selectors return primitives or use `useShallow`; callbacks read state with `getState()`. Derived values (`isDirty`, `canUndo`) are computed, never stored.
- **Performance:** lazy-load anything heavy or conditional (routes through the router's `autoCodeSplitting`, context-bar tabs, widgets, datasource adapters). One Suspense boundary per tile or tab, not per page. Drag and resize values stay out of React state and commit on release.
- **react-grid-layout:** the v2 API only, never `react-grid-layout/legacy`.
- **Secrets** (passwords, keys, tokens, connection strings) live only in the vault (`@/lib/vault`). Never in a store, the URL, a query key, a dashboard, an export, a toast or a log.
- **localStorage:** keys come from `storageKey(name)` (`@/lib/storage`). The version lives in the value, not the key: zustand persist's `version`, with a `migrate` when a persisted field changes; dashboards carry `schemaVersion`. Never persist transient UI such as open drawers.

## Notifications, errors, loading

- **Toasts** go through `notify.*` from `@/lib/notify/notify`, never `notifications.show`. The title says the outcome first, in under 60 characters.
- **Mutations:** errors toast automatically; `meta.successMessage` opts into a success toast.
- **Errors:** throw or map to `AppError` (`@/core/errors/AppError`). Routes use `RouteError` / `NotFound`; widgets sit in `QueryBoundary`. First-load errors render inline, never as a toast.
- **Loading:** a skeleton shaped like the content, from `@/ui/components/Skeletons`. Refetches keep the old data and show no skeleton.

## Skills

When Grafana has a relevant analogue for the current work, use the
`grafana-lookup` skill (`.agents/skills/grafana-lookup/SKILL.md`) to check its UI, React and
data implementation through `grafana-ui-mcp` before settling an open design detail.
Keep the lookup scoped to the current task and adapt findings to this app. Same for elastic ui: the `eui-lookup` skill (`.agents/skills/eui-lookup/SKILL.md`).
Both are local skills: `.agents/skills` is gitignored, so these paths are not links.

| Skill                                                           | Use it for                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `vercel-composition-patterns`                                   | Component APIs: parts, variants, providers                                |
| `vercel-react-best-practices`                                   | Render and bundle performance; its Next.js and server rules don't apply   |
| `web-design-guidelines`                                         | Reviewing a screen for accessibility, focus, forms and motion before a PR |
| `mantine-custom-components`, `mantine-combobox`, `mantine-form` | Components on Mantine's Styles API, Combobox, forms                       |
| `task-research`, then `task-plan`                               | Research a task against Grafana, EUI and other systems, then plan it      |

<!-- Workflow instructions -->

## Planning

- The target is `docs/target/`: the architecture page lists the rules and the areas to work through, in order; the contracts page says what each part promises.
- This repo holds no plans, task lists or research. Steps for a piece of work are written right before the work, and removed when it is done.
- When what is built changes, update `docs/target/` (if a rule or contract changed) and `README.md` (if the repo map or commands changed). Do not add other docs without being asked.
- Relative links in Markdown must resolve; `lint/docs.test.ts` checks them.

<!-- /Workflow instructions -->

<!--VITE PLUS START-->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`pnpm dlx convex ai-files install`.

<!-- convex-ai-end -->
