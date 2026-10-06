---
spec-type: reference
concept: [cyber-asana, skills, reporting]
---

# asana-sprint-report — the sprint-summary skill

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/asana-sprint-report/`,
which turns a project or sprint section into a completed-versus-incomplete summary for a retro or a
stakeholder.

## Subject

- **Artifact** — `skills/asana-sprint-report/SKILL.md`. No references directory.
- **Trigger** — the user asks for a sprint summary, retrospective data, or completion stats. Its
  front block reads: *"Use this skill when the user wants a sprint summary — completed vs
  incomplete tasks for retro or stakeholders."*
- **What it covers** — establishing the scope (which project, which section is the sprint, and the
  sprint start date), fetching the completed and incomplete lists, optionally narrowing both to one
  section, and writing a narrative summary **alongside** the raw counts rather than instead of them.
  When the project registers `story_points` or `task_points` fields, it totals the two separately;
  the line between them is drawn only in the `cyber-asana.task-conventions` reference.

**Its place in the catalog.** It is the longer-horizon reporting skill. Its distinguishing
instruction is that the report carries **both** numbers and narrative: a completion rate with no
account of what blocked the sprint is not a retro, and a story with no counts cannot be checked.

**What it adopts.** The catalog contract in [skills](../README.md).

**What decides its behavior lives elsewhere.** The task and section list calls and their filters are
[tasks](../../tasks/README.md) and [sections](../../sections/README.md); the output-format advice is
[axi](../../axi/README.md). Whether the resulting narrative is accurate and useful is a graded
judgment — ACED's.

**Sibling.** [asana-standup](../asana-standup/README.md) answers the same question over a day rather
than a sprint.
