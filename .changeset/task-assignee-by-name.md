---
"cyber-asana": minor
---

`--assignee` on `task create`, `task update`, and `task subtask create` — and a new `assignee` parameter on the matching MCP tools — now accepts an alias, email, or name registered with `config add-user`, in addition to a user GID or `me`. It resolves from the repo config with no API call and errors only when the value is unregistered or matches more than one user. `--assignee-gid` still takes a GID as-is.
