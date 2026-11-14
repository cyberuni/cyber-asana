---
"cyber-asana": minor
---

Validate `status_type` in `status create` and `asana_status_create` against the parent type, failing with the coded `status-type-invalid` (exit `2`) and the accepted values. Add `--parent-type` and `parent_type` to skip the parent lookup.
