# Edit bar polish

Status: open · Step P1 (Edit UI polish) · Depends on: Control bar groups, Docked panels · Research: EUI lookups below, [p1-ui-reference](../research/p1-ui-reference.md) (Grafana and more EUI)

## Goal

Make edit mode's controls clear and safe: what is editing, what is unsaved, what Save and Discard do, and how to leave. Replaces the Edit bar, Confirmations, Done vs leave, Empty and loading states and One `editable` flag lines in [tasks.md](../tasks.md#edit-ui-polish); fold them in as these tasks finish.

Today ([EditToolbar.tsx](../../../src/features/dashboards/header/EditToolbar.tsx)): seven equal-weight buttons in `Page.ControlBar` next to the time range; a text status ("Unsaved changes" or "Saved locally"); Discard runs at once and clears the undo history; Import JSON is in the toolbar and Export JSON in `Page.Actions`; "Done" opens [LeaveDialog.tsx](../../../src/features/dashboards/editor/LeaveDialog.tsx) because its blocker fires for any `mode !== 'edit'` while dirty.

## What EUI does

Read with the `eui-lookup` skill (context7 `/elastic/eui`, GitHub `elastic/eui` at `e058541`). EUI is a reference only.

| Pattern                                                                                                                                                               | EUI                                                                                                                                                                                                                                             | Here                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Bottom bar](https://github.com/elastic/eui/blob/e058541faad3e2fbae4868901310c8951e04894c/packages/website/docs/components/containers/bottom-bar.mdx)                 | Shown only when a form is savable. A landmark (`aria-label`, hidden `h2`, assertive announcement). `sticky` inside the page body in the page template, so it never covers the sidebar. Discard is `EuiButtonEmpty`, Save the one `fill` button. | A sticky commit bar in `Page.Body` works with docked panes where a fixed one would not. Our bar also holds Add widget and Done, so it stays visible, with Save and Discard disabled while clean. |
| [Split button](https://github.com/elastic/eui/blob/e058541faad3e2fbae4868901310c8951e04894c/packages/eui/src/components/button/split_button/split_button_actions.tsx) | A primary action plus an icon button that opens a popover of related alternatives; the secondary needs an `aria-label`; `isDisabled` and `isLoading` can sit on the parent or on each action.                                                   | Save with a menu holding "Save and done". Import and Export are not alternatives to Save, so they get their own `Menu`. Check Mantine's `Button.Group` plus `Menu` first.                        |
| [Confirm modal](https://github.com/elastic/eui/blob/e058541faad3e2fbae4868901310c8951e04894c/packages/website/docs/components/containers/modal/_confirm_modal.mdx)    | `title`, `onCancel`, `onConfirm`, button texts, `buttonColor="danger"`, `defaultFocusedButton`. Its own destructive example is "Discard dashboard changes?" with "Keep editing" and "Discard changes". Two buttons only.                        | `modals.openConfirmModal`, danger confirm, focus on Cancel (EUI focuses Confirm). A three-way choice needs a custom body, which `LeaveDialog` already is.                                        |
| [Empty prompt](https://github.com/elastic/eui/blob/e058541faad3e2fbae4868901310c8951e04894c/packages/website/docs/components/display/empty-prompt/index.mdx)          | Icon, title, body, primary and secondary actions; the page template centres it.                                                                                                                                                                 | Mantine `EmptyState`. Read EUI's `_guidelines.mdx` for the empty-state types before writing copy.                                                                                                |

Source and docs can disagree: the split button's doc comment names a different icon from the one the code forces, and the docs say the parent "overrides" `isDisabled` while the code ORs parent and child. Trust the `.tsx`.

## Design

- **Groups.** Editor tools (Editing badge, Undo, Redo, Add widget), commit actions (Discard, Save, Done), and a file menu (Import, Export). These are the groups of "Control bar groups"; do not build a second toolbar framework.
- **State.** The store already has `isDirty`, undo and redo state, `announcement` and `draftError`. New: `wasRestored`, set when a draft is restored at store creation, for the one-time notice. A draft marker in view mode reads `isDirty`, since a draft is written only while dirty.
- **`editable`.** `EditToolbar` loses `isWide` (today from `useMediaQuery` on `dimensions.grid.breakpoints.md` in `DashboardPage.tsx`). One flag from the grid's measured width gates the toolbar and dragging.
- **Rules that apply.** `ActionIcon` + `Tooltip` + `aria-label` for icon buttons, `useHotkeys` for shortcuts, `notify.*` for toasts, no inline `style`, semantic tokens only ([AGENTS.md](../../../AGENTS.md#mantine-first)). Feedback levels are in [feedback.md](../../../docs/ui/feedback.md).

## Tasks

- [ ] **Edit bar.**
  - An "Editing" `Badge` that also shows the dirty state.
  - Undo and Redo as `ActionIcon` + `Tooltip` + `aria-label`, with `useHotkeys`.
  - Add widget as the one filled button.
  - Discard (low emphasis) and Save (`loading` while saving) with a "Save and done" menu entry; both disabled while `!isDirty`.
  - Import and Export JSON in one `Menu` behind an `ActionIcon`; Export leaves `Page.Actions` in edit mode.
  - Done when the three groups stay apart, every state has a story (clean, dirty, saving, nothing to undo) and Undo and Redo work by keyboard.
- [ ] **Commit bar placement.** If `Page.ControlBar` cannot stay in view while scrolling, a sticky commit bar in `Page.Body`: a landmark with an `aria-label`, announced when it appears, with its height in an `--app-*` variable so the last grid row is not covered. Done when a long dashboard keeps Save reachable without covering a tile, and the docked editor pane does not overlap it. Decide together with "Control bar groups".
- [ ] **Confirmations.** `modals.openConfirmModal` for:
  - Discard: "Discard changes?", buttons "Keep editing" and "Discard changes" (danger), the body says it clears the undo history, focus on Cancel.
  - Leaving the query editor with unapplied changes, which uses `window.confirm` today.
  - Done when no `window.confirm` is left.
- [ ] **Done vs leave.** "Done" while dirty goes through `LeaveDialog`, which gets Save, Keep draft, Discard and Keep editing. Keep draft is `blocker.proceed`, since the draft is already stored; Save and Discard run, then proceed. View mode marks a dashboard that has a draft. Done when each button is covered by a store or blocker test.
- [ ] **Empty and loading states.**
  - `EmptyState` for an empty dashboard: icon, title, description, primary "Add widget" and secondary "Start from a template". In edit mode the primary opens the palette; today edit mode has no Add widget here.
  - A skeleton instead of "Opening editor…".
  - A one-time "Restored your unsaved draft" notice from `wasRestored`.
  - Done when each state has a story.
- [ ] **One `editable` flag.** `EditToolbar` reads the flag and drops `isWide`; Add widget is no longer hidden by viewport width. Done when at 667 px the toolbar and dragging are both off, or both on.

## Decisions

- Import and Export live in their own menu, not under Save: EUI's split button is for alternatives to the primary action.
- Discard is confirmed rather than made undoable, matching EUI. Revisit if the confirm feels heavy.

## Open decisions

- Sticky commit bar, or only the grouped top bar? Depends on whether the page body scrolls inside the shell.
- Should the draft marker also appear in the dashboards list? That needs a draft lookup per dashboard id.

## Verification

- Stories for each bar state and for each empty and loading state, with the a11y check on.
- Store tests: Discard clears the undo history after confirm; `wasRestored` is set only when a draft was restored.
- Keyboard: Undo and Redo hotkeys, focus into and out of the confirm and leave dialogs, the bar announced when it appears.
- `pnpm lint` (including `lint/docs.test.ts` for the links) and `pnpm test` pass.
