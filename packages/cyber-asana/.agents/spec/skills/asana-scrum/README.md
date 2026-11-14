---
spec-type: reference
concept: [cyber-asana, skills, scrum, reporting]
---

# asana-scrum — the scrum routing skill

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/asana-scrum/`, the entry
point for scrum work (design K1, D3 in [`docs/design/scrum-system.md`](../../../../../../docs/design/scrum-system.md)).

## Subject

- **Artifact** — `skills/asana-scrum/SKILL.md` and `references/standup.md`, `references/health.md`, and `references/workload.md`, plus the
  `/cyber-asana:standup` command in `commands/standup.md`.
- **Trigger** — the user asks for a standup, a sprint health check, the team's workload, the sprint's status, or sprint
  housekeeping. Its front block reads: *"Use this skill when the user wants scrum work from Asana — a
  standup, health check, workload, or sprint housekeeping."*
- **What it covers** — a routing table, one procedure file per route. The standup
  procedure: load `cyber-asana.scrum`, the scope's `cyber-asana.sprint-model.<key>`, and
  `cyber-asana.report.standup` through the `reference` skill of `cyber-agentkit`; run
  `cyber-asana report standup --json`; fill the report's layout without recounting; offer follow-ups.
  Sprint start, add, and close, and the current sprint and backlog, route straight to the `sprint` and
  `backlog` commands. The health route (`references/health.md`) loads `cyber-asana.report.health`,
  runs `cyber-asana report health --json`, fills its layout, and runs a fix command only on the
  user's yes. The workload route (`references/workload.md`) loads `cyber-asana.report.workload`, runs
  `cyber-asana report workload --json`, names each person whose capacity is unknown with its reason,
  notes out-of-office beside capacity without reducing it, and recomputes nothing. Review, retro, and
  velocity are marked not built yet.

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
release (D7); [asana-sprint-report](../asana-sprint-report/README.md) folds in with U7.
