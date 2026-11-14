---
"cyber-asana": minor
---

Add `cyber-asana report workload` and the `asana_report_workload` MCP tool: per person, the story points, task points, and effort hours (both kinds times `hours_per_point`, with the parts shown) of their incomplete assigned tasks against the capacity Asana Allocations give for the sprint's dates, with utilization, over and under flags, and a team total. `--from` and `--to` replace the sprint with a date window. Capacity that cannot be read is named per person (`plan` for a 402, `no-allocation` otherwise) and the load still shows. Out-of-office entries appear as a note beside capacity and are never subtracted. A half-given or backwards window fails with `window-invalid` and exits `2`.

- Add the `cyber-asana.report.workload` reference; its frontmatter sets `over_allocation_pct` and `under_allocation_pct`, so a team can override them.
