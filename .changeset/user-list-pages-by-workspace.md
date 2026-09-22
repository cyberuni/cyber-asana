---
"cyber-asana": patch
---

`user list` and `asana_user_list` no longer fail with `400 The result is too large` on large workspaces. They now page through `GET /users?workspace=` (sorted by user ID), and so accept `--limit`, `--all`, and `--max-pages` (MCP: `limit`, `fetch_all`, `max_pages`) like other list commands.
