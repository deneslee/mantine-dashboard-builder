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
5. **Styling:** theme defaults and variants in `src/design-system/theme/components.ts`; CSS modules for anything else. No inline style objects (oxlint rule `app/no-inline-style` blocks them outside `design-system/`), no raw hex colors (Stylelint blocks them). Colors, sizes and z-index come from `src/design-system/tokens/tokens.ts` via `var(--app-*)` or Mantine variables.

## Structure (light feature-based)

```
src/
  app/            providers, router, query client
  design-system/  tokens, theme, extended Mantine, Page layout
  shared/         AppError, config, user context; no UI, no feature imports
  features/<name>/
    components/   UI
    hooks/
    model/        types, zod schemas
    api/          client.ts (transport) · dto.ts (wire shape) · mapper.ts (dto → domain) · queries.ts
    store.ts      only when the feature owns state
    index.ts      public API: entry components, hooks, types
  routes/         thin TanStack file routes; `-name.tsx` files are ignored by the router
```

- Import another feature only through its `index.ts` (oxlint enforces). Inside a feature, import from the file.
- UI never sees DTOs. Switching from local JSON to an HTTP API changes `client.ts`, `dto.ts`, `mapper.ts` only.

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

- **Toasts:** `notify.success | info | warning | error | progress` from `@/features/notifications`. Never call `notifications.show` directly. Title = outcome first, under 60 characters. Warnings and errors also land in the inbox tab. Same `dedupeKey` within 10 s updates instead of stacking.
- **Mutations:** errors toast automatically (global `MutationCache`); set `meta.successMessage` to opt into a success toast.
- **Errors:** throw or map to `AppError` (`@/shared/errors`). Routes use `RouteError` / `NotFound`; widgets wrap in `WidgetBoundary`. Initial-load errors render inline, never as a toast.
- **Loading:** skeleton shaped like the content (`TextSkeleton`, `ChartSkeleton`, `TableSkeleton`, `PanelSkeleton`, `DashboardSkeleton`, `ListSkeleton`). Routes show them after 300 ms and keep them at least 500 ms. Refetches keep old data (`keepPreviousData`); no skeleton on refetch.

## Commands

```bash
pnpm dev              # http://localhost:5173
pnpm build            # typecheck + production build
pnpm lint             # oxlint (type-aware) + Stylelint
pnpm test             # Vitest
pnpm storybook        # http://localhost:6006
```

Every chrome component gets a story per state and a test for its behaviour.
