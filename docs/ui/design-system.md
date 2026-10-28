# Design system

The design system stores every value once, as a raw primitive, and gives it a name (a semantic token). The name is published as a CSS variable, and Mantine components are bound to those names. Feature code only ever uses names, so changing a value in one place restyles the whole app.

## The four tiers

```
primitives.ts      '#242424'                        raw values, nothing else
      ↓ aliased by
semantic.ts        elevation.surface.raised         a role, with a light and a dark value
      ↓ emitted as
CSS variables      --app-layer-surface              what CSS modules read
      ↓ bound by
theme/components   Paper.extend + Paper.module.css  what Mantine components apply
```

**1. Primitives** ([primitives.ts](../../src/ui/tokens/primitives.ts))

- The only file with raw values: palette tuples (`palette.dark[7] = '#242424'`), alpha steps, and the spacing, radius, type, weight, shadow, motion, z-index, icon and shell scales.
- Surfaces use Fluent 2's untinted `neutral` grey ramp (`neutral[16] = '#292929'`), its shadow ramp (`elevationShadows`, by blur, twice the opacity in dark) and the `acrylic` numbers. Text and brand stay on `palette`.
- Nothing outside `ui/` may import it; oxlint blocks the import.

**2. Semantic tokens** ([semantic.ts](../../src/ui/tokens/semantic.ts)) name what a value is _for_.

