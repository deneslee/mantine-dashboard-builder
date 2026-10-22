# react-grid-layout 2.3.0

Status (Oct 22, 2026): **not adopted.** 2.3.0 was tried and reverted to 2.2.4: in edit mode the drag preview and the dragged tile went wrong. `package.json` pins `2.2.4` exactly; keep it there until [When to upgrade](#when-to-upgrade) holds.

2.3.0 (Oct 5, 2026) has no changelog entry or release notes. This summary comes from the published packages and the 48 commits between `v2.2.4` and `2.3.0` ([compare](https://github.com/react-grid-layout/react-grid-layout/compare/v2.2.4...2.3.0)). Grid rules live in [grid-and-charts.md](../dashboard/grid-and-charts.md).

## What changed

**Breaking (types only).** `ResponsiveGridLayout` is now wrapped in `forwardRef` to expose the container div ([#2244](https://github.com/react-grid-layout/react-grid-layout/issues/2244)). The wrapper is typed with `ResponsiveGridLayoutProps<string>`, so the breakpoint generic is gone:

- `<ResponsiveGridLayout<Breakpoint>>` fails with TS2558.
- `onBreakpointChange` passes a `string`, so `breakpoint.current = next` and `actions.setBreakpoint(next)` fail with TS2322 and TS2345.
- Runtime props are unchanged. The fix is under [Type fix](#type-fix).

**Always on, no option to turn it off:**

- **Memoized `GridItem`** ([#2240](https://github.com/react-grid-layout/react-grid-layout/issues/2240)). An item re-renders only when its geometry, the grid config, its flags, its `children` (by identity) or `onDrag` / `onDragStop` / `onResize` / `onResizeStop` change. `layout`, `handle`, `cancel`, `resizeHandles`, `constraints`, `static`, `onDragStart` and `onResizeStart` are not compared, so an item that did not move keeps their old values.
- **Edge auto-scroll while dragging** ([#2232](https://github.com/react-grid-layout/react-grid-layout/issues/2232)). When the pointer is within 50 px of an edge of the nearest scrollable ancestor (`overflow: auto` or `scroll`, and overflowing), that ancestor scrolls 12 px per frame until the drag stops or the pointer leaves the edge.

**Fixes that apply to us:**

- A drag whose mouseup arrives before the drag start renders now ends ([#2291](https://github.com/react-grid-layout/react-grid-layout/issues/2291)).
- Resize drift, through `react-resizable` ^3.2.0 ([#2233](https://github.com/react-grid-layout/react-grid-layout/issues/2233)).
- External drop (the palette, later): no `onLayoutChange` mid-drag ([#2219](https://github.com/react-grid-layout/react-grid-layout/issues/2219)), and the drop position accounts for scroll ([#2143](https://github.com/react-grid-layout/react-grid-layout/issues/2143)).
- Not used here: wrap-compactor collisions (#2252), free-form swaps (#1982), `containerBounds` resize (#1779), `y: Infinity` (#2161), `data-grid` re-seeding (#2110).

**New, opt-in:**

- `useContainerWidth({ debounceTimeout })` ([#2254](https://github.com/react-grid-layout/react-grid-layout/issues/2254)). Keep it off: grid rule 1 says not to debounce the width.
- `dragConfig.allowMobileScroll` ([#1793](https://github.com/react-grid-layout/react-grid-layout/issues/1793)). Not needed: below `md` the grid doesn't drag.
- Touch drop from outside the grid ([#2281](https://github.com/react-grid-layout/react-grid-layout/issues/2281)): `dropConfig.touchEnabled` and `touchDragSource`. It only picks up elements with `data-rgl-draggable`.

**Packaging:** `react-resizable` ^3.1.3 → ^3.2.0. Peer dependencies and `css/styles.css` are unchanged.

## Why update

- **Drag and resize performance.** Only the tiles that move re-render, instead of every tile on every move. We already memoize children by widget id (grid rule 4), so `/dashboards/perf` gains the most.
- **The drag and resize fixes** above.
- **Palette drag-in.** [07](../../.agents/planning/plans/07-dashboard-model.md) plans dragging widgets in from the palette through `dropConfig`; 2.3.0 fixes that path and adds touch drop.

## What went wrong

In edit mode, dragging a tile showed the preview (the placeholder) and the tile in the wrong place. This isn't reproduced on its own yet.

**Likely cause: edge auto-scroll.** The canvas scrolls inside `<main>`. When the pointer is within 50 px of `<main>`'s edge, for example grabbing a tile header near the top of a scrolled pane, RGL scrolls `<main>` every frame. react-draggable only recomputes the drag position on pointer moves, so while the pointer is still the tile rides along with the content and the placeholder stays where it was; the next move jumps.

**Second suspect: the `GridItem` memo** keeping old props on items that didn't move (the list above).

To tell them apart on 2.3.0, on `/dashboards/perf`:

1. Scroll to the top and drag a tile with the pointer well away from the pane edges. A correct preview points at edge auto-scroll.
2. Scroll down and drag a tile to the bottom edge, then hold the pointer still. If the page scrolls and the tile drifts off the pointer, that's the cause.

## Suggested solution

1. **Stay on 2.2.4,** pinned exactly.
2. **Report it upstream** with the repro above: edge auto-scroll has no opt-out and doesn't update the drag while the pointer is still. Ask for a `dragConfig` option to turn it off.
3. **Add a regression test first.** A play function in the grid stories that drags a tile in a scrolled container and checks that the placeholder ends under the pointer. It must pass on 2.2.4 before the next upgrade attempt.
4. **Upgrade when** [When to upgrade](#when-to-upgrade) holds, with the [Type fix](#type-fix).
5. **Last resort:** `pnpm patch` RGL to make the edge-scroll controller a no-op. Only if 2.3.x is needed before upstream adds an option; keep the patch to that one file.

### When to upgrade

- Upstream ships an option to turn edge auto-scroll off, or makes it update the drag position while scrolling.
- The regression test from step 3 passes on the new version.
- A manual pass in `pnpm dev`, edit mode: drag near the top and bottom edges with the page scrolled, resize from the `se` handle, cross a breakpoint, switch edit mode on and off, and drag on `/dashboards/perf`.

### Type fix

In [layout.ts](../../src/core/dashboard/layout.ts), next to `Breakpoint`:

```ts
/** RGL reports breakpoints as plain strings; this narrows one back to ours. */
export const isBreakpoint = (value: string): value is Breakpoint => Object.hasOwn(GRID_COLUMNS, value);
```

`Object.hasOwn`, not `in`: `in` doesn't narrow `value` and matches inherited keys such as `'toString'`.

In [DashboardGrid.tsx](../../src/features/dashboards/grid/DashboardGrid.tsx), import `isBreakpoint` and drop the type argument:

```diff
-        <ResponsiveGridLayout<Breakpoint>
+        <ResponsiveGridLayout
           onBreakpointChange={(next) => {
+            if (!isBreakpoint(next)) return;
             breakpoint.current = next;
             actions.setBreakpoint(next);
           }}
```

And a test in `layout.test.ts` (add `isBreakpoint` to its import):

```ts
it('recognises only grid breakpoints', () => {
  expect(['lg', 'md', 'sm'].every(isBreakpoint)).toBe(true);
  expect(isBreakpoint('xl')).toBe(false);
  expect(isBreakpoint('toString')).toBe(false);
});
```
