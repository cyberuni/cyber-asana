---
"cyber-asana": minor
---

Cover the remaining task API parameters. `task create`, `task update`, and `task subtask create` (and their MCP tools) take `approval_status`, `assignee_section`, `custom_type_status_option`, `html_custom_fields`, `liked`, and `external` (OAuth only), and subtask create also takes `custom_type`, projects, and tags. `task list` can list by section, by assignee with a workspace, and by `modified_since`, with a local check on the filter combination. `task dependency list` and `task dependent list` page with `limit` and `offset`, and `task search` takes `limit`. `assigned_by`, `completed_by`, and `assignee_status` stay unsent: Asana marks the first two read-only and deprecates the third.
