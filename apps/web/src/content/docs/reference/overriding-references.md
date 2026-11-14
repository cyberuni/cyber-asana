---
title: Overriding references
description: Where cyber-asana's policy references live, which tier wins, and how a team overrides the cyber-asana.scrum policy for its repo.
---

How a team works is policy, and cyber-asana keeps policy in
[cyber-agentkit](https://github.com/cyber-uni/cyber-agentkit) references, not in code or config.
Two references carry keys the CLI and MCP read:

| Reference | What it sets |
| --- | --- |
| `cyber-asana.task-conventions` | How a task is shaped: `task_name_format`, `description_template`, `default_tags`, and the points rule. See [Task conventions](/cyber-asana/cli/repo-config/#task-conventions). |
| `cyber-asana.scrum` | How the team runs scrum: sprints, workflow states, blocked signals, carry-over, velocity, working time, and the ceremony procedures. |

cyber-asana ships a working default of each. You change it by writing your own copy in a higher
tier, holding only what differs. Policy holds no GIDs: projects, portfolios, teams, and fields stay
in [`.agents/cyber-asana.json`](/cyber-asana/cli/repo-config/).

## Tiers

Contributions compose bottom first. Frontmatter keys compose key by key, and the higher tier wins
each key. Body sections compose by heading, each file applying with its `merge` key: `patch` (the
default) replaces the sections it holds and keeps the rest.

| Tier | Where | Who | Typical override |
| --- | --- | --- | --- |
| managed | `references/` next to the harness's managed-policy files | the organization | locks that apply org-wide, such as `hours_per_point` or the definition of done. Nothing below overrides them. |
| repo | `.agents/references/` at the repo root | the team that owns the repo | the team's process: sprint length and anchor, workflow states, `carry_over`, ceremony procedures |
| project section | `.agents/references/<name>.md` in a sub-folder git tracks | one package's team | prose for that folder alone, delivered after the main document. Its frontmatter is **not** composed into the keys the CLI reads. |
| user | `~/.agents/references/` | one person | personal defaults that apply only where the repo sets nothing. The user tier sits below repo, so a person cannot override what the team set. |
| plugin | the `references/` cyber-asana ships | cyber-asana | every key and section, with working defaults |

To see what composed and from where, run
`npx cyber-agentkit reference load cyber-asana.scrum --trace`. Agents load references by name
with the `reference` skill of cyber-agentkit; never read the tier folders yourself.

## `cyber-asana.scrum` keys

| Key | Default | Teams usually override it? |
| --- | --- | --- |
| `sprint_model` | `sections` | Only to use a custom field (`custom-field`) or one project per sprint (`project`) |
| `sprint_length_days` | `14` | **Yes** |
| `sprint_anchor_date` | unset; setup asks | **Yes**: the first day of sprint 1, `YYYY-MM-DD` |
| `sprint_name_format` | `Sprint {n}` | Often; `{n}`, `{start}`, `{end}`, and `{year}` are filled in |
| `backlog_section` | `Backlog` | When the backlog section has another name |
| `state_carrier` | `none` | **Yes**, when workflow states live in a field (`field`) or in sections (`sections`) |
| `workflow_states` | `Backlog`, `Ready`, `In Progress`, `Review`, `Done` | **Yes**, to match the field's options or the section names. Set only the states that differ. |
| `blocked_signals` | `[dependency]` | Often, to add `tag:<name>` or `state:<state>` |
| `carry_over` | `move` | When unfinished work goes back to the backlog (`leave`) |
| `velocity_window` | `3` | Rarely |
| `hours_per_point` | `1` | Rarely; an organization may lock it in the managed tier |
| `working_hours_per_day` | `8` | When the team's day differs |
| `working_days` | `[mon, tue, wed, thu, fri]` | When the team's week differs |
| `standup_window` | `previous_working_day` | Per person, in the user tier; or `<n>d` for the last n days |

Every key is validated when it is read. A bad value fails with an error that names the key, so a
typo reports itself instead of silently doing nothing.

The body holds `## Definition of ready`, `## Definition of done`, `## Refinement`, `## Planning`,
`## Standup`, `## Review`, and `## Retro`. A team patches them one at a time. The rule for story
points versus task points lives only in `cyber-asana.task-conventions`.

## Example: a repo override

`.agents/references/cyber-asana.scrum.md` for a team on one-week sprints that tracks states in a
custom field and treats a `blocked` tag as blocked:

```md
---
sprint_length_days: 7
sprint_anchor_date: 2026-01-05
sprint_name_format: "{year}-W{n}"
state_carrier: field
workflow_states:
  in_progress: Doing
  review: In review
blocked_signals: [dependency, "tag:blocked"]
---

## Definition of done

A task is done when its change is released to production and its actual points are recorded.
```

It needs no `merge` key. Every key it leaves out keeps its default, and every section it leaves
out keeps the shipped text. Only `## Definition of done` is replaced.

## Sprint models

The plugin also ships `cyber-asana.sprint-model.interface` and its first implementation,
`cyber-asana.sprint-model.sections`. The interface lists what each sprint model must say (how to find
the current sprint, list its tasks, start, fill, and close it); `npx cyber-agentkit reference check`
keeps every implementation shaped like it. The `sprint` and `backlog` commands compute only the models
the CLI builds in. To use your own, such as `cyber-asana.sprint-model.tags` in `.agents/references/`,
implement the interface and point a scope's `sprint_model` at the key; the commands then stop with
`model-unsupported`, and an agent follows your reference with the primitive commands it lists.

## When two plugins ship the same name

If another installed plugin also ships `cyber-asana.scrum` or `cyber-asana.task-conventions`, the
name is ambiguous. The CLI and MCP do not guess: they stop with a `reference-ambiguous` error that
lists the options, and the CLI exits `8`. Pick one with the `reference` skill of cyber-agentkit,
which asks which to build on and whether for the repo or only you, or save the pick yourself:

```sh
npx cyber-agentkit reference customize cyber-asana.scrum --extends cyber-asana
```

Add `--scope user` to make the pick for yourself only.
