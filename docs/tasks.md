# Tasks

Planned work lives in [`.agents/plan/`](../.agents/plan/): one plan per step, numbered in the order it's built, each with a task list (`tasks/task-rNN-*.md`). Background: [shell.md](shell.md), [grid-and-charts.md](grid-and-charts.md), [plan.md](plan.md).

## Backlog (not in a plan yet)

### Phase 3: dashboard edit

- [ ] Tile drag and resize following grid rules 5–7: config as module constants, save the layout on `onDragStop` / `onResizeStop` with undo (`zundo`), no saving in `onLayoutChange`.
- [ ] Style the drag placeholder and resize handles (react-grid-layout's defaults are red and black).
- [ ] Measure tile drag and resize like the panel toggles.

### Housekeeping

- [ ] `RouteError` is the one component the React Compiler skips (`try`/`finally` without `catch`); restructure it if it ever matters.
