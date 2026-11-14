---
'cyber-asana': minor
---

Add `custom-field create`, `custom-field enum-option add | move | update`, and `custom-field attach | detach` to the CLI, with matching `asana_custom_field_create`, `asana_custom_field_enum_option_create`, `asana_custom_field_enum_option_insert`, `asana_custom_field_enum_option_update`, `asana_custom_field_attach`, and `asana_custom_field_detach` MCP tools. `attach` and `detach` are idempotent: they report `already_attached` or `already_detached` and write nothing when there is nothing to change.