- **Per-scheme roles** have a light and a dark value:
  - `elevation.surface.canvas | panel | raised | sunken | overlay` ([Surfaces](#surfaces-and-materials))
  - `elevation.shadow.raised | floating | overlay | modal`
  - `color.text.primary | subtle | …`
  - `color.border.default | subtle | strong` (translucent, so they read on every surface) and `focused`
  - `layer.*`
  - `chrome` background: the navbar and sidebar stay dark in both schemes, a softer dark grey in light. What sits on them (text, hover, borders, the active item) is fixed light-on-dark.
- **Fixed roles** are the same in both schemes: `motion`, `z`, `radius`, `chart`, `shell` and `material`.
- `toCssVars()` walks this tree and turns each leaf into a variable, e.g. `elevation.surface.raised` → `--app-elevation-surface-raised`.
- **TS-only constants** exist for places where a CSS variable can't go:
  - `shape` (radius keys)
  - `iconSize` / `iconStroke` (Tabler writes `size` as an SVG attribute)
  - `fontWeight` (Mantine passes `fw` straight into CSS)
  - `shadow`
  - the `virtualColor` status aliases: `brand`, `neutral`, `danger`, `warning`, `success`, `info`

**3. Contextual layers** (`--app-layer-surface`, `-border`, `-field`)

- They name "the surface behind me". At the page level they are the canvas.
- Every [`Surface`](../../src/ui/components/Surface/Surface.tsx) re-points `--app-layer-surface` and `--app-layer-border` at itself for its subtree, so parts that must match the surface behind them (a sticky table header, a Tabs border) do, at any depth.

**4. Component bindings** (`theme/`)

- [theme.ts](../../src/ui/theme/theme.ts) builds `createTheme` from the primitives: colors plus the aliases, spacing, radius, font sizes and weights, shadows, and `defaultRadius: shape.control`.
- `theme/components/<Name>.ts` sets defaults with `X.extend({ defaultProps, classNames })`. Examples: radius from `shape.*`, the overlay shadow, and variant styles in `theme/styles/*.module.css`.
- The variants today: ActionIcon `chrome` (the navbar and sidebar), NavLink `sidebar` (with the compact rail state), and Paper `panel` and `widget`: older aliases for a raised card, kept for existing code; new code uses `Surface`.
- `cssVariablesResolver` emits the semantic variables. It also points two of Mantine's own variables at ours (`--mantine-color-body` → overlay surface, `--mantine-color-dimmed` → subtle text), so Mantine's internals follow the tokens.

## How it reaches the page

`Providers.tsx` passes `theme` and `cssVariablesResolver` to `MantineProvider`, which writes three blocks of variables:

```css
:root                                  { --app-radius-control: 0.25rem; --app-z-navbar: 200; … }
:root[data-mantine-color-scheme=light] { --app-layer-surface: #ffffff; --mantine-color-body: var(--app-elevation-surface-overlay); … }
:root[data-mantine-color-scheme=dark]  { --app-layer-surface: #242424; … }
```

Switching the color scheme only flips that `data-` attribute. Every `var()` updates in CSS, and no component re-renders.

Components then get their styling in one of three ways:

| Route                         | Example                                                                               | Resolves through                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Mantine props with theme keys | `gap="xs"`, `color="danger"`, `radius` from the theme default                         | Mantine's `--mantine-spacing-xs`, `--mantine-color-danger-*`, … built from the primitives |
| Component bindings            | every `<Button>` gets `radius: shape.control`; every `<Menu>` gets the overlay shadow | `theme/components/<Name>.ts`                                                              |
| CSS modules                   | `border-bottom: 1px solid var(--app-color-border-default)`                            | the semantic variables                                                                    |

## Surfaces and materials

Layers are told apart by background first, a shadow only from `raised` up, and translucent borders. The model follows Fluent 2 (neutral ramp, shadow ramp, acrylic), with Grafana's background roles and EUI's rule that only the top or bottom of a stack gets a shadow.

| Level     | For                                        | Light         | Dark          | Shadow    |
| --------- | ------------------------------------------ | ------------- | ------------- | --------- |
| `canvas`  | the page, the grid                         | `neutral[96]` | `neutral[10]` | –         |
| `panel`   | regions: panes, sections, the context bar  | white         | `neutral[14]` | –         |
| `raised`  | cards and widgets                          | white         | `neutral[18]` | `raised`  |
| `sunken`  | wells inside a card: a table, a code block | `neutral[98]` | `neutral[12]` | –         |
| `overlay` | menus, popovers, Drawer and Modal content  | white         | `neutral[20]` | `overlay` |
| chrome    | the navbar and sidebar, dark in both       | `neutral[14]` | `neutral[8]`  | –         |

- **Dark gets lighter toward the viewer**, so depth doesn't rest on shadows that barely show on dark grey.
- **Shadows** come from Fluent's ramp: `raised` = 4, `floating` = 8 (a dragged tile, a floating bar), `overlay` = 16, `modal` = 64.
- **Materials:** `solid` by default. `acrylic` is frosted glass for something floating over moving content: the sticky navbar, a toolbar over a chart. It falls back to solid where `backdrop-filter` is missing or the user prefers reduced transparency. The scrim behind a modal is the Drawer/Modal overlay.

`Surface` ([ui/components/Surface](../../src/ui/components/Surface/Surface.tsx)) applies all of this:

```tsx
<Surface level="panel">          {/* a region */}
  <Surface>…</Surface>           {/* no level: one step in front, here raised */}
</Surface>
<Surface level="overlay" material="acrylic">…</Surface>
```

Without a `level`, a Surface takes the next step from the one around it (canvas → panel → raised → sunken → raised), so a widget or card dropped anywhere looks right without choosing. `SplitView.Pane` takes a `level` too. The `Surface` stories (`Levels`, `Nesting`, `Acrylic`, `Composition`) show every case in both schemes.

## Example: a widget tile's background

**1. The raw values** (primitives):

```ts
white = '#ffffff';
neutral[18] = '#2e2e2e';
```

**2. A role, per scheme** (semantic):

```ts
elevation.surface.raised = { light: primitives.white, dark: neutral[18] };
elevation.shadow.raised = { light: elevationShadows.light[4], dark: elevationShadows.dark[4] };
```

**3. Emitted:** `toCssVars` produces `--app-elevation-surface-raised: #ffffff` in the light block and `#2e2e2e` in the dark block.

**4. Bound to a component:** [Surface.module.css](../../src/ui/components/Surface/Surface.module.css):

```css
.root[data-level='raised'] {
  --surface-bg: var(--app-elevation-surface-raised);
  --surface-shadow: var(--app-elevation-shadow-raised);
}
```

**5. Used in a feature:** [WidgetTile.tsx](../../src/features/dashboards/grid/WidgetTile.tsx) only says what the element is:

```tsx
<Surface level="raised" component="section">
```

It never mentions a color, radius or border. To make dark-mode widgets lighter, you edit one line: `raised.dark` → `neutral[20]`. Every widget and card follows.

The same path, shorter:

- **Button radius:** `shape.control = 'sm'` → `ButtonTheme` `radius: 'sm'` → `var(--mantine-radius-sm)` → `primitives.radius.sm` (4 px). Changing `shape.control` restyles every Button, ActionIcon and input.
- **Status color:** `color="danger"` → the `danger` alias → `--mantine-color-danger-*` → the red palette, in both schemes.
- **Icons:** `size={iconSize.sm} stroke={iconStroke}` → 16 and 1.75. These are TS constants because an SVG attribute can't read a CSS variable.

## Where new things go

- **A new visual value:** add the raw value to `primitives.ts` (if new), name its role in `semantic.ts`, and read `var(--app-…)` in CSS or the constant in TSX.
- **A default for a Mantine component:** `theme/components/<Name>.ts`, registered in `components.ts`.
- **Something that sits in front of something else** (a card, a pane, a floating bar): `Surface`, with a `level` only when the automatic step is wrong.
- **A reusable look:** a variant in `theme/components/<Name>Theme.module.css`, selected with `[data-variant]`.
- **One-off layout in a feature:** a CSS module reading semantic variables.

The lint rules keep this honest. oxlint rejects numeric spacing, `fw`, `fz` and `radius`, palette colors, numeric icon sizes, and primitive imports. Stylelint rejects hex, `rgb()`, palette shades, and raw colors, radii, z-index and durations. [lint/rules.test.ts](../../lint/rules.test.ts) proves each rule fires.

**One subtlety, fix planned:** a plain `<Paper>` or `<Card>` with no variant is painted by Mantine's `--mantine-color-body`, which points at the **overlay** surface. In light that is white like `raised`; in dark it is now one step lighter (`neutral[20]` against `neutral[18]`), so use `Surface` for cards. The fix: point `--mantine-color-body` at the canvas surface, bind `ModalBase` (Modal, Drawer) to overlay, and bind the parts that must match the surface behind them (Table's sticky header, the active Tabs border, Scroller's fade) to `--app-layer-surface`. In Mantine 9.6, Popover and Menu don't use `--mantine-color-body`. The task is in [tasks.md](../../.agents/planning/tasks.md#tokens-and-contrast).
