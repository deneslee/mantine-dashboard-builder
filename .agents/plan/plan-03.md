# Plan 03: Design Tokens (one source of truth, Mantine-native)

Sep 24, 2026 · v1.2.0 · Tasks: [task-r03-03.md](./tasks/task-r03-03.md) · Research: [research-r03-design-tokens.md](./research/research-r03-design-tokens.md)

**v1.1 changes:** the open decisions are settled (see Decisions). New §8 lists custom code that Mantine 9.6.2 already covers, checked against the installed package's exports.

**v1.2 changes:** the Sentry prototype UI (`features/integrations/**` after Plan 02) is exempt from the new lint rules until Plan 06 rebuilds it. Third-party brand colors (`brand.sentry`, added by the prototype) belong in the primitives tier.

**Order:** 3 of 6 · **Depends on:** Plan 02 (files already in their final places) · **Blocks:** Plan 04 (Page uses spacing and surface tokens), Plan 05 (widgets use the layer tokens)

## Objective

Every visual decision is stored once and then referenced by name everywhere else. For example:

- changing the primary button radius to `md` is a one-line edit that changes every button;
- a widget's background follows whatever surface it sits on;
- devtools shows `var(--app-elevation-surface-raised)` instead of a hex value.

**This is not a rewrite of Mantine.** Mantine stays the component library and its theme stays the engine. The token tiers feed `createTheme`, `virtualColor`, `Component.extend` and `cssVariablesResolver`. Nothing replaces them.

## Design

### 1. Three tiers (in `src/design-system/tokens/`)

| Tier              | File                         | Contains                                                                                                                                                                                                                                                                                          | Who may read it                                               |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **1. Primitives** | `primitives.ts`              | The **only** place with raw values: palette tuples (gray, dark, indigo, red, green, yellow, blue, written out explicitly), white/black alpha steps, spacing / radius / font-size / weight / line-height scales, shadows, durations, easings, z-index numbers, icon sizes and strokes, shell sizes | `design-system/theme/**` only (lint-enforced)                 |
| **2. Semantic**   | `semantic.ts`                | Role names that point to primitives, per scheme where needed: surfaces, text, border, shape, motion, status colors                                                                                                                                                                                | Everything; emitted as `--app-*` and exported as TS constants |
| **3. Component**  | `theme/components/<Name>.ts` | Mantine `Component.extend({ defaultProps, vars, classNames })`, using **semantic tokens only**                                                                                                                                                                                                    | Mantine applies it automatically                              |

**Semantic token names** follow Atlassian's `foundation-property-modifier`, flattened into CSS variables:

```
--app-elevation-surface            --app-elevation-surface-hovered     --app-elevation-surface-pressed
--app-elevation-surface-sunken
--app-elevation-surface-raised     --app-elevation-surface-raised-hovered  --app-elevation-surface-raised-pressed
--app-elevation-surface-overlay    --app-elevation-surface-overlay-hovered
--app-elevation-shadow-raised      --app-elevation-shadow-overlay
--app-color-text  -text-subtle  -text-subtlest  -text-inverse
--app-color-border  -border-subtle  -border-strong  -border-focused
--app-radius-control  -radius-container  -radius-pill
--app-motion-duration-fast|base|slow  --app-motion-easing-standard
--app-z-*   --app-layer*  (contextual, §3)
```

**Status colors in props** are Mantine `virtualColor` aliases, used as `color="danger"` and never `color="red"`:

- `brand` → indigo
- `neutral` → gray
- `danger` → red
- `warning` → yellow
- `success` → green
- `info` → blue

**Generated variables:** `cssVariablesResolver` builds its output by **walking the semantic object** (a `toCssVars(semantic, '--app')` helper) instead of listing every variable by hand. A new token can't be forgotten, and the TS names and CSS names can't drift apart.

### 2. "Change it in one place": shape and sizes

