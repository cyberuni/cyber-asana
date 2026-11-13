---
"cyber-asana": minor
---

`--completed-since` now lists only tasks completed on or after the date. It used to pass Asana's `completed_since` through, which also returns every open task, while its help text claimed otherwise. The filter is applied on the client, so a page can hold fewer tasks than `--limit`. Asana's own behavior stays reachable as `--incomplete-or-completed-since`. `--completed-since now` is now a usage error (exit 2) that points at `--incomplete`, and `--completed-since` with `--incomplete` is a conflict (exit 2).

The MCP tools `asana_task_list` and `asana_task_my_tasks` gain `incomplete_or_completed_since`, and their `completed_since` keeps only completed tasks. In the library, `completedSince` on `listTasks`, `listTasksForSection`, `getMyTasks`, and `listSubtasks` is the true filter; pass `incompleteOrCompletedSince` (for example `"now"`) for Asana's own semantics.
