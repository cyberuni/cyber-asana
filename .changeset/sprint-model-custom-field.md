---
'cyber-asana': minor
---

Add the `custom-field` sprint model. Set `sprint_model: custom-field` on the policy or a scope and every `sprint` and `backlog` command works through a `Sprint` enum field instead of sections: a sprint is an option of the field, and the backlog is the incomplete tasks whose Sprint field is unset. It supports `project`, `projects`, and `portfolio` scopes, needs a premium workspace to list tasks, and ships as the `cyber-asana.sprint-model.custom-field` reference. New statuses: `sprint-field-missing` and `sprint-field-ambiguous` (exit `2`), and `premium-required` (exit `7`).
