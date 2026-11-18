# Node Studio implementation plan

Start Codex in the feature checkout and give it [the kickoff prompt](KICKOFF.md). Use the [reference list](REFERENCES.md) when implementing a specific interaction.

## Starting point

- Checkout: `C:\Users\leede\Documents\Projects\CDSS\TEMP\mantine-dashboard-builder`, branch `feat/node-studio`.
- Already present: `src/features/node-studio/AGENTS.md`. It defines the frontend boundary and visual review checkpoint.
- Remaining at inspection: the route, schema fixture, canvas, and inspector. Neither graph package appears in the root manifest.
- First review: an interactive schema editor at `/node-studio` inside the existing shell. Use React Flow defaults and feature-local styling.

## First milestone

1. done already
2. Add a thin route at `src/app/routes/node-studio.tsx` following local lazy-loading conventions. Let TanStack Router generate the route tree. The existing root outlet supplies the shell. Use the direct URL for review.
3. In `src/features/node-studio/`, define a small in-memory schema with stable table, field and relationship IDs. Seed Customers.id, Orders.id, Orders.customerId and Orders.billingCustomerId. Start with Orders.customerId pointing to Customers.id. The spare billing field makes adding a second valid relationship easy to test.
4. Render one simple card per table with named field handles. Use built-in dragging, selection, pan, zoom and fit view. Import React Flow CSS from the feature. Give the graph container a definite height inside the shell.
5. Select and rename a field in a small local inspector. Allow creating a field connection, reject an exact duplicate, and support reconnecting an existing edge. Resolve endpoints by ID so label edits preserve relationships.
6. Review in the browser. Drag a table, rename a connected field, reconnect to the billing field, then add the original connection again. Confirm a duplicate is rejected, both edges stay attached to their rows, and shell navigation works. Return the running URL, screenshot, check results and files changed outside the feature.

**Pause here for visual review.** The user decides on card density, handle usability and whether to proceed to Explore.

## After review

- Add `react-force-graph-2d` on demand for a separately loaded, read-only Explore comparison.
- Use the same schema IDs. Render copied nodes and links so the simulation can update coordinates without moving authored cards. Retain the Build layout and selection when switching views.
- Compare neighbor highlighting on a larger local schema. Decide whether to integrate Explore after trying both views.
- Rule authoring, dashboard relationships, backend persistence and custom Mantine theme integration are later decisions.

## Shared changes and checks

Expected shared edits are the route, generated route tree, manifest and lockfile. Keep graph state and styling within the feature. Use targeted checks and the browser walkthrough. Report an actual lint blocker with its file and rule name before proposing a feature-scoped exception. Keep global lint configuration and unrelated formatting outside this milestone.
