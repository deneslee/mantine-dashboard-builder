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
    pnpm test             # Vitest; `pnpm test <path>` runs one file
    pnpm storybook        # http://localhost:6006

**Before you call a change done:**

- `pnpm lint` and the tests for what you touched pass. Run `pnpm build` when types, imports or routes changed.
- Every new component state has a story, and every behaviour a test.
- Prettier has formatted the files, and the commit message follows Conventional Commits.
- The plan is current ([Planning](#planning)).

## Read first

Versions are in `package.json`; the stack and why it was chosen are in [plan.md › Stack](docs/planning/plan.md#stack).

| Working on                               | Read                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| What to build next, and fixed decisions  | [plan.md](docs/planning/plan.md), [tasks.md](docs/planning/tasks.md)                                 |
| Navbar, sidebar, context bar, panes      | [shell.md](docs/ui/shell.md)                                                                         |
| Styles, tokens, the Mantine theme        | [design-system.md](docs/ui/design-system.md)                                                         |
| Toasts, errors, loading                  | [feedback.md](docs/ui/feedback.md)                                                                   |
| Dashboards, widgets, datasources, charts | [dashboard.md](docs/dashboard/dashboard.md), [grid-and-charts.md](docs/dashboard/grid-and-charts.md) |
| Planned work                             | Its plan in `.agents/plans/`                                                                         |

## Mantine first

1. **Read the docs for the installed Mantine version** before using or replacing a component or hook: its Styles API (selectors, CSS variables, data attributes) and the theming pages (`createTheme`, `Component.extend`, `vars`, `classNames`, variants). [mantine.dev/llms.txt](https://mantine.dev/llms.txt) indexes every page as markdown.
2. **Check the `@mantine/core` and `@mantine/hooks` exports before writing a component or hook.** Several custom ones here turned out to exist (`useTimeout`, `VisuallyHidden`, `EmptyState`, `Tooltip.Group`, `Splitter` / `useSplitter`). So do `DataList`, `Menubar`, `ComboboxPopover`, `Scroller`, `OverflowList`, `FloatingWindow`, `useNetwork` and `useHotkeys`.
3. **Icon buttons** are `ActionIcon` + `Tooltip` + `aria-label`, never a custom button or `UnstyledButton`.
4. **Dropdowns, selects and searchable lists** use `Combobox`, or `Select` / `Autocomplete` / `MultiSelect`, which wrap it.
5. **Router links inside Mantine components** use `renderRoot={(props) => <Link to="…" {...props} />}`, so they stay real anchors with preloading.

## Styling and tokens

How the tiers work and where a new value goes: [design-system.md](docs/ui/design-system.md).

- **Outside `design-system/`, use semantic tokens only.**
  - CSS: `var(--app-*)`, or Mantine variables that aren't palette shades (`--mantine-spacing-*`, `--mantine-radius-*`, `--mantine-primary-color-filled`).
  - TSX: token keys and the constants in `semantic.ts`: `gap="xs"`, `fw={fontWeight.medium}`, `size={iconSize.sm} stroke={iconStroke}`, `h={chart.height.md}`.
  - `tokens.ts` holds only the layout numbers TS needs (`shell`, `zIndex`, `grid`).
- **No inline `style`.** Component defaults and variants go in `design-system/theme/components/<Name>.ts` and `theme/styles/*.module.css`; everything else in a CSS module.
- **Status colors are aliases:** `color="danger"`, never `color="red"`. The aliases are `brand`, `neutral`, `danger`, `warning`, `success` and `info`; `dimmed` and `bright` are fine too.
- **Radius and shadow come from the theme.** Don't pass `radius=` or `shadow=` in feature code.
- **Focus and press:** `className="mantine-focus-auto"` for the focus ring on custom focusable elements (no custom `:focus-visible` CSS); `mantine-active` for press feedback.
- **Viewport classes** (`visibleFrom` / `hiddenFrom`) only in the shell. Inside a page, use `@container` queries: `<main>`'s width depends on the panels, not the screen.
- **Scheme-dependent CSS** (`light-dark()`, `@mixin light/dark`) only in `design-system/`.
- **Lint enforces these rules**, and `lint/rules.test.ts` proves each one fires. Exempt: `design-system/**`, stories, tests, and `features/integrations/**` until [06](.agents/plans/06-sentry.md) rebuilds it. The `Design system/Tokens` story shows every semantic variable in both schemes.

## Structure (bulletproof-react, lightly adapted)

    src/
      app/                  APP LAYER: the only place features meet
        routes/             TanStack file routes, thin; `-name.tsx` files are ignored by the router
        App.tsx  Providers.tsx  router.ts  queryClient.ts  routeTree.gen.ts (generated)
      features/<name>/      FEATURE LAYER: never imports another feature or app/
        components/         UI
        hooks/
        model/              types, zod schemas
        api/                client.ts (transport) · dto.ts (wire shape) · mapper.ts (dto → domain) · queries.ts
        store.ts            only when the feature owns state
      components/           SHARED UI: errors/, feedback/ (skeletons), layouts/shell/ (app frame, own store)
      hooks/  lib/  stores/  config/  types/  utils/  testing/     SHARED (lib: notify, AppError, user, sentry)
      design-system/        LOWEST LAYER: tokens, theme, Mantine extensions, Page

- **Imports go one way:** `design-system` ← shared (`components`, `hooks`, `lib`, `stores`, `config`, `types`, `utils`, `testing`) ← `features` ← `app`. oxlint enforces the direction and `import/no-cycle`.
- **Features never import each other.** Combine them in `app/`:
  - A route may import several features and wrap parts in its own Suspense or error boundary.
  - A feature that needs something from another asks for it (props, context, a registry); `app/` passes it in, e.g. `ShellProvider globalTabs`.
  - Code both need moves down to the shared layer.
- **No barrel files (`index.ts`).** Import the file that defines the name: `@/components/errors/ErrorState`, `@/lib/notify/notify`. Barrels defeat tree-shaking.
- **Relative imports** inside a feature or shared module; `@/…` across modules.
- **UI never sees DTOs.** Switching from local JSON to an HTTP API changes `client.ts`, `dto.ts` and `mapper.ts` only.
- **Where does it go?** Look only → `design-system/`. Reusable UI with states → `components/`. Knows about data or the domain → `features/`. Places things on a page → `app/routes/`.

## Naming

Short and plain. `Shell`, `Sidebar`, `ContextBar`, `notify`, `useSidebar`. No `AppShellSidebarPanelContainer`. A file is named after what it exports.

## React and state

The skills below cover the general rules; these are this project's choices.

- **Composition:** no boolean mode props; pick parts or variants (`ErrorState.Full | Inline | Banner`, `ChartSkeleton | TableSkeleton`). Compound components share context (`Panel.*`, `ErrorState.*`, `Page.*`) and export each part by name as well, for Fast Refresh. Children over render props.
- **React 19:** `ref` as a prop and `use(Context)`; no `forwardRef`.
- **State:** providers own state and expose hooks. Only `ShellProvider` knows the shell uses Zustand; consumers call `useSidebar`, `useContextBar`, `useShellActions`. Zustand selectors return primitives or use `useShallow`; callbacks read state with `getState()`.
- **Performance:** lazy-load anything heavy or conditional (routes through the router's `autoCodeSplitting`, context-bar tabs, widgets, datasource adapters). One Suspense boundary per tile or tab, not per page. Drag and resize values stay out of React state and commit on release. The canvas has its own rules in [grid-and-charts.md](docs/dashboard/grid-and-charts.md).
- **react-grid-layout:** the v2 API only, never `react-grid-layout/legacy`.
- **localStorage:** versioned keys (`shell.v1`, `notifications.v1`); never persist transient UI such as open drawers.

## Notifications, errors, loading

Levels, timings and the full tables are in [feedback.md](docs/ui/feedback.md).

- **Toasts** go through `notify.*` from `@/lib/notify/notify`, never `notifications.show`. The title says the outcome first, in under 60 characters.
- **Mutations:** errors toast automatically; `meta.successMessage` opts into a success toast.
- **Errors:** throw or map to `AppError` (`@/lib/errors/AppError`). Routes use `RouteError` / `NotFound`; widgets sit in `WidgetBoundary`. First-load errors render inline, never as a toast.
- **Loading:** a skeleton shaped like the content, from `components/feedback/skeletons`. Refetches keep the old data and show no skeleton.

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

| Where                               | Holds                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `docs/planning/plan.md`             | What we're building, locked decisions, stack, roadmap                        |
| `docs/planning/tasks.md`            | The checklist: done, next in order, notes for work that has no plan          |
| `docs/ui/`, `docs/dashboard/`       | How the built parts work ([Read first](#read-first))                         |
| `.agents/plans/NN-slug.md`          | One piece of work, with its design and file-level tasks; `NN` is build order |
| `.agents/plans/research/<topic>.md` | Background for one or more plans; its second line links the plan it serves   |
| `.agents/plans/done/`               | Finished plans, kept in git                                                  |

- **One home per fact.** Link to the doc or plan that holds a fact instead of restating it.
- **Plan layout:** `# NN Title`, then one line: `Status: open | done (date) · Phase N | Cross-cutting · Depends on: … · Research: …`. Sections: Goal, Design, Tasks, Decisions, Verification; add Out of scope, Open decisions or Risks when they help.
- **Tasks:** `- [ ] **Title.** What to do. Done when …`. Tick `[x]` as you go; `[-]` for dropped or moved work, saying why or where to.
- **Changing a plan:** edit it in place and add a dated line to Decisions. No version numbers in file names or headers; git keeps the history.
- **New work:** add a line to `docs/planning/tasks.md`; write a plan when it needs a design or more than a few tasks.
- **Finishing:** move the plan to `done/`, tick its line in `tasks.md`, move any tasks it leaves open there, and update the doc in `docs/` that describes what was built.

<!-- /Workflow instructions -->
