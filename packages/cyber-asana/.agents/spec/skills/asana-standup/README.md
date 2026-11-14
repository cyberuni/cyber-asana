---
spec-type: reference
concept: [cyber-asana, skills, reporting]
---

# asana-standup — the standup stub

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/asana-standup/`. Since U6
it is a **routing stub** (D7): its body tells the agent to load [asana-scrum](../asana-scrum/README.md)
and follow its standup route, and not to run the old `task list --completed-since` steps. It stays for
one minor release, then it is deleted, and so is this node.

## Subject

- **Artifact** — `skills/asana-standup/SKILL.md`. No references directory.
- **Trigger** — unchanged, so users who call it by name still land somewhere. Its front block reads:
  *"Use this skill when the user wants a standup update from Asana — it now routes to the asana-scrum
  skill."*

**What it adopts.** The catalog contract in [skills](../README.md).

**Sibling.** [asana-sprint-report](../asana-sprint-report/README.md), which retires the same way in U7.
