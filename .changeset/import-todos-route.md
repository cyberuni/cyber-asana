---
"cyber-asana": minor
---

Fold the `create-tasks-from-code` skill into the `asana` router as the **Import TODOs** route, and add the `/cyber-asana:import-todos` command. The `create-tasks-from-code` skill is removed: ask the `asana` skill to turn TODO/FIXME comments into tasks, or run `/cyber-asana:import-todos`. The procedure lives in `skills/asana/references/import-todos.md` and now creates each task through `references/create-task.md`, so imported tasks follow the repo's task conventions.