```ts
// tokens/semantic.ts
export const shape = { control: 'sm', container: 'md', pill: 'xl' } as const;

// theme/components/Button.ts: every Button, one place
export const ButtonTheme = Button.extend({ defaultProps: { radius: shape.control } });

// If only *primary* (filled) buttons should differ:
Button.extend({
  vars: (theme, p) => ({
    root: {
      '--button-radius': (p.variant ?? 'filled') === 'filled' ? theme.radius[shape.primary] : undefined,
    },
  }),
});
```

- **Controls:** `shape.control` covers Button, ActionIcon, Input, Select and SegmentedControl.
- **Containers:** `shape.container` covers Paper, Card, Alert, Notification, Modal and Menu dropdowns.
- **Why it holds:** feature code can't pass `radius=` literals (§5), so the theme default always wins.
- **Spacing:** keep Mantine's keys and add `2xs` / `3xs` through `MantineThemeSizesOverride` for the current `gap={2|4}` uses.
- **Font weights:** use Mantine 9 `fontWeights` keys (`regular`, `medium`, `bold`) instead of `fw={600}`.
- **Icons:** `iconSize.{xs,sm,md,lg}` and `iconStroke` constants. Tabler sets `size` as an SVG attribute, where `var()` doesn't work, so these are TS constants rather than CSS variables.

### 3. Surfaces and layering (Atlassian vocabulary, Carbon mechanism)

- **Surfaces:**
  - `sunken`: the page canvas behind the dashboard grid
  - `default`
  - `raised`: panels, widgets, cards; always paired with `shadow-raised`
  - `overlay`: Menu, Popover, Modal, Drawer, Spotlight; paired with `shadow-overlay` and set through `theme.components`
- **Contextual layers (Carbon):**
  - Any element with `data-layer` gets `--app-layer`, `--app-layer-hovered` and `--app-layer-border`, based on **how deeply it is nested**. This is pure CSS descendant rules in `theme/layers.css`, up to 3 levels, with no React context.
  - `Paper` variants `panel` and `widget` set `data-layer` and use `var(--app-layer)`.
  - A widget inside a context-bar panel therefore automatically gets the next step, and the same widget on the dashboard canvas gets the first raised step.
- **Portals** leave the nesting and use `overlay` tokens. That is intended.

### 4. The always-dark chrome: a "theme zone" (spike first)

- **Today:** 12 `chrome.*` tokens plus `rgb(255 255 255 / x%)` literals exist only because the navbar and sidebar are dark in both schemes.
- **Proposal:** `[data-app-zone='chrome']` **re-assigns the semantic tokens** (surface, text, border, hovered) to dark values inside that subtree, the way Carbon's inline theme works. Sidebar and navbar CSS then use the same `--app-elevation-*` and `--app-color-text-*` names as the content.
- **Result:** `chrome.*` and the white-alpha literals disappear. The `ActionIcon chrome` and `NavLink sidebar` variants stay, but only reference semantic tokens.
- **Spike question:** Mantine's own scheme variables (`--mantine-color-text`, the default hover) are defined on `:root[data-mantine-color-scheme]` and aren't re-assigned inside a subtree. The spike lists every Mantine component inside the chrome (NavLink, ActionIcon, Menu target, Autocomplete/Spotlight trigger, Burger, Avatar) and confirms each one looks correct.
- **If the spike fails:** keep a small `chrome` group in `semantic.ts` (text, muted, hovered, active, border, surface), built from primitives rather than rgba literals.

### 5. Enforcement: making the tokens mandatory

- **Stylelint** (in `src/**` except `design-system/**`):
  - `function-disallowed-list: [rgb, rgba, hsl, hsla]`
  - a regex ban on palette variables `--mantine-color-<name>-<n>`
  - `stylelint-declaration-strict-value` for color, background, border-color, fill, stroke, box-shadow, z-index, border-radius and transition-duration
