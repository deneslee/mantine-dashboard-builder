# P1 UI reference: Grafana and EUI

Serves [edit-bar-polish](../plans/edit-bar-polish.md) and the P1 tasks in [current.json](../current.json).

Read Oct 28 with `grafana-lookup` and `eui-lookup`. Grafana at `main` = [`ae5bd5d`](https://github.com/grafana/grafana/tree/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07), read through the GitHub MCP (grafana-ui-mcp returned 404 for `Splitter`). EUI through context7 `/elastic/eui`; the edit bar EUI findings (bottom bar, split button, confirm modal, empty prompt) are already in the plan and not repeated here. Each section: what they do, what it means here. "Inference" marks reasons not stated in the source.

## P1.1 Docked side pane

**Grafana.** In the new layouts, the dashboard owns a right-hand sidebar of its own, inside the dashboard area rather than in the app chrome: [`DashboardSidebarSplitter.tsx`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/public/app/features/dashboard-scene/sidebar/DashboardSidebarSplitter.tsx) on grafana-ui's [`useSidebar`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/packages/grafana-ui/src/components/Sidebar/useSidebar.tsx).

- **One pane at a time.** `sidebar.openPane` holds the current pane (add, element editor, outline, code). `previousState` gives the pane header a Back button.
- **Docked or floating.** It is docked by default in edit mode and floating in view mode. A docked pane adds padding to the body wrapper, so the canvas narrows; a floating one overlays it. Below the `sm` breakpoint it always floats.
- **Width.** Persisted per mode (`dashboard` / `dashboard-view`) in localStorage, clamped to 100 px – max(50 % of the window, 500 px). A pane can ask for a `minWidth`, and the old width comes back when the pane changes.
- **Closing.** `onClosePane('explicit')` from the header's close button; `onClickAway` only for a floating pane. Escape isn't handled in these two files (unverified elsewhere).
- **Pane header** ([`SidebarPaneHeader.tsx`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/packages/grafana-ui/src/components/Sidebar/SidebarPaneHeader.tsx)): Back · title · Dock/Undock · Close, all `IconButton`s with tooltips, plus an optional actions row underneath.
- **Scroll.** The dashboard body is its own scroll container with `tabIndex={0}` and `aria-label="Dashboard content"`, so arrow keys can scroll it.
- **Inspect still uses a `Drawer`** ([`PanelInspectDrawer.tsx`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/public/app/features/dashboard-scene/inspect/PanelInspectDrawer.tsx)), size `md`, so it overlays the panels.

**EUI.** `EuiFlyout type="push"` pads the body by the flyout's width and falls back to an overlay below `pushMinBreakpoint`. The docs warn that push flyouts have no focus trap, no Escape handling and no dialog role, so the app has to manage focus itself. `EuiResizableContainer` has `mode="collapsible"` / `"main"` panels (at least one `main`), `minSize`, keyboard-focusable resize buttons, and `onPanelWidthChange` with panel `id`s for persisting sizes.

**Here.**

- **Reuse the shell's pattern.** [Shell.tsx](../../../src/shell/Shell.tsx) already does this with Mantine `Splitter`: px panes, keyboard steps, width committed on release, a `Drawer` below `md`. Make the dashboard pane a nested `Splitter` inside the dashboard page, built the same way. Like Grafana, it belongs to the page, not the context bar.
- **Pane header.** Title, Close (`ActionIcon` + `Tooltip`), and Back when one pane opened another (palette → editor).
- **Accessibility.** A docked pane is a `role="complementary"` region with a label, not a dialog: no focus trap, no `aria-modal`, which is what `PaneDrawer` fakes today. On open, focus moves to the pane heading; on close, back to the trigger. Escape closes it.
- **Inspect goes in the pane too**, unlike Grafana. The task asks for it, and keeping the grid visible is the point.
- **Width.** Persist one pane width, clamped. Skip per-mode widths and dock/undock until someone asks.

**Open.** Which width (from the main pane's container width, as P1.3.10 already needs) turns the pane into a Drawer?

## P1.2 Grouped page control bar, P1.3 Edit bar

**Grafana, classic toolbar** ([`NavToolbarActions.tsx` › `ToolbarActions`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/public/app/features/dashboard-scene/scene/NavToolbarActions.tsx)):

- **Groups are a list, not a framework.** Each action is `{ group, condition, render }`, and `renderActionElements` puts a separator wherever the group changes. Hidden actions are skipped, so no empty separators appear. Groups: `icon-actions` (star, badges), `add-panel`, `playlist-actions`, `back-button`, `main-buttons`, `new-share-dashboard-buttons`, `settings`.
- **View mode:** Edit (secondary), plus Export and Share.
- **Edit mode:**
  - "Add ▾": an outline primary button with a `Menu` (Visualization, Import from library, Row, Paste panel; Paste is disabled with no copied panel).
  - Settings: a text button.
  - "Exit edit": a text button with the tooltip "Exits edit mode and discards unsaved changes", calling `exitEditMode({ skipConfirm: false })`.
  - Save: a `ButtonGroup` of "Save dashboard" and an angle-down `Dropdown` with an `aria-label` ("More save options": Save, Save as copy). Both are `primary` when `isDirty` and `secondary` when clean. They are never disabled.
- **New-layouts toolbar** ([`new-toolbar/Actions.tsx`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/public/app/features/dashboard-scene/scene/new-toolbar/Actions.tsx)): the same group list on `ToolbarButtonRow alignment="right"`. A comment says panel-edit back and discard moved to the dashboard controls row.
- **No undo/redo** in either toolbar (not found at this ref).
- **Overflow:** `ToolbarButtonRow` folds items that don't fit into a "Show more" toggle (from grafana-ui; not re-read here).

**Here.**

- **P1.2.** `Page.ControlBar` gets three named slots. Separators come from slot boundaries, and an empty slot renders nothing (Grafana's "no blank separators" rule). For overflow, check Mantine `OverflowList` (installed in 9.7.4).
- **P1.3.4–5, Save emphasis.** Grafana keeps Save always enabled and changes its emphasis with `isDirty`. EUI's bottom bar shows only when savable. The plan already disables Save and Discard while clean; Grafana is evidence for "filled when dirty, quiet when clean" as an alternative. Disabled controls can't be focused or explained, so a quiet but enabled Save is worth considering. Decide in the plan.
- **"Save and done".** `Button.Group` + `Menu` with an `aria-label`ed `ActionIcon`, matching Grafana's split save.
- **Undo and Redo** have no Grafana analogue; keep the plan's `ActionIcon` + `useHotkeys`.

## P1.3.8 Done, P1.4 Draft and leave

**Grafana** ([`DashboardPrompt.tsx`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/public/app/features/dashboard-scene/saving/DashboardPrompt.tsx)):

- **Two guards:** `beforeunload` when `isDirty`, and a history `Prompt` that blocks route changes.
- **Same-path changes pass.** A query-string-only change (panel edit, inspect, view panel) never prompts.
- **Unsaved changes modal:** "Do you want to save your changes?" with Cancel (outline), Discard (destructive) and Save dashboard (primary). Save opens the save drawer and moves on in `onSaveSuccess`. Discard calls `exitEditMode({ skipConfirm: true })` and then navigates.
- **No prompt** for a new, never-saved dashboard (`version === 0`), an empty one, or one with no real save changes (`hasActualSaveChanges`).
- **No "Keep draft".** Grafana has no draft store, so the plan's Keep draft is ours.

**Here.**

- **One blocker.** `LeaveDialog` keeps it, and Done routes through it, as the plan says.
- **Add Grafana's same-path rule.** Only a pathname change prompts, so `?inspect=` or `?edit=` never trigger the dialog.
- **Button order and emphasis:** Keep editing (default focus) · Discard (danger) · Keep draft · Save (filled).
- **Query editor.** For P1.4.3 keep it a two-button `modals.openConfirmModal`, as in EUI.

## P1.5 Empty and loading states

**Grafana** ([`DashboardEmpty.tsx`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/public/app/features/dashboard/dashgrid/DashboardEmpty/DashboardEmpty.tsx)):

- **The empty state depends on the user.** Viewers who can't edit get one dimmed line ("This dashboard has no panels.") and no actions.
- **Editing a new dashboard** opens the Add pane in the sidebar on its own, and the canvas shows an icon, "New dashboard", "Add a panel to visualize your data" and a layout picker.
- **Classic layout:** one large primary card ("Add visualization") and two dashed secondary cards (Import panel, Import a dashboard), each with an outline button.
- **Loading** is a centred `Spinner`.

**EUI.** One empty prompt per page. A single primary `fill` action comes first, and secondary actions are empty buttons. When several empty states share a page, use no icons and only secondary actions. Loading, error and empty share one prompt slot (`EuiPageTemplate.EmptyPrompt`).

**Here.**

- **P1.5.1.** `EmptyState` with one filled "Add widget" and a subtle "Start from a template". In view mode for someone who can't edit, text only. In edit mode, opening a new empty dashboard can open the palette pane on its own, as Grafana does. That's a small extra, so decide it in the plan.
- **P1.5.2.** Keep the plan's skeleton, not a spinner (AGENTS.md: "a skeleton shaped like the content").

## P1.10 Inspect tabs

**Grafana** (`PanelInspectDrawer.buildTabs`):

- **Tab order:** Data, Stats, Query, then Metadata (only if the datasource has an inspector), Errors and notices (only when there are some), JSON.
- **No-query panels** (text, for example) get only Errors and JSON.
- **Stats** ([`InspectStatsTab.tsx`](https://github.com/grafana/grafana/blob/ae5bd5da2e1fe2492ffcdaea0ede51787f588c07/public/app/features/dashboard-scene/inspect/InspectStatsTab.tsx)) renders nothing until data exists.
- **A banner, not a tab,** for "Panel plugin not loaded".
- **The JSON tab** (not read at this ref; from memory, unverified) offers a source select: panel JSON, panel data, DataFrame JSON.

**Here.**

- **Our four tabs map onto theirs:** Data = Data, Query = Query, JSON = JSON, Diagnostics = Stats + Errors.
- **Take two Grafana rules.** Hide Data and Query for widgets without a query. Show an error count on the Diagnostics tab label instead of adding a tab only when errors exist, so the tabs don't move around.
- **JSON sections as a `SegmentedControl`** (definition / frames), like Grafana's select.

## Not looked up

- **P1.6, P1.7, P1.8:** local fixes with no design question.
- **P1.9 Details tab:** no direct Grafana analogue found; the closest is the sidebar outline pane, not read.
- **P1.11, P1.12:** our tokens.
- **P1.13, P1.14:** our tooling.
