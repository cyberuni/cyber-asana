---
title: init-asana-scrum
description: The scrum setup skill, which adds a scope, picks the sprint model, checks fields, creates the backlog and current sprint, and writes the sprint policy.
---

The `init-asana-scrum` skill sets up scrum on Asana for a repo or team. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/init-asana-scrum/SKILL.md).

## When it triggers

Use it when setting up scrum on Asana, or when re-running that setup to review or change it.

## What it covers

This is the first version. It covers the `project` and `projects` scopes and the `sections` sprint model. For a portfolio or team scope, the `custom-field` or `project` model, creating fields, the capacity probe, or `report health`, it names the later release that adds it.

## How to use it

Ask your agent to set up scrum. The skill asks before it creates anything in Asana or writes anything to the repo, and it is safe to re-run: it shows the current setup and changes only what you pick.

1. **Prerequisites.** It checks the token and workspace, and runs [`init-asana`](/cyber-asana/skills/init-asana/) when they are missing.
2. **Scope.** It shows the existing scopes, finds projects with `project search`, and adds a scope with `config scope add`. See [`config-asana`](/cyber-asana/skills/config-asana/).
3. **Sprint model.** It lists the `cyber-asana.sprint-model` implementations and shows the requirements of `sections`.
4. **Fields.** It runs `config discover-fields` and reports the `story_points`, `task_points`, `sprint`, and `status` fields it found. It does not create fields: for a missing one it says how to add it in Asana by hand.
5. **Structure.** It offers to create the backlog section and, with `sprint start`, the current sprint's section.
6. **Policy.** It walks through the sprint length, anchor date, name format, workflow states, carry-over, and definition of done, then writes only the keys that differ from the default into `.agents/references/cyber-asana.scrum.md`.
7. **Capacity.** Skipped for now; capacity probing arrives with the workload report.
8. **Verify.** It runs `sprint current` and `backlog list`, then points to the next steps.

`init-asana` ends by offering this skill. The policy keys are described in [overriding the scrum policy](/cyber-asana/reference/overriding-references/).
