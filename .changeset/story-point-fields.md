---
"cyber-asana": minor
---

Estimate story points without hard-coding a field GID. A project entry in `.agents/cyber-asana.json` can now record custom fields by role (`fields.story_points: { gid, name }`):

- `cyber-asana config discover-fields [project]` finds the project's story point field by name ("Story Points", "Task Points", "Points", "pts", "SP" on a number or dropdown field) and saves it. When several fields match, it lists them and saves none.
- `cyber-asana config set-field <role> <field-gid>` and `config unset-field <role>` register or clear one by hand.

The `cyber-asana.task-conventions` reference gains a **Story points** section: when a task's project has such a field, estimate or measure it with 1 point as the effort a senior staff engineer who knows the stack and the domain needs to fix a one-line bug, about one hour.
