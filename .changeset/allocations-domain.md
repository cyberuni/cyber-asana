---
"cyber-asana": minor
---

Add the `allocation` command (`list`, `get`, `create`, `update`, `delete`) and the `asana_allocation_*` MCP tools, wrapping Asana's resource-management `AllocationsApi`. `list` filters by `--parent` (a project), `--assignee`, and `--workspace`, and pages like every other list. A workspace whose plan has no resource management answers 402, which exits `7` as other plan limits do. Allocations are the only source of team capacity for the scrum workload report.
