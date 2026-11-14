---
'cyber-asana': minor
---

Add `project duplicate` and the `asana_project_duplicate` MCP tool. Asana builds a copy as a job, so both wait for it (bounded, `--timeout`) and return the new project GID; `--no-wait` returns the job, and a failed job is an error.
