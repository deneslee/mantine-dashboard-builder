# 03 Design tokens (one source of truth, Mantine-native)

Status: done (Sep 27, 2026) · Cross-cutting · Research: [design-tokens](../../research/design-tokens.md) · How it works now: [docs/ui/design-system.md](../../../../docs/ui/design-system.md)

## Objective

Every visual decision is stored once and then referenced by name everywhere else. For example:

- changing the primary button radius to `md` is a one-line edit that changes every button;
- a widget's background follows whatever surface it sits on;
- devtools shows `var(--app-elevation-surface-raised)` instead of a hex value.

**This is not a rewrite of Mantine.** Mantine stays the component library and its theme stays the engine. The token tiers feed `createTheme`, `virtualColor`, `Component.extend` and `cssVariablesResolver`. Nothing replaces them.

## Status (Sep 27, 2026)

**All tasks are done (Sep 27).** Still deferred: the nested-layer rules, the nested-layer story and the "Outline layers" debug switch (§3, §7). They moved to the phase 4 backlog in `docs/tasks.md`, where the `container` widget puts widgets inside a widget. The notes below describe the state before that work.

**Done:**

- `tokens/primitives.ts` (tier 1)
- `tokens/semantic.ts` with `toCssVars()` (tier 2), plus its unit test
- `virtualColor` aliases
- `theme/components/<Name>.ts` with radius from `shape.*`; `theme/components.ts` now only collects them

**Left over from those tasks:**

- **`tokens.ts` is a second source of truth.**
  - Its `chrome` (which has an `rgba()` literal), `surface` and `motion` groups duplicate `semantic.ts`, and nothing outside the design system reads them.
  - Only `shell`, `zIndex` and `grid` are read outside the design system: Splitter sizes, the shell store and the RGL breakpoints.
  - `theme.other = tokens` has no reader.
- **The `legacy` group in `semantic.ts` still emits the old names:** `--app-surface`, `--app-surface-raised`, `--app-border`, `--app-text-muted`, `--app-motion-*` and `--app-brand-sentry`.
  - About 17 CSS files use them.
  - `--app-brand-sentry` has no reader at all, because the Sentry icon hard-codes its hex value.

## Design

### 1. Token contract: 3 token categories across 4 implementation layers

`constant / primitive` ↓ (aliases) `semantic role` ↓ (inherited by placement) `contextual layer role` ↓ (bound by design system) `Mantine component styling`

| Implementation layer          | File / mechanism                                          | Contains                                                                                                                                                                                                                                 | Who may read it                                                          |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **1. Primitives (constants)** | `tokens/primitives.ts`                                    | The **only** place with raw values: palette tuples, white/black alpha steps, spacing / radius / font-size / weight / line-height scales, shadows, durations, easings, z-index numbers, icon sizes and strokes, shell sizes, brand colors | `design-system/**` only (lint-enforced)                                  |
| **2. Semantic**               | `tokens/semantic.ts`                                      | Global visual meaning aliasing primitives, per scheme where needed: surfaces, text, border, shadows, shape, motion, z, chart, chrome                                                                                                     | Emitted as `--app-*` CSS variables and exported as TS constants          |
| **3. Contextual layers**      | `--app-layer-*` (baseline now; `theme/layers.css` later)  | Tokens that follow placement: `--app-layer-surface`, `-surface-hovered`, `-surface-pressed`, `-border`, `-field`                                                                                                                         | Inherited CSS custom properties                                          |
| **4. Component bindings**     | `theme/components/<Name>.ts` + CSS modules + the resolver | `Component.extend({ defaultProps, vars, classNames })`, and Mantine's own variables mapped to semantic tokens (§3)                                                                                                                       | Mantine components apply them automatically; not a consumable token tier |

**`tokens.ts`** keeps only `{ shell, zIndex, grid }`, re-exported from the primitives, for TS code that needs layout numbers outside the design system. `theme.other` is dropped.

**Surface and color vocabulary:**

