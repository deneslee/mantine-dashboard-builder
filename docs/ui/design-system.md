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

**1. Primitives** ([primitives.ts](../../src/design-system/tokens/primitives.ts))

- The only file with raw values: palette tuples (`palette.dark[7] = '#242424'`), alpha steps, and the spacing, radius, type, weight, shadow, motion, z-index, icon and shell scales.
- Nothing outside `design-system/` may import it; oxlint blocks the import.

**2. Semantic tokens** ([semantic.ts](../../src/design-system/tokens/semantic.ts)) name what a value is _for_.

- **Per-scheme roles** have a light and a dark value:
  - `elevation.surface.canvas | sunken | raised | overlay`
  - `color.text.primary | subtle | …`
  - `color.border.default | …`
  - `layer.*`
- **Fixed roles** are the same in both schemes: `motion`, `z`, `radius`, `chart`, `shell`, and `chrome` (the always-dark navbar and sidebar).
- `toCssVars()` walks this tree and turns each leaf into a variable, e.g. `elevation.surface.raised` → `--app-elevation-surface-raised`.
- **TS-only constants** exist for places where a CSS variable can't go:
  - `shape` (radius keys)
  - `iconSize` / `iconStroke` (Tabler writes `size` as an SVG attribute)
  - `fontWeight` (Mantine passes `fw` straight into CSS)
  - `shadow`
  - the `virtualColor` status aliases: `brand`, `neutral`, `danger`, `warning`, `success`, `info`

**3. Contextual layers** (`--app-layer-surface`, `-border`, `-field`)

- These are meant to follow placement: a panel nested inside a widget would get the next step.
- Today there's only one level, equal to `raised`. The nesting CSS is deferred to phase 4 ([tasks.md](../planning/tasks.md#phase-4-widgets-and-data)), where the `container` widget first puts widgets inside a widget.

**4. Component bindings** (`theme/`)

- [theme.ts](../../src/design-system/theme/theme.ts) builds `createTheme` from the primitives: colors plus the aliases, spacing, radius, font sizes and weights, shadows, and `defaultRadius: shape.control`.
- `theme/components/<Name>.ts` sets defaults with `X.extend({ defaultProps, classNames })`. Examples: radius from `shape.*`, the overlay shadow, and variant styles in `theme/styles/*.module.css`.
- The variants today: ActionIcon `chrome` (the dark navbar and sidebar), Paper `panel` and `widget` (read `--app-layer-*`), NavLink `sidebar` (with the compact rail state).
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

## Example: a widget tile's background

**1. The raw values** (primitives):

```ts
white = '#ffffff';
palette.dark[7] = '#242424';
```

**2. A role, per scheme** (semantic):

```ts
elevation.surface.raised = { light: primitives.white, dark: primitives.palette.dark[7] };
layer.surface = elevation.surface.raised; // depth 1 = raised
```

**3. Emitted:** `toCssVars` produces `--app-layer-surface: #ffffff` in the light block and `#242424` in the dark block.

**4. Bound to a component:** [Paper.module.css](../../src/design-system/theme/styles/Paper.module.css) plus `Paper.ts`:

```css
.root[data-variant='widget'] {
  background-color: var(--app-layer-surface);
  border: 1px solid var(--app-layer-border);
}
```

```ts
export const PaperTheme = Paper.extend({ defaultProps: { radius: shape.container }, classNames: paper });
```

**5. Used in a feature:** [WidgetTile.tsx](../../src/features/dashboards/components/grid/WidgetTile.tsx) only says what the element is:

```tsx
<Paper variant="widget" component="section">
```

It never mentions a color, radius or border. To make dark-mode widgets lighter, you edit one line: `raised.dark` → `palette.dark[6]`. Every widget and panel follows.

The same path, shorter:

- **Button radius:** `shape.control = 'sm'` → `ButtonTheme` `radius: 'sm'` → `var(--mantine-radius-sm)` → `primitives.radius.sm` (4 px). Changing `shape.control` restyles every Button, ActionIcon and input. I checked this in Storybook last round.
- **Status color:** `color="danger"` → the `danger` alias → `--mantine-color-danger-*` → the red palette, in both schemes.
- **Icons:** `size={iconSize.sm} stroke={iconStroke}` → 16 and 1.75. These are TS constants because an SVG attribute can't read a CSS variable.

## Where new things go

- **A new visual value:** add the raw value to `primitives.ts` (if new), name its role in `semantic.ts`, and read `var(--app-…)` in CSS or the constant in TSX.
- **A default for a Mantine component:** `theme/components/<Name>.ts`, registered in `components.ts`.
- **A reusable look** (like `widget`): a variant in `theme/styles/<Name>.module.css`, selected with `[data-variant]`.
- **One-off layout in a feature:** a CSS module reading semantic variables.

The lint rules keep this honest. oxlint rejects numeric spacing, `fw`, `fz` and `radius`, palette colors, numeric icon sizes, and primitive imports. Stylelint rejects hex, `rgb()`, palette shades, and raw colors, radii, z-index and durations. [lint/rules.test.ts](../../lint/rules.test.ts) proves each rule fires.

**One subtlety:** a plain `<Paper>` or `<Card>` with no variant is painted by Mantine's `--mantine-color-body`, which now points at the **overlay** surface, not `raised`. The two have the same values today, so nothing looks wrong. If they ever diverge, give those components a variant or a bound background.
