---
name: init-asana-scrum
description: Use this skill when setting up scrum on Asana — scope, sprint model, fields, backlog, current sprint, policy.
---

# Init Asana Scrum

## When to use

When the user wants to set up scrum for a repo or team on Asana: choose the projects a team works in, the way a sprint is stored, the fields it reads, the backlog and current sprint, and the sprint policy. Also when they re-run it to review or change that setup.

This is v1. It covers the `project` and `projects` scopes and the `sections` sprint model. Portfolio and team scopes, the `custom-field` and `project` models, and creating fields come in later units; say so when the user asks for one.

## Rules

- **Idempotent.** Re-running shows the current setup and changes only what the user picks. Start every run by reading what exists, and report each step as `done`, `missing`, or `changed`.
- **Ask before writing.** Create nothing in Asana and write nothing to the repo until the user approves that exact change. Show the command or the file first.
- **CLI form.** Use the invocation `init-asana` settled. Every `cyber-asana` below means that form, pinned as `init-asana` says.
- **Commit** the repo files this skill writes (`.agents/cyber-asana.json`, `.agents/references/cyber-asana.scrum.md`) only when the user asks.

## Steps

### 1. Prerequisites

Run `cyber-asana workspace list --toon`. If it fails because of the token or workspace, run the `init-asana` skill and stop; resume here afterwards.

### 2. Scope

Show `cyber-asana config scope list`. If a scope exists, ask whether to keep it or add another.

To add one, ask the kind. Offer only `project` (one project) and `projects` (several; a task in two of them counts once). For `portfolio` and `team`, say they are not set up by this skill yet and stop short of them.

Find the projects with `cyber-asana project search <keyword>` (or the registry through `cyber-asana config list`), confirm the picks, then, on approval:

```bash
cyber-asana config scope add <name> --kind project --project <gid-or-alias> --default
cyber-asana config scope add <name> --kind projects --project <gid>,<gid>
cyber-asana scrum scope resolve --scope <name>
```

Show what `scrum scope resolve` reports.

### 3. Sprint model

Load the implementations of the `cyber-asana.sprint-model` interface with the `reference` skill of `cyber-agentkit`, and list them. v1 builds only `sections`: a sprint is a section named by `sprint_name_format` in each project, and it works on a free workspace. The `custom-field` model (needed for portfolio and team scopes) and the `project` model are later units; a custom model a repo wrote itself is read by agents but not computed by the CLI (`model-unsupported`).

Load `cyber-asana.sprint-model.sections` and show its `## Requirements`. `sections` cannot also use sections as workflow states, so the policy's `state_carrier` must stay `none` or `field`.

### 4. Fields

For each project in the scope run `cyber-asana config discover-fields <project>` and show the roles it found: `story_points`, `task_points`, `sprint`, `status`. This skill does not create fields. For a missing role, report it and tell the user how to add it by hand: create the custom field in Asana (a number for points, an enum for `sprint` and `status`), add it to the project, then run `discover-fields` again. The `sections` model needs no `sprint` field; `status` matters only with `state_carrier: field`.

### 5. Structure

Check each project: `cyber-asana section list --project-gid <gid>`.

- **Backlog.** If the policy's `backlog_section` (default `Backlog`) is missing, offer `cyber-asana section create "Backlog" --project-gid <gid>`.
- **Current sprint.** Needs the policy's `sprint_anchor_date` (step 6), so do step 6 first if it is unset. Then show `cyber-asana sprint current --scope <name>`. If it stops with `sprint-none`, offer `cyber-asana sprint start --scope <name>`, which creates the sprint's section where missing and changes nothing when it exists.

### 6. Policy

Load `cyber-asana.scrum` with the `reference` skill and show its current values. Walk through only: `sprint_length_days`, `sprint_anchor_date` (required; the first day of sprint 1, `YYYY-MM-DD`), `sprint_name_format`, `backlog_section`, `workflow_states`, `carry_over`, and the definition of done. Offer the default for each.

Write **only the keys that differ from the default** into `.agents/references/cyber-asana.scrum.md`, through the `reference` skill's Update mode (or Create when the file does not exist yet). Frontmatter keys only, no `merge` key. Never put GIDs in it: projects and fields belong in `.agents/cyber-asana.json`. Show the file and path, write on approval, then confirm `load cyber-asana.scrum --trace` reports it `used`. If the name is ambiguous (two plugins ship it), settle it through the `reference` skill's Customize mode, as the `cyber-asana` CLI stops with `reference-ambiguous` (exit 8) until a pick is saved.

If the anchor date is the only difference, that is the only key written.

### 7. Capacity

Capacity comes only from Asana Allocations (there is none in config). Probe it:

```bash
cyber-asana allocation list --assignee me --workspace <gid>
```

Report one of three results, and change nothing:

- **Available**: the list returns allocations. `report workload` and health check H8 will use them.
- **Plan does not include it**: the command fails with a 402 (exit 7). Say the workspace plan has no resource management, so `report workload` shows each person's load without capacity, and H8 is skipped with that reason.
- **No allocations yet**: the list is empty (`0 allocations found`). Say workload shows load without capacity until allocations exist, and that `cyber-asana allocation create` records one on the user's yes.

Explain that capacity is never taken from config or from out-of-office entries, which workload only notes beside it.

### 8. Verify

```bash
cyber-asana report health --scope <name>
```

Show the findings and the next steps it prints. This one command covers the structure: a missing current-sprint section is finding H9, with `sprint start` as its fix. Exit 2 means a step above is unfinished; read `error.code`: `policy-incomplete` (no `sprint_anchor_date`: step 6) or `sprint-none` (today is before the anchor date, so no sprint has begun; wait or move the anchor). Warnings on a brand-new sprint (no estimates yet, unassigned tasks) are not setup failures, and H8 is skipped, with its reason, when step 7 found no usable capacity; say so.

Finish with a summary of each step (`done`, `missing`, `changed`) and the next steps: `cyber-asana sprint add <task-gid>... --sprint current` to commit work, `cyber-asana sprint tasks`, `cyber-asana report health` as the sprint runs, and `cyber-asana sprint close` at the end of the sprint.
