---
"cyber-asana": minor
---

`custom-field create` / `asana_custom_field_create` and `custom-field update` / `asana_custom_field_update` now take `format`, `currency_code`, `custom_label` and `custom_label_position` (create only; update already had them), plus `has_notifications_enabled`, `id_prefix` and `input_restrictions` on both; `custom-field enum-option add` / `asana_custom_field_enum_option_create` take `enabled`. Formats, label positions and input restriction kinds are checked against Asana's lists before any request is sent.
