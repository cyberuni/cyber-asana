---
'cyber-asana': patch
---

Fix `task dependency add|remove` and `task dependent add|remove` (and the matching MCP tools): send dependency and dependent GIDs as plain strings, which Asana requires, instead of `{ gid }` objects that it rejects with "Not a valid GID type: object".