- **oxlint `app/no-raw-style-props`** (in `lint/plugin.js`, next to `no-inline-style`). It reports:
  - numeric spacing props other than `0`
  - numeric `fw` / `fz` / `radius`
  - palette names in `c` / `color` / `bg` (allowed: `dimmed`, `bright`, and the semantic aliases)
  - numeric `size` / `stroke` on `Icon*` elements
  - Exempt: `design-system/**`, stories and tests.
  - Exempt **for now**: `features/integrations/**`, the Sentry prototype UI, which is for show and gets rebuilt or dropped in Plan 06. Spending migration time on it would be wasted. Plan 06 removes the exemption.
- **Import boundary:** only `design-system/theme/**` may import `tokens/primitives.ts`.
- **Rollout:** start the rules as **warn**, migrate, then switch them to **error** in the same PR that finishes the migration.

### 6. Mantine static classes and helpers (rules for AGENTS.md)

- **Custom focusable elements:** add `className="mantine-focus-auto"` for the standard focus ring. Don't write custom `:focus-visible` CSS.
- **Custom pressable elements:** add `mantine-active` for press feedback.
- **Viewport visibility:** `visibleFrom` / `hiddenFrom` (the `mantine-visible-from-*` / `mantine-hidden-from-*` classes) only for shell chrome. Inside the page, use `@container` (Plan 04).
- **Scheme-dependent values in CSS:** `light-dark()` or `@mixin light/dark`, and only in `design-system/`. Feature CSS reads semantic variables that already switch by scheme.

### 7. Debugging

- **Tokens story:** rebuild `Tokens.stories.tsx` to show the primitives, semantic tokens in both schemes (swatch, variable name, the primitive it points to), a demo of nested layers, and a shape demo.
- **Layer outlines:** the Debug page gets an "Outline layers" switch that sets `html[data-debug-layers]`, which outlines each `data-layer` by depth. Dev builds only.

## Migration inventory (measured, see research §1)

- **TSX:** about 30 files with numeric props:
  - about 40 icon sizes
  - about 30 spacing values
  - 9 `fw`
  - 6 fixed chart heights (these become a `chart.height` semantic token)
  - 16 palette colors
- **CSS:** 7 rgba literals in 3 modules.
- **tokens.ts:** 12 `chrome.*` tokens.
- **Resolver:** the hand-written list in `theme.ts`.
- **Third-party brand colors:** `tokens.brand.sentry` (`--app-brand-sentry`) from the Sentry prototype. A raw brand value is a primitive; it moves to `primitives.ts` as `brand.sentry` and is only used for that logo. There is no semantic role for it.
- **Not migrated:** `features/integrations/**` (exempt, see §5).

### 8. Custom code that Mantine already covers

Checked against the exports of the installed `@mantine/core` and `@mantine/hooks` 9.6.2 (124 hooks, 273 components).

