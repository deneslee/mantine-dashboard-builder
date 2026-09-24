# Dashboard Builder

Phase 0 + 1: project scaffold and app chrome. See `AGENTS.md` for the coding rules.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm storybook    # http://localhost:6006
pnpm test
pnpm lint
pnpm build
```

Recommended: add the Vercel agent skills referenced in `AGENTS.md`:

```bash
npx skills add vercel-labs/agent-skills
```

## What's here

| Area                    | Where                                                              | Notes                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens, theme, variants | `src/design-system`                                                | `tokens.ts` → CSS variables via `cssVariablesResolver`; `ActionIcon` `chrome`, `Paper` `panel`/`widget`, `NavLink` `sidebar` variants |
| App chrome              | `src/components/layouts/shell`                                     | Mantine `Splitter` panes: sidebar · main (navbar + content) · context bar; `Drawer` for undocked panels                               |
| Notifications           | `src/lib/notify`, `src/stores/inbox`, `src/features/notifications` | `notify.*` API, dedupe, priority, persisted inbox tab with unread badge                                                               |
| Errors                  | `src/components/errors`, `src/lib/errors`                          | `AppError`, `ErrorState.Full/Inline/Banner`, 404, route error, app crash, offline banner, widget boundary                             |
| Loading                 | `src/components/feedback`                                          | Shaped skeletons, route pending (300 ms delay, 500 ms minimum), top progress bar                                                      |
| Sample data             | `public/data/dashboards/index.json`                                | Read through `client → dto (zod) → mapper`, with simulated latency in dev                                                             |

## Try it

| URL                                | Shows                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `/dashboards`                      | List page, route skeleton                                                                     |
| `/dashboards/sales`                | Context tabs from the route, per-widget skeletons, one widget failing inside its own boundary |
| `/dashboards/broken`               | Route error with retry                                                                        |
| `/dashboards/missing`, `/anything` | 404 inside the chrome                                                                         |
| `/debug`                           | Every toast level, dedupe, progress, mutation error, throwing widget, all skeletons           |

## Chrome behaviour

| Control                    | Docked                                                   | Undocked or below 992 px  |
| -------------------------- | -------------------------------------------------------- | ------------------------- |
| Burger (`Ctrl+B`)          | Sidebar: full → icons → hidden                           | Opens / closes the drawer |
| Sidebar footer             | Collapse to icons · undock                               | Dock                      |
| Question button (`Ctrl+.`) | Shows / hides the context column (navbar is pushed left) | Opens / closes the drawer |
| Context bar header         | Tabs · undock · close                                    | Tabs · dock · close       |
| Pane edges                 | Drag, arrow keys (Shift = 40 px), double-click resets    | –                         |
| Search (`Ctrl+K` or `/`)   | Spotlight over navigation targets                        | same                      |

Layout preferences persist in `localStorage` (`shell.v1`); open drawers never do, so nothing pops open on load.
