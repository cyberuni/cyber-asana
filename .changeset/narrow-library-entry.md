---
'cyber-asana': minor
---

Narrow the library entry to its intended public surface. Each domain now exports its use cases, its standalone functions, and its gateway types; `events`, `memberships`, `rules`, `status`, and `task-templates` join the other domains (`getEvents`, `listMemberships`, `triggerRule`, `listStatuses`, `listTaskTemplates`, and the rest).

Breaking for library consumers: the Asana SDK gateway adapters (`createAsana*Gateway`), the CLI/MCP wiring (`createRuntimeContext`, `registerCliCommands`, `registerMcpTools`), the repo and global config helpers, and `setAmbientToken`/`getTokenOverride` are no longer exported. Use the standalone functions, or pass your own gateway to `create*Api`.
