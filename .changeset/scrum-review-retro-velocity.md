---
"cyber-asana": minor
---

Add `cyber-asana report sprint`, `report retro`, and `report velocity`, with the `asana_report_sprint`, `asana_report_retro`, and `asana_report_velocity` MCP tools. The review compares what a sprint committed with what it completed, added, and removed, with completion rates, carry-over candidates, a daily burndown, and the demo list. The retro adds blocked time (best effort, from task history), cycle time, and estimate against actual. Velocity gives the points per closed sprint and the mean. Story and task points stay apart.

- Add `sprint start --snapshot` (and `snapshot` on `asana_sprint_start`), which posts the sprint's commitment as a status update on each project once and does nothing where one exists. The reports read it back; without it they rebuild the commitment from task history and cannot name removed tasks.
- Add the `cyber-asana.report.sprint`, `.retro`, and `.velocity` references, so a team can override each layout.
- Add the review and retro routes to the `asana-scrum` skill, with the `/cyber-asana:sprint-review` and `/cyber-asana:retro` commands. The retro files agreed actions as tasks and offers `sprint close`.
- Turn the `asana-sprint-report` skill into a stub that routes to `asana-scrum`. It will be deleted in the next minor release, so call `asana-scrum`, `/cyber-asana:sprint-review`, or `/cyber-asana:retro` instead.
