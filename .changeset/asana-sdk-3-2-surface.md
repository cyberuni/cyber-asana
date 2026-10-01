---
"cyber-asana": minor
---

Expose the API surface added in `asana` 3.2.0.

- New `ai-studio` commands and MCP tools for AI Studio usage: `ai-studio runs` / `asana_ai_studio_run_list` lists each AI Studio run with its model and credits used, oldest first (poll forward with `--start-at`), and `ai-studio seats` / `asana_ai_studio_seat_list` lists seat allocations (`--state active|revoked`). Both take `--division-gid`. Asana restricts these endpoints to service accounts in organizations licensed for AI Studio.
- `task list`, `project list`, and `portfolio list` (and `asana_task_list`, `asana_project_list`, `asana_portfolio_list`) accept a custom type filter (`--custom-type <gid>` / `custom_type`). An empty value selects items with no custom type.
