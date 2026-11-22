# S5 — Simplification (functional changes)

**Sources:**

- [plugin-capabilities.md](../02-research/plugin-capabilities.md) §5 (keep and delete) and §7 (Option A), both subject to their S0 ADRs.
- The gap register in [01-current-state.md](../01-current-state.md) §2, and the answers in 01 §3.1 and [02-research/README.md](../02-research/README.md).

| Step  | Change                                                                                                                                                 | Source                                  | ECC                                                                               | Closes              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------- | ------------------- |
| S5.1  | Delete the unused plugin kinds (`ActionPlugin`, `ContextPanelPlugin`, the empty registries) and the test-only schema (`CollectionDefinition`, …)       | plugin-capabilities §5 "Delete"         | `/ecc:refactor-clean`                                                             | G-031 (partly)      |
| S5.2  | Delete `subscribe`, `watchRecords.ts` and `recordKeys.ts`, with their suite cases                                                                      | §5; 01 §3.1 Q2 (no live interaction)    | `/ecc:refactor-clean`                                                             | G-024               |
| S5.3  | Remove `react-force-graph-2d`                                                                                                                          | G-029                                   | `/ecc:refactor-clean`                                                             | G-029               |
| S5.4  | "Add to build", per the S0 decision                                                                                                                    | §4 alternatives                         | `/ecc:orch-change-feature`                                                        | G-030               |
| S5.5  | One `definePlugin` per plugin folder, replacing `OptionalPlugin`                                                                                       | §7 point 1                              | `/ecc:orch-refine-code`                                                           | G-002               |
| S5.6  | `RecordsHost` scoped to the app instance, via `createApp(config)`. No import side effects; `placeSetting` merged in. The user still picks in the UI    | §7 point 2, adjusted by README answer 1 | `/ecc:orch-refine-code`                                                           | G-010, G-011        |
| S5.7  | Auth as part of the record provider, using Convex Auth. Owner scoping on the server. The conformance suite gains `unauthenticated` and per-owner cases | §7 point 3, §5 "Keep"; README answer 2  | `/ecc:orch-change-feature`, `ecc:security-review`, agent `convex:convex-reviewer` | G-004               |
| S5.8  | The draft key includes the user id. Connections and vault follow the S0 answer                                                                         | README answer 4; S0                     | `/ecc:orch-change-feature`                                                        | G-007               |
| S5.9  | Document and harden the browser credential model, including relay scrubbing                                                                            | 01 §3.1 Q3; G-005, G-027                | `ecc:security-review`                                                             | G-005, G-027        |
| S5.10 | `/debug` and both chart widgets, per S0                                                                                                                | G-022, G-028                            | `/ecc:orch-change-feature`                                                        | G-022, G-028        |
| S5.11 | Small cleanups: legacy migration, the duplicate `isLoopback`, the name clash                                                                           | G-017, G-014, G-015                     | agent `ecc:code-simplifier`                                                       | G-014, G-015, G-017 |

**Deferred, per plugin-capabilities §6:**

- G-023, structured provider config: until a REST or Supabase backend.
- G-006, search as a capability: until a second search implementation exists.
