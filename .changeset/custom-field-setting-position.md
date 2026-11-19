---
"cyber-asana": minor
---

`custom-field attach` and `custom-field attach-portfolio` take `--insert-before` or `--insert-after` with a custom field setting GID to place the field among the container's fields, instead of always last. MCP `asana_custom_field_attach` and `asana_custom_field_attach_portfolio` take `insert_before` and `insert_after`. Giving both fails before any request.
