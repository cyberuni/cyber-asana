---
'cyber-asana': minor
---

Add `task duplicate <task-gid> --name <name>` and the `asana_task_duplicate` MCP tool. Asana builds the copy asynchronously, so both return a job; read it with `job get` / `asana_job_get`.
