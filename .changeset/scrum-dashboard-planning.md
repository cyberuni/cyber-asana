---
"cyber-asana": minor
---

Add `cyber-asana report dashboard`, with the `asana_report_dashboard` MCP tool. It runs the reports the new `cyber-asana.dashboard` reference lists (default `sprint`, `health`, `workload`, and `velocity`), in order, into one text, `--json`, or `--toon` output, and grades a `status_type` from the health findings with `status_rules`. A report that fails is recorded with its `error.code` and the rest still run. A listed report the CLI does not compute, such as one your repo adds under `cyber-asana.report`, is named as unsupported instead of dropped.

- Add `cyber-asana sprint plan` and the `asana_sprint_plan` MCP tool. It computes the planning totals: the mean velocity, the Allocations capacity, the backlog with running totals, the backlog top that fits both, and with `--tasks` the totals of the tasks you picked against each limit. It writes nothing.
- Add the plan route to the `asana-scrum` skill and the `/cyber-asana:sprint-plan` command. They propose a commitment, let you edit it, and ask before `sprint start`, `sprint add`, and `sprint start --snapshot`.
- Add the dashboard route to the `asana-scrum` skill.
- Add the `cyber-asana.dashboard` reference, so a team can override the reports, forms, status rules, and the status update and page templates.
