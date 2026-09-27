# AGENTS.md

Rules for humans and coding agents working in this repo. Read before writing code.

## Stack

Vite 8 · React 19 · TypeScript 7 strict · Mantine 9.6.2 · TanStack Router (file routes) + Query · Zustand · zod · Storybook 10 · Vitest · oxlint + Stylelint.

## Mantine first

1. **Read the Mantine 9.6.2 docs for the component or hook before using or replacing it.** Check its Styles API (selectors, CSS variables, data attributes) and the theming pages (`createTheme`, `Component.extend`, `vars`, `classNames`, variants).
2. **Use a Mantine component or hook before writing a custom one.** Mantine 9.6 already has `Splitter`, `EmptyState`, `DataList`, `Menubar`, `ComboboxPopover`, `Scroller`, `OverflowList`, `FloatingWindow`, `useSplitter`, `useNetwork`, `useHotkeys`, `useMediaQuery`.
   - Wrong: a custom button, or `UnstyledButton`, for the context button or theme switcher.
   - Right: `ActionIcon` + `Tooltip` + `aria-label` for every icon button.
   - Wrong: a hand-built resize handle. Right: `Splitter` / `useSplitter`.
3. **Dropdowns, selects and searchable lists** use `Combobox` (or `Select` / `Autocomplete` / `MultiSelect`, which wrap it).
4. **Router links inside Mantine components** use `renderRoot={(props) => <Link to="…" {...props} />}` so they stay real anchors with preloading.
5. **Styling:** theme defaults and variants in `src/design-system/theme/components/<Name>.ts`; CSS modules for anything else. See **Styling and tokens** below.
6. **Check the installed `@mantine/core` and `@mantine/hooks` exports before writing a hook or component.** Several custom ones turned out to exist already (`useTimeout`, `VisuallyHidden`, `EmptyState`, `Tooltip.Group`).

## Styling and tokens

Every visual value is stored once, in tiers ([docs/design-system.md](docs/design-system.md)):

| Tier                  | Where                                                               | Who reads it                                        |
| --------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| 1. Primitives         | `design-system/tokens/primitives.ts`: the only file with raw values | `design-system/` only (oxlint blocks other imports) |
| 2. Semantic           | `design-system/tokens/semantic.ts`, emitted as `--app-*` variables  | everyone                                            |
| 3. Contextual layers  | `--app-layer-*` (surface, border, field)                            | `Paper` `panel` / `widget`; later nested surfaces   |
| 4. Component bindings | `theme/components/<Name>.ts`, `theme/styles/*.module.css`, resolver | Mantine applies them                                |

- **Outside `design-system/`, use semantic tokens only.**
  - CSS: `var(--app-*)`, or Mantine variables that aren't palette shades (`--mantine-spacing-*`, `--mantine-radius-*`, `--mantine-primary-color-filled`).
  - TSX: token keys and the TS constants from `semantic.ts`: `gap="xs"`, `fw={fontWeight.medium}`, `size={iconSize.sm} stroke={iconStroke}`, `h={chart.height.md}`.
  - `tokens.ts` holds only the layout numbers TS needs (`shell`, `zIndex`, `grid`).
- **Status colors are aliases:** `color="danger"`, never `color="red"`. The aliases are `brand`, `neutral`, `danger`, `warning`, `success` and `info`; `dimmed` and `bright` are fine too.
- **Radius and shadow come from the theme:** `shape.control` / `shape.container` in `semantic.ts` set every component's radius; overlays use `shadow.overlay`. Don't pass `radius=` or `shadow=` in feature code.
- **Enforced:**
  - oxlint `app/no-inline-style` blocks `style={{…}}`.
  - oxlint `app/no-raw-style-props` blocks numeric spacing, `fw`, `fz`, `radius`, palette colors, and numeric icon `size` / `stroke`.
  - Stylelint blocks hex, `rgb()` / `hsl()`, palette shades (`--mantine-color-red-6`), and raw colors, radii, shadows, z-index and durations.
  - `lint/rules.test.ts` proves each rule fires. `design-system/**`, stories and tests are exempt; so is `features/integrations/**` until [06-sentry](.agents/plans/06-sentry.md) rebuilds it.
- **Mantine static classes:** `className="mantine-focus-auto"` for the focus ring on custom focusable elements (no custom `:focus-visible` CSS); `mantine-active` for press feedback.
- **Viewport classes** (`visibleFrom` / `hiddenFrom`) only in the shell. Inside a page, use `@container` queries: `<main>`'s width depends on the panels, not the screen.
- **Scheme-dependent CSS** (`light-dark()`, `@mixin light/dark`) only in `design-system/`. Feature CSS reads semantic variables that already switch.
- **Debugging:** the `Design system/Tokens` story lists every semantic variable in both schemes with the primitive it points to.

## Structure (bulletproof-react, lightly adapted)

```
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
```