```
elevation.surface.canvas            dashboard/page canvas
elevation.surface.sunken            recessed region, such as grid background
elevation.surface.raised            first-level cards, panels, widgets
elevation.surface.overlay           menus, popovers, drawers, modals
elevation.shadow.raised             paired with raised surfaces
elevation.shadow.overlay            paired with overlay surfaces
color.text.primary | subtle | subtlest | inverse | disabled
color.border.default | subtle | strong | focused
```

**Component resolution mapping:**

| Situation                | Component consumes          | Resolved meaning                   |
| ------------------------ | --------------------------- | ---------------------------------- |
| Page or dashboard canvas | `elevation.surface.sunken`  | Fixed semantic surface             |
| Widget on the canvas     | `layer.surface`             | First contextual layer → raised    |
| Nested panel in a widget | `layer.surface`             | Next contextual layer (later, §3)  |
| Input inside a panel     | `layer.field`               | Visually distinct editable surface |
| Menu / Drawer / Modal    | `elevation.surface.overlay` | Fixed overlay semantic surface     |

**Status colors in props** are `virtualColor` aliases, used as `color="danger"`, never `color="red"`: `brand` → indigo, `neutral` → gray, `danger` → red, `warning` → yellow, `success` → green, `info` → blue.

**Generated variables:** `cssVariablesResolver` walks the semantic object (`toCssVars(semantic, '--app')`), so a new token can't be forgotten and the TS and CSS names can't drift apart.

### 2. "Change it in one place": shape and sizes (done)

- **Controls:** `shape.control` covers Button, ActionIcon, Input, Select and SegmentedControl (the last through `defaultRadius`).
- **Containers:** `shape.container` covers Paper, Card, Alert, Notification, Modal and Menu dropdowns.
- **Why it holds:** feature code can't pass `radius=` literals (§5), so the theme default always wins.
- **Spacing:** Mantine's keys, plus `2xs` / `3xs` through `MantineThemeSizesOverride` for the current `gap={4|2}` uses.
- **Font weights:** Mantine 9 `fontWeights` keys (`regular`, `medium`, `bold`) instead of `fw={600}`.
- **Icons:** `iconSize.{xs,sm,md,lg}` and `iconStroke` constants.
  - Tabler sets `size` as an SVG attribute, where `var()` doesn't work, so these are TS constants rather than CSS variables.

### 3. Surfaces and layering

- **Overlays go through Mantine's own variables.**
  - Mantine deep-merges our resolver over its defaults (`deepMerge(defaultResolver, providerGenerator)` in `get-merged-variables`).
  - So the resolver maps two variables, light and dark: `--mantine-color-body` → `elevation.surface.overlay` and `--mantine-color-dimmed` → `color.text.subtle`.
  - Menu, Popover, Modal, Drawer, Spotlight and Paper then follow our tokens without their own `classNames`.
- **Overlay shadow:** overlay components get `shadow: 'var(--app-elevation-shadow-overlay)'` as a default prop. Mantine passes `var(…)` values through unchanged (`isNumberLike`).
- **No visual change today:** our values match Mantine's defaults (white / dark-7, gray-6 / dark-2).
  - Mantine's border and text defaults differ from ours: gray-4 vs gray-3, and black vs gray-9. Mapping those is a visual change and not part of this plan.
- **Canvas:** `--mantine-color-body` also paints `<body>`. The shell paints the canvas itself (`global.css`, `Shell.module.css`), so nothing changes there.
- **Paper variants:** `panel` and `widget` read `--app-layer-surface` and `--app-layer-border`. At depth 1 these equal `raised` and `border.default`.
- **Nesting (deferred):** `theme/layers.css` with `[data-layer]` descendant rules (up to 3 levels, no React context).
  - Written with roadmap phase 4 (`docs/plan.md`): the `container` widget is the first surface that holds other surfaces. The phase 3 editor adds none; its panels live in the context bar.
  - The variables and the Paper binding are already in place, so it's CSS only.
- **Portals** leave the nesting and use `overlay` tokens.

### 4. The always-dark chrome: the `chrome` semantic group

