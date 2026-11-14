---
'cyber-asana': minor
---

Add `--custom-field-filter <gid>.<operator>=<value>`, `--all`, and `--max-pages` to `task search`, and `custom_field_filters`, `fetch_all`, and `max_pages` to `asana_task_search`. Custom field filters match on `value`, `is_set`, `less_than`, `greater_than`, `before`, or `after`. `--all` pages past the 100-result search cap by sorting on `created_at`.
