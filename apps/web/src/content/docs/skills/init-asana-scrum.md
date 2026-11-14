---
title: init-asana-scrum
description: The scrum setup skill, which adds a scope, picks the sprint model, creates and attaches the Sprint and Status fields, creates the backlog and current sprint, and writes the sprint policy.
---

The `init-asana-scrum` skill sets up scrum on Asana for a repo or team. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/init-asana-scrum/SKILL.md).

## When it triggers

Use it when setting up scrum on Asana, or when re-running that setup to review or change it.

## What it covers

It covers the `project`, `projects`, `portfolio`, and `team` scopes, the `sections`, `custom-field`, and `project` sprint models, and creating the Sprint and Status fields and the sprint portfolio.

## How to use it

Ask your agent to set up scrum. The skill asks before it creates anything in Asana or writes anything to the repo, and it is safe to re-run: it shows the current setup and changes only what you pick.

1. **Prerequisites.** It checks the token and workspace, and runs [`init-asana`](/cyber-asana/skills/init-asana/) when they are missing.
2. **Scope.** It shows the existing scopes, finds projects with `project search` (or a team with `team list`), and adds a scope with `config scope add`. See [`config-asana`](/cyber-asana/skills/config-asana/).
3. **Sprint model.** It lists the `cyber-asana.sprint-model` implementations, recommends `sections` for a single project and `custom-field` for any wider scope, and shows the requirements of the one you pick. `custom-field` needs a premium workspace to list tasks. `project` makes one project per sprint inside a portfolio: it asks for the backlog project, the portfolio (and creates it on your yes), and an optional template project to duplicate for each sprint.
4. **Fields.** It runs `config discover-fields` and reports the `story_points`, `task_points`, `sprint`, and `status` fields it found. With your approval it creates the missing Sprint field (for `custom-field`) and Status field (for `state_carrier: field`) with [`custom-field create`](/cyber-asana/cli/custom-fields/) and attaches them to each project with `custom-field attach`. It never creates points fields; it says how to add those by hand.
5. **Structure.** It offers to create the backlog section (`sections` only) and, with `sprint start`, the current sprint's section or Sprint option.
6. **Policy.** It walks through the sprint length, anchor date, name format, workflow states, carry-over, and definition of done, then writes only the keys that differ from the default into `.agents/references/cyber-asana.scrum.md`.
7. **Capacity.** Probes Allocations with `allocation list --assignee me` and reports one of three results: available, plan does not include it (a 402), or no allocations yet. It explains that workload shows load without capacity until allocations exist.
8. **Verify.** It runs [`report health`](/cyber-asana/cli/reports/#report-health), which also catches a missing current-sprint section, then points to the next steps.

`init-asana` ends by offering this skill. The policy keys are described in [overriding the scrum policy](/cyber-asana/reference/overriding-references/).