- **Decision (Sep 27):** keep the `chrome` group in `semantic.ts`, built from primitives and emitted as `--app-navbar-*` / `--app-sidebar-*`.
- **New tokens:** add `navbarInputBg`, `navbarInputBgHover` and `navbarInputBorder` from `primitives.alpha.white` (with a new `10` step) for the `rgb(255 255 255 / 8–12%)` values in `Search.module.css` and `TopNavbar.module.css`.
- **Dropped: the theme zone** (`[data-app-zone='chrome']` re-assigning the semantic tokens in a subtree).
  - Mantine emits its own variables only on `:root[data-mantine-color-scheme]`, so the zone needed a spike to prove NavLink, ActionIcon, Burger and the menus would follow.
  - The fallback it would have ended in already exists.
  - Revisit only if the chrome must follow light mode.

### 5. Enforcement: making the tokens mandatory

- **Stylelint, built-in rules only.** They apply to `src/**` except `design-system/**` and `features/integrations/**`, through `overrides` in `.stylelintrc.json`.
  - `function-disallowed-list: [rgb, rgba, hsl, hsla]`
  - `declaration-property-value-disallowed-list`: any property, `/--mantine-color-[a-z]+-\d/` (no palette shades)
  - `declaration-property-value-allowed-list` for color, background-color, border-color, fill, stroke, box-shadow, z-index, border-radius and transition-duration: `var(--…)`, `calc(…)` over variables, or a keyword (`0`, `none`, `transparent`, `currentcolor`, `inherit`)
  - No `stylelint-declaration-strict-value`: its Stylelint 17 support was never checked, and the built-ins cover these cases.
- **oxlint `app/no-raw-style-props`** (in `lint/plugin.js`, next to `no-inline-style`). It reports:
  - numeric spacing props other than `0`
  - numeric `fw` / `fz` / `radius`
  - palette names in `c` / `color` / `bg` (allowed: `dimmed`, `bright`, and the semantic aliases)
  - numeric `size` / `stroke` on `Icon*` elements
  - **Exempt:** `design-system/**`, stories and tests.
  - **Exempt for now:** `features/integrations/**`. Plan 06 rebuilds or removes it and drops the exemption.
- **Import boundary:** only `src/design-system/**` may import `tokens/primitives`. `semantic.ts`, `tokens.ts` and the theme alias it.
- **Rollout:** start the rules as **warn**, migrate, then switch them to **error** in the same PR that finishes the migration.
- **Proof the rules fire:** one Vitest test runs `stylelint.lint({ code, config })` on a bad snippet per rule, runs `oxlint` on `lint/fixtures/*.tsx`, and checks each rule id appears.
  - The fixtures sit outside `src`, so `pnpm lint` stays green.

### 6. Mantine static classes and helpers (rules for AGENTS.md)

- **Custom focusable elements:** add `className="mantine-focus-auto"` for the standard focus ring. Don't write custom `:focus-visible` CSS.
- **Custom pressable elements:** add `mantine-active` for press feedback.
- **Viewport visibility:** `visibleFrom` / `hiddenFrom` only for shell chrome. Inside the page, use `@container` (Plan 04).
- **Scheme-dependent values in CSS:** `light-dark()` or `@mixin light/dark`, and only in `design-system/`. Feature CSS reads semantic variables that already switch by scheme.

### 7. Debugging

- **Tokens story:** rebuild `Tokens.stories.tsx` to show the primitives, the semantic tokens in both schemes (swatch, variable name, the primitive it points to), and a shape demo.
- **Deferred with the nesting rules:** the nested-layer demo and the Debug page's "Outline layers" switch (`html[data-debug-layers]`).

## Migration inventory (re-measured Sep 27, excluding `design-system/**` and `features/integrations/**`)

- **TSX:** 30 files.
  - 28 numeric icon `size` / `stroke`
  - 24 numeric spacing values
  - 9 `fw`
  - 16 palette colors
  - 6 fixed chart heights on the Debug page (these become `chart.height`)
- **CSS:**
  - 5 `rgb(255 255 255 / n%)` in `Search.module.css` and `TopNavbar.module.css`
  - 7 palette variables (`--mantine-color-<name>-<n>`)
  - `legacy` variable names in about 17 files, including 2 in `features/integrations/**`, which get the rename too; it's a rename, not a restyle
- **`tokens.ts`:** `chrome`, `surface` and `motion` are unused and go.
- **Not migrated:** raw values in `features/integrations/**` (exempt, see §5).

