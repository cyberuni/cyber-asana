---
spec-type: reference
concept: [cyber-asana, skills, scrum, reporting]
---

# asana-scrum — the scrum routing skill

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/asana-scrum/`, the entry
point for scrum work (design K1, D3 in [`docs/design/scrum-system.md`](../../../../../../docs/design/scrum-system.md)).

## Subject

- **Artifact** — `skills/asana-scrum/SKILL.md` and `references/standup.md`, `health.md`, `workload.md`,
  `review.md`, `retro.md`, and `plan.md`, plus the `/cyber-asana:standup`, `/cyber-asana:sprint-plan`,
  `/cyber-asana:sprint-review`, and `/cyber-asana:retro` commands in `commands/`.
- **Trigger** — the user asks for a standup, planning, a review, a retro, health, workload, the dashboard, or sprint
  housekeeping. Its front block reads: *"Use this skill when the user wants scrum from Asana — standup,
  planning, review, retro, health, workload, or dashboard."*
- **What it covers** — a routing table, one procedure file per route. The standup procedure: load
  `cyber-asana.scrum`, the scope's `cyber-asana.sprint-model.<key>`, and `cyber-asana.report.standup`
  through the `reference` skill of `cyber-agentkit`; run `cyber-asana report standup --json`; fill the
  report's layout without recounting; offer follow-ups. The health route loads
  `cyber-asana.report.health`, runs `cyber-asana report health --json`, fills its layout, and runs a
  fix command only on the user's yes. The workload route loads `cyber-asana.report.workload`, runs
  `cyber-asana report workload --json`, names each person whose capacity is unknown with its reason,
  notes out-of-office beside capacity without reducing it, and recomputes nothing. The review loads
  `cyber-asana.report.sprint` and runs `report sprint`. The retro loads `cyber-asana.report.retro`,
  runs `report retro`, facilitates, files each agreed action as a task through the `asana` skill's
  create-task procedure, and offers `sprint close` at the end. The plan route runs `sprint plan --json`,
  presents the proposal from the JSON as given, totals every edit with `sprint plan --tasks` instead of
  adding by hand, and asks before each of `sprint start`, `sprint add`, and `sprint start --snapshot`.
  The dashboard route runs `report dashboard --json`, leads with `status_type`, and names every failed or
  unsupported report. Velocity runs `report velocity`
  directly. Sprint start, add, and close, and the current sprint and backlog, route to the `sprint`
  and `backlog` commands; the skill asks before `sprint start --snapshot` (a status update cannot be
  edited) and before `sprint close`.

**Principle P2.** The CLI computes; the skill narrates. The skill must not add up points or recount
tasks: it uses `count` and `points` from the report as given, with story and task points apart.

**Ambiguous references (D13).** The skill settles `reference-ambiguous` through the `reference`
skill: list the options, ask which to build on and whether for the repository or only the user, save
with `reference customize <name> --extends <pick>`.

**What it adopts.** The catalog contract in [skills](../README.md).

**What decides its behavior lives elsewhere.** The report's numbers are the
[scrum](../../scrum/README.md) node. Whether the narrative is a good standup is a graded judgment on
generated prose, ACED's, not this corpus'.

**Predecessors.** [asana-standup](../asana-standup/README.md) is a stub that routes here for one minor
release (D7); [asana-sprint-report](../asana-sprint-report/README.md) is the same stub since U7.
