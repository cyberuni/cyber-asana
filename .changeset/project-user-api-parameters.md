---
"cyber-asana": minor
---

Cover the remaining project, membership, and user API parameters. `project create` and `project update` (and their MCP tools) take `custom_fields`, `html_custom_fields`, `custom_type`, `resource_subtype`, `icon`, `minimum_access_level_for_customization`, and `minimum_access_level_for_sharing`, and `project create` also takes `followers` (Asana accepts them on create only). `project duplicate` takes `schedule_dates` through `--schedule-start-on` or `--schedule-due-on` and `--skip-weekends`, checked before any request. `project search` takes `limit`, `task project list` takes `include_inherited_projects`, `user list` takes `team`, and `user get` and `user me` take an explicit `workspace`. `createMembership` `role` stays unsent because Asana deprecated it for `access_level`, and `getProjectTemplates` `team` stays unsent because a team already routes to the team templates list.