### 8. Custom code that Mantine already covers

Checked against the exports of the installed `@mantine/core` and `@mantine/hooks` 9.6.2.

| Our code                                                                                                  | Mantine replacement                                                                           | Action                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.srOnly` class in `Skeletons.module.css` / `Skeletons.tsx`                                               | `VisuallyHidden`                                                                              | Replace, delete the class                                                                                                                                        |
| `SlowHint`: `useState` + `useEffect` + `setTimeout`                                                       | `useTimeout(cb, after, { autoInvoke: true })`                                                 | Replace                                                                                                                                                          |
| `Inbox`: `setTimeout(markAllRead, 1500)` in an effect                                                     | `useTimeout`                                                                                  | Replace                                                                                                                                                          |
| `ErrorState.Full` / `.Inline`: hand-built `ThemeIcon` + `Title` + `Text` + actions with own CSS           | `EmptyState` (`icon`, `title`, `description`, `color`, `size`, `align`, `EmptyState.Actions`) | Build Full and Inline **on top of** `EmptyState` (`color="danger"`, sizes `lg` / `sm`). Keep our API, `role="alert"`, the 404 code display and the details panel |
| 5 class joins `[classes.x, className].filter(Boolean).join(' ')`: 4 in `Panel.tsx`, 1 in `SidebarNav.tsx` | `clsx` (Mantine depends on it but doesn't re-export it)                                       | Add `clsx` as a direct dependency; it's already in the bundle through Mantine, so it adds no bytes                                                               |
| Navbar and sidebar icon tooltips, each with its own 400 ms delay                                          | `Tooltip.Group`: after the first tooltip, neighbours open instantly                           | Wrap the navbar actions and the compact sidebar rail                                                                                                             |

**Keep as they are** (checked; no Mantine equivalent, or it's app logic):

- `useDelayedPending`: `useDebouncedValue` delays showing but has no minimum-visible time.
- `useMainLock`: shell-specific width pinning.
- `useBadgeCount` / `useTotalBadgeCount`: `useSyncExternalStore` over tab badges.
- `useContextTabs`, `useShell*`, `useAfterNavigate`, `usePathname`: router and store glue.
- `initialNarrow` in the shell store: the store needs the value before the first render.
- `Panel` itself: layout parts over `Group` / `ScrollArea`.

**Not Mantine, but duplicated:** the abortable wait in `features/dashboards/api/client.ts` and `sleep` in `api/demo.ts`. Both become `utils/wait.ts` with an optional `signal`.

## Decisions

1. **Spacing scale (Sep 24): keep the current one** (`xs 6, sm 10, md 16, lg 24, xl 36`) and add `2xs = 4` and `3xs = 2`. No strict 4 px grid.
2. **Variable prefix (Sep 24):** keep `--app-`.
3. **Chrome (Sep 27):** the `chrome` semantic group (§4). No theme zone.
4. **Icons (Sep 24): token constants plus the lint rule.** No `<AppIcon>` wrapper.
5. **Overlays (Sep 27):** Mantine's `--mantine-color-body` / `--mantine-color-dimmed` mapped in the resolver, not `classNames` per component.
6. **Stylelint (Sep 27):** built-in rules only.

## Out of scope

Changing the look itself (new palette or type scale), mapping Mantine's border and text defaults to ours, density themes, high-contrast theme, and the nested-layer rules until something nests.

## Risks

- **Fighting Mantine's own styles.** Mitigation: tier 4 only uses `defaultProps`, `vars`, `classNames` and the resolver. Never global overrides of `.mantine-*` classes.
- **Overriding `--mantine-color-body` reaches every component that uses it.** Mitigation: the values equal Mantine's today; check the shell, dashboard, settings and overlay stories in both schemes.
- **Churn in the migration PR.** Mitigation: the lint rules stay on warn until the migration is finished.

## Verification

- `pnpm lint` passes with every new rule on **error**, and the rule test in `pnpm test` shows each rule firing on its bad snippet or fixture.
- **"One place" check:** changing `shape.control` to `'lg'` changes every button, input and action icon in Storybook, with no other edit (record the before and after screenshots in the PR).
- **Visual regression:** Storybook stories of the shell, dashboard, settings and errors look the same before and after in both schemes, apart from intended changes.
- The resolver's output is unit-tested: every key in `semantic.ts` produces a CSS variable, and `--mantine-color-body` / `--mantine-color-dimmed` are overridden.
- `grep -rn "theme.other\|legacy" src/design-system` finds nothing.

## Tasks

- [x] **Primitives.** `tokens/primitives.ts` with palette tuples, alpha steps and every scale, including `2xs=4` / `3xs=2`; `createTheme` reads from it.
- [x] **Semantic tokens and generated resolver.** `tokens/semantic.ts` with light and dark values and `toCssVars()`; a unit test checks every key produces an `--app-*` variable.
- [x] **Move `brand.sentry` to the primitives.** `tokens.brand` is gone. `--app-brand-sentry` is still emitted by `legacy` but has no reader, so it goes with that group (see "Migrate the CSS modules").
- [x] **Semantic color aliases.** `virtualColor` aliases `brand`, `neutral`, `danger`, `warning`, `success` and `info`.
- [x] **Split the component tier.** `theme/components/<Name>.ts` with radius from `shape.*`.
- [-] **Spike: chrome theme zone.** Dropped Sep 27: the `chrome` semantic group is the answer ([§4](#4-the-always-dark-chrome-the-chrome-semantic-group)).
- [-] **Spike: tooling compatibility.** Dropped Sep 27: Stylelint built-in rules only, so there is no plugin to check.
- [-] **Nested layers.** Deferred Sep 27 to the phase 4 backlog in `docs/tasks.md` (the `container` widget, the first surface inside a surface): `theme/layers.css` with `[data-layer]` depth rules (up to 3 levels), a nested-layer story, and the "Outline layers" switch on the Debug page. The variables and the Paper binding are already in place ([§3](#3-surfaces-and-layering)).
- [x] **Trim `tokens.ts`.** _(Sep 27: `Shell.tsx` read `theme.other` through `useMantineTheme()` and now reads `tokens`.)_ Keep only `{ shell, zIndex, grid }`; delete `chrome`, `surface` and `motion`, `other: tokens` in `theme.ts`, and the `MantineThemeOther` augmentation in `mantine.d.ts`. Done when `grep -rn "theme.other\|tokens.chrome\|tokens.surface\|tokens.motion" src` finds nothing and `pnpm build` passes.
- [x] **Overlays through Mantine's variables ([§3](#3-surfaces-and-layering)).** In `cssVariablesResolver`, map `--mantine-color-body` → `elevation.surface.overlay` and `--mantine-color-dimmed` → `color.text.subtle`, in light and dark. Menu, Popover, Modal, Drawer and Spotlight get `shadow: 'var(--app-elevation-shadow-overlay)'`. Done when a resolver test checks both overrides and the overlay stories look unchanged in both schemes.
- [x] **Bind the Paper variants to the layer tokens.** `panel` and `widget` in `theme/styles/Paper.module.css` read `--app-layer-surface` and `--app-layer-border`. Done when nothing changes visually (same values at depth 1). The nesting rules wait for a nested surface.
- [x] **Replace custom code with Mantine ([§8](#8-custom-code-that-mantine-already-covers)).**
  - `.srOnly` → `VisuallyHidden`.
  - The `SlowHint` and `Inbox` timers → `useTimeout`.
  - The 5 class joins (4 in `Panel.tsx`, 1 in `SidebarNav.tsx`) → `clsx`.
  - `Tooltip.Group` around the navbar actions and the compact sidebar.
  - The abortable waits in `features/dashboards/api/client.ts` and `api/demo.ts` → `utils/wait.ts` with an optional `signal`.
  - Done when the tests pass and `setTimeout` appears only in `useMainLock`, `useDelayedPending` and `utils/wait.ts`.
- [x] **Rebuild `ErrorState.Full` / `.Inline` on `EmptyState`.** _(Sep 27: EmptyState draws its disc at twice the indicator size, so the CSS module pins the indicator to 24 / 20 px: a 48 / 40 px disc, as before.)_ Same public API, `color="danger"`, `role="alert"`, the 404 code display and the details panel kept; delete the layout CSS it no longer needs. Done when the ErrorState stories look the same (or intentionally better) and `WidgetBoundary.test.tsx` passes.
- [x] **Add the lint rules as warnings ([§5](#5-enforcement-making-the-tokens-mandatory)).** Stylelint built-ins (`function-disallowed-list`, `declaration-property-value-disallowed-list`, `declaration-property-value-allowed-list`), oxlint `app/no-raw-style-props`, and the `primitives` import boundary. `design-system/**` and `features/integrations/**` are excluded. Done when `pnpm lint` lists every violation as a warning.
- [x] **Migrate the CSS modules.** _(Sep 27: the 7 palette variables were all in `features/integrations/**`, so none needed replacing. Also tokenized: the scrollbar radius (pill) and the logo bars (`--mantine-radius-xs`). The two reduced-motion blocks in `global.css` keep `0.01ms`, with a Stylelint disable comment.)_
  - Replace the 5 `rgb(255 255 255 / n%)` in `Search.module.css` and `TopNavbar.module.css` with new `chrome.navbarInput*` tokens.
  - Replace the 7 palette variables with semantic ones.
  - Rename the `legacy` variables (`--app-surface`, `--app-surface-raised`, `--app-border`, `--app-text-muted`, `--app-motion-*`) to their semantic names everywhere, including `design-system/theme/styles/`, `Tokens.stories.tsx` and `features/integrations/**`.
  - Delete the `legacy` group and its skip in `toCssVars`.
  - Done when Stylelint shows no token warnings and `semantic.ts` has no `legacy`.
- [x] **Migrate the TSX props.** _(Sep 27: `fw` is passed through as-is by Mantine, so `fw="medium"` would be invalid CSS; `semantic.ts` gained `fontWeight.*` pointing at `--mantine-font-weight-*`. There's no 500 step and Mantine's own components need `medium` = 600, so the four `fw={500}` labels are now 600. Icon size 20 became `md` in the navbar and `lg` in empty states; spacing 8 became `sm`. Colors in `notify.tsx` and the chart series moved to aliases too, so success toasts are green instead of teal.)_ 30 files: 28 icon sizes and strokes → `iconSize` / `iconStroke`; 24 spacing values → keys (`2xs` / `3xs` for 4 / 2); 9 `fw` → keys; 6 chart heights on the Debug page → `chart.height`; 16 palette colors → aliases. Done when oxlint shows no `no-raw-style-props` warnings and the visual check passes.
- [x] **Switch the rules to error, with a test that they fire.** _(Sep 27: `pnpm lint` skips `lint/fixtures/**` through `--ignore-pattern` in package.json, because `--no-ignore` doesn't bypass the config's `ignorePatterns`.)_ One Vitest test runs `stylelint.lint({ code, config })` on a bad snippet per rule, runs `oxlint` on `lint/fixtures/*.tsx` (outside `src`), and checks each rule id appears. Done when the rules are on error, `pnpm lint` passes and the test passes in `pnpm test`.
- [x] **Tokens story.** _(Sep 27: stories `Semantic`, `Primitives`, `Shape`. Changing `shape.control` to `lg` was checked there: Button, ActionIcon and Input went to 16 px, containers stayed 8 px.)_ Rebuild `Tokens.stories.tsx`: primitives, semantic tokens in both schemes (swatch, variable name, the primitive it points to), and a shape demo. Done when it renders in both schemes in Storybook. The layer demo and the "Outline layers" switch wait for the nesting rules.
- [x] **Update AGENTS.md › Styling and `docs/plan.md` › Design system.** _(Sep 27: new AGENTS.md section "Styling and tokens".)_
  - AGENTS.md: document the tiers, the "semantic only outside design-system" rule, the status aliases, the icon tokens, `mantine-focus-auto` / `mantine-active`, viewport classes only in the shell, and "check the Mantine exports before writing a hook".
  - `docs/plan.md`: replace the stale design-system table, which still lists `theme/components.ts` as the variant home and `theme.other`.
  - Done when it's merged together with the rules switching to error.
