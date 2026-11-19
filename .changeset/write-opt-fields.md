---
"cyber-asana": minor
---

The write commands and tools now accept `--opt-fields` / `opt_fields`, so a caller can choose which fields come back from a create or update (tasks, subtasks, projects, goals, custom fields, tables, records, stories, and more). Commands that discard the API response (follower add/remove, `custom-field attach`) or that poll a job and return another resource (`project duplicate`, `project-template instantiate`, `task-template instantiate`) do not take it. `custom-field enum-option move` prints its own acknowledgement and does not take it either.