- **Imports go one way:** `design-system` ← shared (`components`, `hooks`, `lib`, `stores`, `config`, `types`, `utils`, `testing`) ← `features` ← `app`. oxlint enforces the direction and `import/no-cycle`.
- **Features never import each other.** Combine them in `app/`:
  - A route may import several features and wrap parts in its own Suspense or error boundary.
  - A feature that needs something from another asks for it (props, context, a registry); `app/` passes it in, e.g. `ShellProvider globalTabs`.
  - Code both need moves down to the shared layer.
- **No barrel files (`index.ts`).** Import the file that defines the name: `@/components/errors/ErrorState`, `@/lib/notify/notify`. Barrels defeat tree-shaking.
- **Aliases and relative imports:** inside a feature or shared module, use relative imports; across modules, use `@/…`.
- **UI never sees DTOs.** Switching from local JSON to an HTTP API changes `client.ts`, `dto.ts`, `mapper.ts` only.
- **Where does it go?**
  - Look only → `design-system/`.
  - Reusable UI with states → `components/`.
  - Knows about data or the domain → `features/`.
  - Places things on a page → `app/routes/`.

## Naming

Short and plain. `Shell`, `Sidebar`, `ContextBar`, `notify`, `useSidebar`. No `AppShellSidebarPanelContainer`. A file is named after what it exports.

## Composition (Vercel composition-patterns)

- No boolean mode props. Pick explicit parts or variants: `ErrorState.Full | Inline | Banner`, `ChartSkeleton | TableSkeleton`.
- Compound components share context: `Panel.Header/Body/Footer`, `ErrorState.*`, `Page.*`. Export each part by name as well (Fast Refresh).
- Providers own state and expose hooks. Only `ShellProvider` knows the shell uses Zustand; consumers call `useSidebar`, `useContextBar`, `useShellActions`.
- Children over render props. React 19: `ref` as a prop, `use(Context)`, no `forwardRef`.

## Performance (Vercel react-best-practices, SPA-relevant rules)

- Lazy-load anything heavy or conditional: route components (router `autoCodeSplitting`), context-bar tabs, widgets, datasource adapters.
- Run independent queries in parallel; one Suspense boundary per tile or tab, not per page.
- Zustand selectors return primitives or use `useShallow`; read state inside callbacks with `getState()`.
- High-frequency values (drag, resize) stay out of React state; commit on release.
- Version everything in localStorage (`shell.v1`, `notifications.v1`) and never persist transient UI (open drawers).

## Notifications, errors, loading

- **Toasts:** `notify.success | info | warning | error | progress` from `@/lib/notify/notify`. Never call `notifications.show` directly. Title = outcome first, under 60 characters. Warnings and errors also land in the inbox tab. Same `dedupeKey` within 10 s updates instead of stacking.
- **Mutations:** errors toast automatically (global `MutationCache`); set `meta.successMessage` to opt into a success toast.
- **Errors:** throw or map to `AppError` (`@/lib/errors/AppError`). Routes use `RouteError` / `NotFound`; widgets wrap in `WidgetBoundary`. Initial-load errors render inline, never as a toast.
- **Loading:** skeleton shaped like the content (`TextSkeleton`, `ChartSkeleton`, `TableSkeleton`, `PanelSkeleton`, `DashboardSkeleton`, `ListSkeleton`). Routes show them after 300 ms and keep them at least 500 ms. Refetches keep old data (`keepPreviousData`); no skeleton on refetch.

## Commands

```bash
pnpm dev              # http://localhost:5173
pnpm build            # typecheck + production build
pnpm lint             # oxlint (type-aware) + Stylelint
pnpm test             # Vitest
pnpm storybook        # http://localhost:6006
```

Every chrome component gets a story per state and a test for its behaviour. Commits follow Conventional Commits, and Prettier formats everything. Load the `frontend-design` skill before designing or reshaping a screen.

<!-- Workflow instructions -->

## Planning

Two levels: the big picture in `docs/`, the detail for agents in `.agents/plans/`.

| File                                | Holds                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `docs/plan.md`                      | What we're building, locked decisions, stack, roadmap (phases and their plans)           |
| `docs/tasks.md`                     | The big-picture checklist: done, in progress, and notes for phases that have no plan     |
| `.agents/plans/NN-slug.md`          | One piece of work, with its design and file-level tasks in one file; `NN` is build order |
| `.agents/plans/research/<topic>.md` | Background for one or more plans                                                         |
| `.agents/plans/done/`               | Finished plans, kept in git                                                              |

- **Plan layout:** `# NN Title`, then one line: `Status: open | done (date) · Phase N | Cross-cutting · Depends on: … · Research: …`. Sections: Goal, Design, Tasks, Decisions, Verification; add Out of scope or Risks when they help.
- **Tasks:** `- [ ] **Title.** What to do. Done when …`. Tick `[x]` as you go; `[-]` for dropped or moved work, saying why or where to.
- **Changing a plan:** edit it in place and add a dated line to Decisions. No version numbers in file names or headers; git keeps the history.
- **Research:** the second line links the plan it serves.
- **New work:** add a line to `docs/tasks.md`; write a plan when it needs a design or more than a few tasks.
- **Finishing:** move the plan to `done/`, tick its line in `docs/tasks.md`, and move any tasks it leaves open to `docs/tasks.md`.

<!-- /Workflow instructions -->
