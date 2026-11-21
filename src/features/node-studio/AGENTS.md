# Node Studio

Build an isolated, frontend-only schema editor. Its app entry is /node-studio.
The existing shell provides the chrome. Keep graph state, fixtures, rendering,
and editor interactions in this folder.

- Use @xyflow/react for authoring. Prefer its built-in interactions and CSS.
- Start with plain table cards. Feature-local CSS is fine. Skip custom Mantine
  theme integration, shared tokens, and shared component extraction for this prototype.
- Use stable table and field IDs. Keep authored positions separate from simulation state.
- Keep dashboard schemas, widget registration, shared stores, and backend APIs out of this milestone.
- Keep checks proportional. Exercise the route in the browser and run targeted
  checks for changed behavior. Avoid repo-wide formatting or unrelated lint cleanup.
- Report any existing lint rule that blocks the prototype, with the file and rule name.
- Pause after the first interactive React Flow canvas for visual review.
