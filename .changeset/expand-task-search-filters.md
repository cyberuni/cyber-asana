---
"asana-agent": minor
---

Add full filter support to `task search`: completion status, subtask, attachment, blocking/blocked, assignee, project, section, tag, team, resource subtype, sort field, and sort direction. Filters are available on both the CLI (`cyber-asana task search`) and the `asana_task_search` MCP tool. The text argument is now optional — filters can be used without a text query.
