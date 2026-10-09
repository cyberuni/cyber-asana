---
'cyber-asana': minor
---

Rate-limit every Asana request. A per-token limiter keeps the CLI, the MCP server and the library under Asana's limits, waits instead of failing, and retries a 429 after `Retry-After`. Set `ASANA_PLAN` to `free` (default) or `paid`, or `ASANA_RATE_LIMIT_PER_MINUTE` to set the budget yourself.
