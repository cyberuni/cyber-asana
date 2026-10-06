---
spec-type: reference
concept: [cyber-asana, skills, reporting]
---

# asana-standup — the daily-update skill

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/asana-standup/`, which
assembles a standup update out of a project's recent task activity.

## Subject

- **Artifact** — `skills/asana-standup/SKILL.md`. No references directory.
- **Trigger** — the user asks for their standup, daily update, or "what did I do / what am I doing".
  Its front block reads: *"Use this skill when the user wants a standup update from Asana — done,
  today, and blockers."*
- **What it covers** — two list calls (tasks completed since a cutoff, defaulting to two days ago;
  tasks still incomplete), then a **selection** step: pick what is worth mentioning under *Done*,
  *Today*, and *Up next*, and drop the rest. Points, when asked for, show story points and task
  points apart, deferring their definition to the `cyber-asana.task-conventions` reference.

**Its place in the catalog.** It is one of the two reporting skills, and the shorter-horizon one.
The load-bearing part is not the fetching — two list calls with flags — but the discarding: a
standup that lists every task is not a standup. The skill names the fetch precisely and leaves the
selection to judgment, which is the shape most skills in this catalog take.

**What it adopts.** The catalog contract in [skills](../README.md).

**What decides its behavior lives elsewhere.** The list calls, their filters, and their pagination
are [tasks](../../tasks/README.md); the `--toon` / `--json` choice it recommends is the shared
output contract in [axi](../../axi/README.md). Whether the selection is a good standup is a graded
judgment on generated prose — ACED's, not this corpus'.

**Sibling.** [asana-sprint-report](../asana-sprint-report/README.md) answers the same question over a
sprint rather than a day.
