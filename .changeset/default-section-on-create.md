---
"cyber-asana": minor
---

`task create` and `asana_task_create` now apply `defaults.section` themselves. When a task is created in the repo config's default project and `defaults.section` is set, it is created directly in that section, in the same API call, so there is no separate placement step to forget or to fail on its own. A task created only in other projects is never placed, because the section belongs to the default project. Opt out per call with `--no-default-section` (CLI) or `default_section: false` (MCP).
