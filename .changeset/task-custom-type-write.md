---
'cyber-asana': minor
---

Add `--custom-type <gid>` to `task create` and `task update`, and `custom_type` to `asana_task_create` and `asana_task_update`, so a task can be given a custom type such as Epic. The GID goes in the `data` body of the existing create and update calls. Asana's docs do not say `custom_type` is writable, and it is unverified against a live workspace.
