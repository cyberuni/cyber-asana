---
"asana-agent": minor
---

Add human-readable CLI output by default; pass `--json` to get raw API JSON.

Add `ASANA_WORKSPACE` env var so the workspace GID can be set once instead of passing `--workspace` on every command.

Add `--token` global option to override the `ASANA_TOKEN` env var per invocation.

Fix `project create` command which was sending the workspace GID in the wrong format and always returned a Bad Request error.
