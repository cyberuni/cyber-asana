---
"cyber-asana": minor
---

Add the `team` scrum scope and the team standup.

- Add `team members <gid>` and `team projects <gid>`, with the `asana_team_members` and `asana_team_projects` MCP tools. Both page like every other list.
- Add the `team` scope kind: `config scope add <name> --kind team --team <gid>` (and `team_gid` on `asana_scope_add`). `scrum scope resolve` returns the team's unarchived projects and its members as `people`, including members with no task yet. The built-in `sections` sprint model does not support a `team` scope and stops with `model-unsupported`.
- Add `report standup --team` (and `team: true` on `asana_report_standup`), which groups the standup by person for any scope. It replaces the `team-unsupported` exit, which no longer exists. `--team` cannot be combined with `--me` or `--member`.
- Let `init-asana-scrum` offer the `team` kind, and extend the `asana-scrum` standup route and the `cyber-asana.report.standup` layout to the grouped form.
