---
"cyber-asana": minor
---

Add a workload route to the `asana-scrum` skill: it runs `cyber-asana report workload`, names every person whose capacity is unknown and why, and notes out-of-office entries beside capacity without reducing it. `init-asana-scrum` step 7 now probes Allocations with `allocation list --assignee me` and reports whether they are available, not included in the plan, or not set up yet.
