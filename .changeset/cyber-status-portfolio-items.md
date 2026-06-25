---
"cyber-asana": minor
---

feat: add status updates and portfolio items via REST

Adds an `asana_status_*` toolset (list, get, create, delete) for status updates
on projects, portfolios, and goals, plus `asana_portfolio_item_list` for listing
the items in a portfolio. Both are also available as `status` and `portfolio
items` CLI commands. These close the official MCP gaps for
`get_status_overview`, `create_project_status_update`, and
`get_items_for_portfolio`.
