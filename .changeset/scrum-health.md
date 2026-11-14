---
"cyber-asana": minor
---

Add `cyber-asana report health` and the `asana_report_health` MCP tool: one result per enabled check (H1–H11) over the sprint's tasks — no estimate, a parent carrying points, unassigned, overdue, stale in-progress work, a person over the work-in-progress limit, blocked, no sprint section, a closed sprint still holding incomplete tasks, and a task in two sprints. Each finding carries a level (`error` or `warning`), the task, and a fix command. H8 (over capacity) shows as skipped until allocations are wired. With no workflow state tracked, in progress falls back to incomplete and assigned, and the report says so. A sprint with no section is finding H9, and without H9 enabled it fails with `sprint-none`.

- Add the `cyber-asana.report.health` reference; its frontmatter sets `checks`, `stale_days`, `wip_limit`, and `overdue_grace_days`, so a team can override them.
- The `asana-scrum` skill gains a health route, and `init-asana-scrum` now verifies with `report health`.
