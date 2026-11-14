---
spec-type: reference
concept: [cyber-asana, skills, reporting]
---

# asana-sprint-report — the sprint-report stub

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/asana-sprint-report/`.
Since U7 it is a **routing stub** (D7): its body tells the agent to load
[asana-scrum](../asana-scrum/README.md) and follow its review route (a sprint summary) or its retro
route (retro data), and not to run the old `section tasks` and `task list --completed-since` steps. It
stays for one minor release, then it is deleted, and so is this node.

## Subject

- **Artifact** — `skills/asana-sprint-report/SKILL.md`. No references directory, and no alpha marker.
- **Trigger** — unchanged in spirit, so users who call it by name still land somewhere. Its front
  block reads: *"Use this skill when the user wants a sprint summary or retro data from Asana — it now
  routes to the asana-scrum skill."*

**What it adopts.** The catalog contract in [skills](../README.md).

**Sibling.** [asana-standup](../asana-standup/README.md), which retired the same way in U6.
