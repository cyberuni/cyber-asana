---
'cyber-asana': minor
---

Add `portfolio item add | remove` and the `asana_portfolio_item_add` and `asana_portfolio_item_remove` MCP tools, which put a project or nested portfolio in a portfolio and take it out. Both are idempotent: a repeat reports `already_added` or `already_removed` and exits `0`.
