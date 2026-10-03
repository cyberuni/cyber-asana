---
"cyber-asana": minor
---

`task get --with-stories [--since <iso-time>]` returns the task and its stories (comments and change history) in one output as a `stories` field, paging through every story. `--since` filters stories by `created_at` on the client and implies `--with-stories`. The MCP tool `asana_task_get` takes the same options as `with_stories` and `since`.