| Our code                                                                                                             | Mantine replacement                                                                                 | Action                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.srOnly` class in `Skeletons.module.css` / `Skeletons.tsx`                                                          | `VisuallyHidden`                                                                                    | Replace, delete the class                                                                                                                                                                                 |
| `SlowHint`: `useState` + `useEffect` + `setTimeout`                                                                  | `useTimeout(cb, after, { autoInvoke: true })`                                                       | Replace                                                                                                                                                                                                   |
| `Inbox`: `setTimeout(markAllRead, 1500)` in an effect                                                                | `useTimeout`                                                                                        | Replace                                                                                                                                                                                                   |
| `ErrorState.Full` / `.Inline`: hand-built `ThemeIcon` + `Title` + `Text` + actions `Group` with their own layout CSS | `EmptyState` (9.4+): `icon`, `title`, `description`, `color`, `size`, `align`, `EmptyState.Actions` | Build Full and Inline **on top of** `EmptyState` (`color="danger"`, sizes `lg` / `sm`). Keep our API, `role="alert"`, the 404 code display and the dev-only details panel. `Banner` already uses `Alert`. |
| `Panel.*`: `[classes.x, className].filter(Boolean).join(' ')` ×5                                                     | `clsx` (Mantine uses it internally but doesn't re-export it)                                        | Add `clsx` as a direct dependency and use `cx(...)`                                                                                                                                                       |
| Navbar and sidebar icon tooltips, each with its own 400 ms delay                                                     | `Tooltip.Group` (`TooltipGroup`): after the first tooltip, neighbours open instantly                | Wrap the navbar actions and the compact sidebar rail                                                                                                                                                      |
| Plan 01 window resize: `addEventListener` + timers                                                                   | `useWindowEvent` + `useDebouncedCallback`                                                           | Already written into Plan 01                                                                                                                                                                              |
| Plan 01 motion: OS media query                                                                                       | `useReducedMotion`                                                                                  | Already in Plan 01 (`useMotion` builds on it)                                                                                                                                                             |
| Plan 05 dashboard-list paging                                                                                        | `Pagination` / `usePagination`                                                                      | Already in Plan 05                                                                                                                                                                                        |

**Keep as they are** (checked; no Mantine equivalent, or it's app logic):

- `useDelayedPending`: `useDebouncedValue` delays showing but has no minimum-visible time.
- `useMainLock`: shell-specific width pinning.
- `useBadgeCount` / `useTotalBadgeCount`: `useSyncExternalStore` over tab badges.
- `useContextTabs`, `useShell*`, `useAfterNavigate`, `usePathname`: router and store glue.
- `initialNarrow` in the shell store: the store needs the value before the first render. `Shell.tsx` already uses `useMediaQuery` after that.
- `Panel` itself: layout parts over `Group` / `ScrollArea`.

**Not Mantine, but duplicated:** `wait(ms)` is defined in both `DebugPage.tsx` and `useAppearanceForm.ts`. Move it to `utils/wait.ts` (Plan 02).

## Decisions (settled Sep 24, 2026)

1. **Spacing scale: keep the current one** (`xs 6, sm 10, md 16, lg 24, xl 36`) and add `2xs = 4` and `3xs = 2` for the existing `gap={4|2}` uses. No switch to a strict 4 px grid, which would have rounded every step to a multiple of 4 and shifted spacing across the whole app.
2. **Variable prefix:** keep `--app-`. It's already used everywhere and namespaced away from `--mantine-`.
3. **Chrome:** theme zone if the spike passes, otherwise a small `chrome` semantic group.
4. **Icons: token constants plus the lint rule.** `iconSize.{xs,sm,md,lg}` and `iconStroke` in `semantic.ts`, used as `size={iconSize.sm} stroke={iconStroke}`. There's no `<AppIcon>` wrapper: Tabler icons stay plain components, and the lint rule does the enforcing.

## Out of scope

Changing the look itself (new palette or type scale), density themes, high-contrast theme. The tier structure makes all of these possible later.

## Risks

- **Fighting Mantine's own styles.** Mitigation: tier 3 only ever uses `defaultProps`, `vars` and `classNames`. Never global overrides of `.mantine-*` classes.
- **Churn in the migration PR.** Mitigation: do it after Plan 02, one tier at a time, with the lint rules on warn until the migration is finished.
- **`stylelint-declaration-strict-value` and Stylelint 17.** Check compatibility first. If it doesn't work, fall back to `declaration-property-value-allowed-list` regexes.

## Verification

- `pnpm lint` passes with every new rule on **error**. A test fixture file with a violation for each rule fails lint in CI.
- **"One place" check:** changing `shape.control` to `'lg'` changes every button, input and action icon in Storybook, with no other edit (record the before/after screenshots in the PR).
- **Visual regression:** Storybook stories of the shell, dashboard, settings and errors look the same before and after the migration in both schemes, apart from intended changes.
- The resolver's output is unit-tested: every key in `semantic.ts` produces a CSS variable.
