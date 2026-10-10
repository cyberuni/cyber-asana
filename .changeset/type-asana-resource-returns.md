---
"cyber-asana": minor
---

Type the library's Asana-returning functions and gateway interfaces (`getTask`, `listProjects`, `TaskGateway`, `ProjectGateway`, and more) against the real `Asana.*` shapes instead of `any`. `Task` also gains `custom_fields`, `num_subtasks`, and `start_at`.

Because Asana's `opt_fields` parameter can omit any field except `gid`, every resource's `name` and `resource_type` are now optional on the type, matching what the API actually returns rather than assuming a field is always present. TypeScript consumers accessing `.name` or `.resource_type` without a null check will need to add one.
