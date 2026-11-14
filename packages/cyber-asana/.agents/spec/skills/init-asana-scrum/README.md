---
spec-type: reference
concept: [cyber-asana, skills, setup, scrum]
---

# init-asana-scrum — the scrum setup skill

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/init-asana-scrum/`, which
walks an agent through setting up scrum on Asana (K2, D5 of the [scrum design](../../scrum/README.md)).

## Subject

- **Artifact** — `skills/init-asana-scrum/SKILL.md`.
- **Trigger** — setting up scrum on Asana or re-running that setup. Its front block reads: *"Use
  this skill when setting up scrum on Asana — scope, sprint model, fields, backlog, current sprint,
  policy."*
- **What it covers** — design § 8.2 steps 1–6 and 8, for the `project`, `projects`, and `portfolio`
  scopes and the `sections`, `custom-field`, and `project` models: prerequisites through `init-asana`,
  `config scope add`, the sprint-model implementations through the `reference` skill of
  `cyber-agentkit`, a recommendation (`sections` for one project,
  `custom-field` for any wider scope), `config discover-fields`, creating the missing Sprint and
  Status fields and attaching them to each project (`custom-field create | attach`, each on the
  user's approval; never points fields), the backlog section and `sprint start`, the non-default
  policy keys written into `.agents/references/cyber-asana.scrum.md`, the capacity probe
  (`allocation list --assignee me`, reported and changing nothing), and verification with
  `report health`.
- **What it leaves out** — the `team` scope (U9). It says so rather than offering it.
  For the `project` model it asks for the backlog project and portfolio (and an optional template
  project), saves them on the scope, and offers `sprint start`.
- **Behavior it holds to** — idempotent (a re-run shows the setup and changes only what the user
  picks); nothing is created in Asana or written to the repo without the user's approval.

It is separate from `asana-scrum` (D5) so a once-only setup never takes routing budget from daily use.
`init-asana`'s last step offers it (K7).

**What it adopts.** The catalog contract in [skills](../README.md). It re-specifies none of it.
Whether an agent engages it and follows its steps is agent behavior, measured by ACED, not frozen here.
