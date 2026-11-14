---
"cyber-asana": minor
---

Add `cyber-asana report standup` and the `asana_report_standup` MCP tool: a member's standup computed by the CLI, with Done (a true completed filter over `standup_window`), Today (the current sprint), and Blocked (from `blocked_signals`, each with its blocker), and story and task points kept apart. It carries on without sprint filters when there is no current sprint. `--team` exits `2` with `team-unsupported` until the team scope is built.

- Add the `cyber-asana.report.interface` and `cyber-asana.report.standup` references, so a team can override the standup layout.
- Add the `asana-scrum` skill, which routes scrum work, and the `/cyber-asana:standup` command. The `asana` skill now sends standup and sprint requests to `asana-scrum`.
- Turn the `asana-standup` skill into a stub that routes to `asana-scrum`. It will be deleted in the next minor release, so call `asana-scrum` or `/cyber-asana:standup` instead.
