---
"cyber-asana": minor
---

`time-entry create` and `update` take `--assignee` and `--attributable-to`, `time-entry list` filters by `--assignee` and `--attributable-to` (`--user` stays as an alias, and both now send Asana's `assignee` rather than its deprecated `user`), and `allocation update` can move an allocation to another person or project with `--assignee` and `--parent`. The MCP tools take `assignee_gid`, `attributable_to_gid` and `parent_gid`. Time entries also take `--billable-status`, `--category` (at most one) and `--description`, and `time-entry list` takes `--timesheet-approval-status` (MCP: `billable_status`, `category_gids`, `description`, `timesheet_approval_status_gid`); these four need Asana's Timesheets and Budgets add-on and answer 402 without it.
