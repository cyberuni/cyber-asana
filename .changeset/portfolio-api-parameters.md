---
"cyber-asana": minor
---

`portfolio create` / `asana_portfolio_create` and `portfolio update` / `asana_portfolio_update` now take the rest of Asana's portfolio parameters: `archived`, `color`, `custom_type`, `resource_subtype`, `default_access_level`, `public`, `due_on` and `start_on`, and on update `custom_fields` and `html_custom_fields`. Colors, subtypes and access levels are checked against Asana's lists, and dates must be `YYYY-MM-DD`, with `start_on` needing `due_on` and not falling after it, all before any request is sent.
