# Scrum System on Asana: Design

**Date:** 2026-11-05
**Status:** Council decisions recorded (D1–D14). Only Q6 stays open, for the functional spec (§ 11). This document is the deliverable of a design-only session; it builds nothing. Each unit in § 9 is built later in its own session, starting from this document.

## 1. Goal

Turn the two reporting skills `asana-standup` and `asana-sprint-report` into a complete scrum system for the cyber-asana plugin:

- sprints, a backlog, and the four ceremonies (planning, daily standup, review, retro), plus backlog refinement;
- one system that works many ways: each team's process lives in overridable cyber-agentkit references, not in code or in a skill's text;
- scopes wider than one project: several projects, a portfolio, a team;
- reports: standup, sprint report, health check, workload, velocity, and a dashboard;
- a setup skill that configures all of it for a repo or a team.

### 1.1 Council decisions

The Council settled D1–D4 on 2026-11-05, and D5–D9 on 2026-11-08 by agreeing to the recommendations for O1–O5 (§ 10), D10 on 2026-11-08 from the spec dry run (§ 11), and D11–D14 on 2026-11-13 for Q7, Q8, Q9, and Q11 (§ 11). The rest of this document follows them.

| ID | Question | Decision |
| --- | --- | --- |
| D1 | How a sprint is represented in Asana | **Pluggable, sections first.** A `cyber-asana.sprint-model` interface with one implementation per representation. Ship `sections` first, then `custom-field` for multi-project scopes. Leave `project` (one project per sprint) for later. |
| D2 | Dashboard form | **All three, phased.** First CLI output, then an Asana status update, then a generated HTML page. |
| D3 | Skill packaging | **One `asana-scrum` routing skill that also covers standup.** `asana-standup` and `asana-sprint-report` fold into it. |
| D4 | Where team capacity comes from | **Asana Allocations only.** There is no capacity in config. When a workspace has no allocations, workload shows load without capacity. |
| D5 (O1) | Setup: its own skill or a route of `asana-scrum` | **Its own skill, `init-asana-scrum`.** |
| D6 (O2) | Where the sprint commitment snapshot lives | **A status update posted when the sprint starts.** When no snapshot exists, rebuild the commitment from task history. |
| D7 (O3) | How `asana-standup` and `asana-sprint-report` retire | **Each stays as a stub that routes to `asana-scrum` for one minor release, then is deleted.** |
| D8 (O4) | Where the generated dashboard page goes | **Decided when U14 is built.** Until then the CLI writes a local file. |
| D9 (O5) | Out-of-office entries on workload | **A note beside a person's capacity, never subtracted from it**, so D4 holds. |
| D10 (Q10) | Where the scrum system's design spec lives | **In the repo's existing spec tree, `packages/cyber-asana/.agents/spec/`.** |
| D11 (Q7) | Which timezone sets "today" and the standup window | **The user's Asana timezone, read through `user me`.** |
| D12 (Q8) | Reports when there is no current sprint | **Standup carries on without sprint filters and says there is no current sprint. Review, health, and workload fail with `sprint-none`, and the skill offers to create the next sprint.** |
| D13 (Q9) | An ambiguous reference name, such as two plugins shipping `cyber-asana.scrum` | **Delegated to `cyber-agentkit`, for every cyber-asana reference, `cyber-asana.task-conventions` included; cyber-asana duplicates none of its logic.** The CLI and MCP resolve through the library's `resolveReference`, which reports `ambiguous` with its options. They cannot ask, so they stop with a `reference-ambiguous` status that lists them. The skills settle it through the `reference` skill of `cyber-agentkit`, which lists the options (with `default`), asks which to build on and whether for the repository or only the user, and saves the pick with `reference customize <name> --extends <pick>`. This replaces today's behavior in `loadConventions()`, which warns and applies no conventions. |
| D14 (Q11) | Whether the standup's Blocked lists tasks outside the current sprint | **No: the current sprint only, matching Today.** |

§ 11 lists what is still open: Q6, for the functional spec.

### 1.2 Principles

- **P1 Policy in references, Asana identity in config.** How a team works is policy, with no GIDs in it: sprint length, workflow states, definition of done, report layouts. It goes in cyber-agentkit references, which an override can patch. Which Asana objects a team uses are GIDs: projects, the portfolio, the team, the sprint field. They go in `.agents/cyber-asana.json`, as projects and field roles do today. This is the same split `cyber-asana.task-conventions` already follows. ADR 0001 also still holds: the workspace GID never goes in committed config.
- **P2 The CLI computes; skills narrate.** Counts, point totals, velocity, burndown, health findings, and utilization are deterministic. They belong in `cyber-asana` commands, where tests cover them and every output format works. Today the skills ask the model to add up task lists. A skill adds only judgment: what to highlight, the narrative, follow-up questions.
- **P3 CLI and MCP share one core.** Each new command gets an `asana_*` MCP tool through the same `api.ts`, as AGENTS.md requires.
- **P4 Degrade by naming the gap.** When a capability is missing, the report says so and still renders, using `printEmpty`-style messages. Examples: no allocations (capacity unknown), a free workspace (no premium search), no points field.

## 2. Today

### 2.1 `asana-standup`

Today it:

- fetches `task list --project-gid <p> --completed-since <two days ago>`, then `task list --project-gid <p> --incomplete`;
- has the model sort the results into Done / Today / Up next;
- asks the user for blockers;
- shows story and task points apart when the project registers them.

Gaps:

- **G-S1 Wrong data.** The `--completed-since` list is not a list of completed tasks. Asana's `completed_since` returns tasks that are "either incomplete or that have been completed since this time" (SDK 3.3.0, `TasksApi.getTasks`). `src/tasks/cli.ts` passes the value through unchanged, and its help text says "Only include tasks completed on or after this date". So the Done list also holds every open task.
- **G-S2 Not personal.** It lists every task in the project, not the user's. `task list` has no assignee filter.
- **G-S3 One project.** It has no multi-project, portfolio, or team scope, and no team standup grouped by person.
- **G-S4 No sprint.** It has no idea which sprint is current, so Today cannot mean "in this sprint".
- **G-S5 Blockers are asked for, never read.** Dependencies (`task dependency list`, `is_blocked` in search), a Blocked tag, and a status field are all available. None are used.
- **G-S6 Fixed layout and window.** The format and the two-day window are in the skill text. A team cannot change them without forking the skill.

### 2.2 `asana-sprint-report` (alpha)

Today it:

- asks for the project, the sprint section, and the start date;
- fetches completed and incomplete tasks for the whole project and filters them by section by hand;
- has the model compute the completion rate, point totals, and a narrative;
- offers to move incomplete tasks to the next section.

Gaps:

- **G-R1** G-S1 applies here too: the "completed since" list includes the open tasks.
- **G-R2 No sprint registry.** It asks for the sprint and its start date every time. Sprint = section is assumed but never written down.
- **G-R3 Filtering done by hand.** The CLI has no section filter on `task list`. `TasksApi.getTasksForSection` is wrapped in `src/sections/gateway.ts` and `src/tasks/api.ts` but has no CLI command.
- **G-R4 No sprint history.** It has no velocity across sprints, no carry-over count, no record of what the sprint committed to, no scope change (tasks added or removed mid-sprint), and no burndown.
- **G-R5 Model arithmetic.** It adds up points and percentages from long lists, which is error-prone and untested.
- **G-R6 Nothing written back.** It never records the result in Asana (as a status update) for stakeholders.
- **G-R7 One project, one fixed layout.** It has the same scope and format limits as G-S3 and G-S6.

### 2.3 What already works

- The project registry: `projects[].fields.story_points` / `task_points`, filled by `config discover-fields`.
- The `cyber-asana.task-conventions` reference: the line between story points and task points; 1 point ≈ 1 hour; parent tasks carry no points.
- `section create | move | task add`, `task project add --section`, `task dependency list`, `status create | list` on a project, portfolio, or goal, and `status overview`.
- `portfolio items` and `ooo list`.
- `task search` with assignee, project, section, tag, team, portfolio, `is_blocked`, and date filters.

## 3. Asana capabilities, checked against the SDK

Checked against the installed `asana` SDK 3.3.0 (`node_modules/.pnpm/asana@3.3.0*/node_modules/asana/src/api/`). The SDK ships no model files. Method names and query parameters are verified there. Request-body fields marked *(docs)* come from Asana's API documentation and are not SDK-verified; each build unit confirms them with a system test.

| ID | Capability | In the SDK | Wrapped by cyber-asana |
| --- | --- | --- | --- |
| A1 | Native sprint / iteration / cycle | **No.** No such resource or field anywhere in `src/` | — |
| A2 | Dashboards, charts, reporting | **No.** No dashboard, chart, or report class or method. Nearest: `ProjectsApi.getTaskCountsForProject` | `project counts` |
| A3 | Status updates on a project, portfolio, or goal | `StatusUpdatesApi`: `createStatusForObject`, `getStatus`, `getStatusesForObject`, `deleteStatus`. **No update method:** a status update cannot be edited. Body *(docs)*: `parent`, `status_type` (project/portfolio: `on_track`, `at_risk`, `off_track`, `on_hold`, `complete`), `title`, `text`, `html_text` | yes (`status`); `status_type` not validated |
| A4 | Sections | `createSectionForProject`, `insertSectionForProject` (reorder within a project), `addTaskForSection`, `getTasksForSection`, `updateSection`, `deleteSection` | yes, but `getTasksForSection` has no CLI command |
| A5 | Custom fields | `createCustomField`, `updateCustomField`, `createEnumOptionForCustomField`, `insertEnumOptionForCustomField`, `updateEnumOption`; `addCustomFieldSettingForProject` / `removeCustomFieldSettingForProject` | read only (`custom-field list \| get \| project`); create, enum options, and attach-to-project are not wrapped |
| A6 | Task search (premium only, 402 otherwise; eventually consistent; no offset paging, so page by `sort_by` plus a date bound) | `TasksApi.searchTasksForWorkspace`: `projects.*`, `sections.*`, `tags.*`, `teams.any`, `portfolios.any`, `assignee.*`, `is_blocked`, `completed`, `completed_at.*`, `modified_at.*`, `due_on.*`, and `custom_fields.{gid}.value \| is_set \| less_than \| greater_than \| before \| after` | yes, except the `custom_fields.{gid}.*` filters and paging |
| A7 | Portfolios | `getItemsForPortfolio`, `addItemForPortfolio`, `removeItemForPortfolio`, custom-field settings, members, `duplicatePortfolio`. Items are projects or portfolios *(docs)* | `portfolio items` only |
| A8 | Teams | `TeamMembershipsApi.getTeamMembershipsForTeam`, `ProjectsApi.getProjectsForTeam`, `TeamsApi.getTeamsForUser` | `team list \| get` only |
| A9 | Allocations (resource management) | `AllocationsApi`: `getAllocations({parent, assignee, workspace})`, `getAllocation`, `createAllocation`, `updateAllocation`, `deleteAllocation`. Body *(docs)*: `assignee`, `parent` (project), `start_date`, `end_date`, `effort {type: hours \| percent, value}`. Plan availability is not stated in the SDK | **no** |
| A10 | Time tracking | `TimeTrackingEntriesApi` (402 without the feature); entries hold `duration_minutes`, `entered_on` *(docs)* | no |
| A11 | Out of office | `OooEntriesApi` | yes (`ooo`) |
| A12 | Task history | `StoriesApi` (system stories such as "moved to section", with `resource_subtype` values *(docs)*) | yes (`story list`, `task get --with-stories`) |
| A13 | Project duplicate and templates | `duplicateProject`, `projectSaveAsTemplate`, `ProjectTemplatesApi.instantiateProject` | templates yes; duplicate no |
| A14 | Goals and metrics | `GoalsApi` CRUD, `createGoalMetric`, `updateGoalMetric`, `GoalRelationshipsApi.addSupportingRelationship` | goal CRUD only |
| A15 | Time periods | `TimePeriodsApi.getTimePeriods` (goal quarters, read only; not tied to tasks) | no |

What follows for the design:

- A1 means a sprint is always something we build on top of Asana, which is why D1 made it pluggable.
- A2 means an Asana-native dashboard cannot be created. A team can still build an Asana dashboard by hand on the fields this system keeps up to date (the Sprint field, the points fields, the status field).
- A3 means every dashboard post is a new status update, so the history builds up in Asana.
- A6 means any scope that needs search (team, custom-field sprints, workspace-wide "my tasks") requires a premium workspace. A single-project scope with the `sections` model works on a free workspace through `getTasksForProject` / `getTasksForSection`.
- A9 is the only source of capacity (D4).

## 4. The scrum model on Asana

### 4.1 Concepts

| Concept | Meaning here | Carried by |
| --- | --- | --- |
| **Scope** | The set of Asana projects (and the people) a scrum team works in | `scrum.scopes[]` in repo config (§ 6) |
| **Sprint** | A time box with an index, a name, a start, and an end | the scope's sprint model (§ 4.2) |
| **Backlog** | Incomplete tasks in the scope that belong to no sprint | the sprint model's "backlog" query |
| **Workflow state** | backlog → ready → in progress → review → done | a `status` enum field role, or sections when the sprint model leaves them free (§ 4.3) |
| **Story points / task points** | Exactly as `cyber-asana.task-conventions` § Story points and task points defines them | the `story_points` / `task_points` field roles |
| **Commitment** | The tasks and points in a sprint when it starts | a status update posted at sprint start (D6) |
| **Velocity** | Points completed per sprint, each kind on its own | computed from closed sprints |
| **Capacity** | Effort hours each person is allocated for the sprint's dates | Asana Allocations only (D4) |
| **Blocked** | A task that cannot move | any signal in the policy's `blocked_signals`: an incomplete dependency (`is_blocked`), a tag, or a status option |

**Sprint identity is computed, never typed in.** The policy sets these keys:

- `sprint_anchor_date`: the first day of sprint 1;
- `sprint_length_days`;
- `sprint_name_format`, for example `Sprint {n}` or `{year}-S{n}`, with the tokens `{n}`, `{start}`, `{end}`, `{year}`.

For any date, the CLI finds the sprint index and that sprint's name, then asks the sprint model for the matching section or enum option. "The current sprint" therefore needs no lookup table and no question to the user, which fixes G-R2.

### 4.2 Sprint models (D1)

Each sprint model is one implementation of the `cyber-asana.sprint-model` interface (§ 5.3) together with matching code in the CLI.

| Key | A sprint is | Backlog is | Scopes | Free workspace | Ships |
| --- | --- | --- | --- | --- | --- |
| `sections` | a section named by `sprint_name_format` in each project of the scope | the `Backlog` section (named in the policy), plus tasks in no sprint section | `project`, `projects` | yes | first (U4) |
| `custom-field` | an option of a `Sprint` enum field (the `sprint` field role) | tasks whose Sprint field is unset | any | no (needs search for multi-project queries) | second (U11) |
| `project` | a project per sprint, grouped in a portfolio; tasks multi-homed from a backlog project | the backlog project | any | partly | later (U15) |

Each model answers the same operations: find the current sprint, list a sprint's tasks, list the backlog, add a task to a sprint, start a sprint (create its section or option), close a sprint (carry over), and list closed sprints for velocity.

**Custom models.** A repo may add its own implementation, such as `cyber-asana.sprint-model.tags`, under `.agents/references/` and point a scope at it. Agents can then follow that reference with primitive commands. The `sprint` and `report` CLI commands compute only the models built into the CLI. For any other model they stop with an error that names it. That limit is stated in the interface.

### 4.3 Workflow states

The `sections` model uses sections for sprints. A task sits in only one section per project, so it cannot also use sections for workflow states. The policy key `state_carrier` therefore takes one of three values:

- `field`: a `status` enum field role, with options mapped through `workflow_states`;
- `sections`: allowed only with the `custom-field` or `project` model;
- `none`: completion is the only state.

Setup refuses `sections` + `sections`. With `none`, the in-progress and review signals in reports and health checks fall back to "incomplete and assigned". The report says it fell back.

### 4.4 Ceremonies

Each ceremony is one route of `asana-scrum` (§ 8). It runs a CLI command for the data, then follows the matching section of the `cyber-asana.scrum` reference and the layout of a `cyber-asana.report.*` reference.

| Ceremony | Data | What the agent does | Writes to Asana (with the user's approval) |
| --- | --- | --- | --- |
| C1 Refinement | `backlog list` with estimates and definition-of-ready findings | Estimates per task-conventions and checks the definition of ready. Orders the backlog. | points field values, section order |
| C2 Planning | velocity (last `velocity_window` sprints), capacity (Allocations), backlog top | Proposes a commitment that fits capacity and recent velocity. The user edits it. | `sprint start` (creates the section or option), `sprint add`, the commitment snapshot |
| C3 Daily standup | `report standup` for the user or the team | Writes Done / Today / Blockers. Blockers are read from the data (G-S5). | nothing by default |
| C4 Review | `report sprint` | Writes the stakeholder narrative and the list of completed stories | optional status update (dashboard phase 2) |
| C5 Retro | `report retro`: carry-over, scope change, blocked tasks, cycle time | Facilitates the discussion, then files retro actions as tasks through the `asana` skill's create-task procedure | action tasks; `sprint close` with the policy's `carry_over` |

## 5. Overridable references

### 5.1 How cyber-agentkit layers apply here

Every name below ships as a plugin-tier default in `packages/cyber-asana/references/`. That folder is already in the package `files`, so it reaches consumers. Contributions compose bottom first. Frontmatter keys compose key by key, and the higher tier wins each key. Body sections compose by heading path through each file's `merge` (`patch` by default).

| Tier | Where | Who | Typical override in this system |
| --- | --- | --- | --- |
| managed | `references/` next to the harness's managed-policy files | the organization | locks that apply org-wide, such as `hours_per_point`, the definition of done, a required health check. Nothing below can override them. |
| repo | `.agents/references/` at the repo root | the team that owns the repo | the team's process: sprint length and anchor, workflow states, `carry_over`, ceremony procedures, report layouts |
| project section | `.agents/references/<name>.md` in a sub-folder that git tracks (for example one package of a monorepo) | one package's team | prose for that folder alone, delivered after the main document. **It contributes no frontmatter keys to the composed metadata** (confirmed in U2 against cyber-agentkit 2.0.0, pinned by a test in `src/platform/reference-metadata.test.ts`): `resolveReference` returns a project section's frontmatter apart, on `projectSections[].metadata`, whatever the working folder. So key overrides for one team go through `scrum.scopes[]` (§ 6). |
| user | `~/.agents/references/` | one person | personal defaults that apply only where the repo sets nothing, such as the standup window and layout. The user tier sits **below** repo, so a person cannot override what the team set. |
| plugin (package default) | `packages/cyber-asana/references/` | cyber-asana | every key and section, with working defaults |

Agents load these by name with the `reference` skill of `cyber-agentkit`; skills never read tier folders themselves. The CLI loads frontmatter keys the way `loadConventions()` does today (`referenceLayers` + `resolveReference`), except that an ambiguous name no longer warns and carries on without the reference: it reports `reference-ambiguous` with its options (D13). U2 generalizes that loader into one `loadReferenceMetadata(name, parse)`. Both conventions and scrum policy use it.

### 5.2 `cyber-asana.scrum` (policy)

How the team runs scrum. Frontmatter keys, which the CLI reads and validates. A bad value throws, the way `parseConventions` does:

| Key | Type | Default | Used by |
| --- | --- | --- | --- |
| `sprint_model` | `sections` \| `custom-field` \| `project` \| a custom key | `sections` | all sprint commands; a scope may override it |
| `sprint_length_days` | integer | `14` | sprint identity; a scope may override it |
| `sprint_anchor_date` | `YYYY-MM-DD` | none; setup asks | sprint identity; a scope may override it |
| `sprint_name_format` | string with `{n}` `{start}` `{end}` `{year}` | `Sprint {n}` | sprint identity, `sprint start` |
| `backlog_section` | section name | `Backlog` | `sections` model |
| `state_carrier` | `field` \| `sections` \| `none` | `none` | reports, health |
| `workflow_states` | map: `backlog`, `ready`, `in_progress`, `review`, `done` → option or section name | names equal to the keys, title-cased | reports, health |
| `blocked_signals` | list of `dependency`, `tag:<name>`, `state:<state>` | `[dependency]` | standup, health, retro |
| `carry_over` | `move` \| `leave` | `move` | `sprint close` |
| `velocity_window` | integer (sprints) | `3` | planning, velocity |
| `hours_per_point` | number | `1` (task-conventions unit) | workload, planning |
| `working_hours_per_day` | number | `8` | percent allocations → hours |
| `working_days` | list of weekdays | Mon–Fri | sprint dates, standup window, capacity |
| `standup_window` | `previous_working_day` \| `<n>d` | `previous_working_day` | standup |

Body sections, which `asana-scrum` follows and a team can patch one at a time:

- `## Definition of ready`
- `## Definition of done`
- `## Refinement`
- `## Planning`
- `## Standup`
- `## Review`
- `## Retro`

`cyber-asana.task-conventions` stays the only home of the story-versus-task-points rule and the 1-point unit. `cyber-asana.scrum` refers to it and never restates it.

### 5.3 `cyber-asana.sprint-model.interface` (cardinality `many`)

The interface declares these sections, and every implementation fills each one or marks it `**Unsupported.**` with one sentence on why:

- `## Requirements`: what setup must create, such as the backlog section or the Sprint field with its options;
- `## Current sprint`
- `## Sprint tasks`
- `## Backlog`
- `## Add to sprint`
- `## Start a sprint`
- `## Close a sprint`
- `## Closed sprints`

Implementations: `cyber-asana.sprint-model.sections` (U4), `cyber-asana.sprint-model.custom-field` (U11), `cyber-asana.sprint-model.project` (U15). Each section gives the CLI command for the operation, and the primitive commands an agent uses when the CLI does not build that model in. `reference check` keeps every implementation shaped like the interface.

### 5.4 `cyber-asana.report.interface` (cardinality `many`)

Every report declares these sections:

- `## Audience`
- `## Data`: the `cyber-asana report <key> --json` command and the fields it returns;
- `## Layout`: the output template;
- `## Judgment`: what the agent adds and what it must not invent;
- `## Follow-up`: what to offer after the report.

Thresholds go in the report's frontmatter.

| Implementation | Frontmatter keys (defaults) |
| --- | --- |
| `cyber-asana.report.standup` | none (the window comes from the policy) |
| `cyber-asana.report.sprint` | none |
| `cyber-asana.report.retro` | none |
| `cyber-asana.report.velocity` | none (the window comes from the policy) |
| `cyber-asana.report.health` | `checks`: list of check IDs enabled (all); `stale_days: 3`; `wip_limit: 3`; `overdue_grace_days: 0` |
| `cyber-asana.report.workload` | `over_allocation_pct: 100`; `under_allocation_pct: 60` |

A team changes a layout by patching `## Layout` in `.agents/references/cyber-asana.report.standup.md`. A repo adds a report of its own, such as `cyber-asana.report.release-readiness`, by implementing the interface. The dashboard finds every report through `implementations cyber-asana.report`.

### 5.5 `cyber-asana.dashboard`

Frontmatter:

- `reports`: an ordered list of report keys. Default: `[sprint, health, workload, velocity]`.
- `forms`: a subset of `cli`, `status-update`, `page`. Default: `[cli]`.
- `status_parent`: `project`, `portfolio`, or `scope-default`. Default: `scope-default`.
- `status_rules`: maps health findings to `status_type`. Default: `off_track` on any error-level finding, `at_risk` on any warning, else `on_track`.

Body:

- `## Status update`: title and body template, in Asana's HTML subset. The `tidy-description` reference says what that subset allows.
- `## Page`: the sections and charts of the generated page.

## 6. Scopes

`.agents/cyber-asana.json` gets a `scrum` block, which needs `schema_version: 3`. The loader still reads 2; `config` writes 3 once a scope is added.

```json
{
  "schema_version": 3,
  "projects": [ { "gid": "1201", "name": "web", "fields": { "story_points": {"gid": "…", "name": "Story Points"}, "sprint": {"gid": "…", "name": "Sprint"}, "status": {"gid": "…", "name": "Status"} } } ],
  "scrum": {
    "scopes": [
      { "name": "web", "kind": "project", "projects": ["1201"], "default": true },
      { "name": "platform", "kind": "projects", "projects": ["1201", "1202"], "sprint_model": "custom-field" },
      { "name": "growth", "kind": "portfolio", "portfolio": "1300", "sprint_model": "custom-field" },
      { "name": "web-team", "kind": "team", "team": "1400", "sprint_model": "custom-field", "sprint_anchor_date": "2026-01-05" }
    ]
  }
}
```

| Kind | Projects | People | Needs |
| --- | --- | --- | --- |
| `project` | the one project | assignees seen in the project | nothing new |
| `projects` | the listed projects; a task multi-homed in two of them is counted once (dedupe by GID) | assignees seen | nothing new |
| `portfolio` | `getItemsForPortfolio`, followed recursively into nested portfolios | assignees seen | recursion in scope resolve |
| `team` | `getProjectsForTeam` | `getTeamMembershipsForTeam` (the team's members, including people with no task yet) | G4 |
| `me` (built in, no config) | the scope the user picks, or the whole workspace through search | the user | premium search for the workspace form |

- **Per-scope overrides.** A scope may override only `sprint_model`, `sprint_length_days`, and `sprint_anchor_date`. They depend on how that team's Asana is built, which makes them data under P1. Everything else comes from the policy reference.
- **New field roles.** `FIELD_ROLES` gains `sprint` (an enum; discovery matches "Sprint" and "Iteration") and `status` (an enum; it matches "Status" and "Stage"), next to `story_points` / `task_points`.
- **Global config.** The global config (`~/.config/cyber-asana/config.json`) may hold `scopes` inside a `repos[]` entry, for a person's own cross-project scope. Repo scopes win on a name clash, as projects already do.
- **Every command takes `--scope <name>`.** Without it, the command uses the scope marked `default`. With no scope configured, it uses the repo's default project as an implicit `project` scope, so a repo that has done only `config add` still gets a standup.

## 7. Reports and the dashboard

Every report is a `cyber-asana report <key>` command:

- it takes `--scope`, `--sprint <n|name|current|previous>`, `--json`, and `--toon`;
- output goes through `output()`, and an empty result goes through `printEmpty`;
- each one has a matching `asana_report_<key>` MCP tool.

### 7.1 Report contents

| Report | Computed by the CLI | Points |
| --- | --- | --- |
| R1 standup (`--me` default, `--member <user>`, `--team`) | Done: completed within `standup_window` (a real completed filter, fixing G-S1). Today: incomplete, in the current sprint, in progress or due today. Blocked: from `blocked_signals`, each with its blocker. Grouped by person for `--team`. | story and task points shown apart when the fields exist |
| R2 sprint (review) | Committed vs completed vs added vs removed. Completion rate by count and by points. Carry-over candidates. Daily burndown from `completed_at`. Completed stories for the demo list. | per kind, never merged into one figure |
| R3 retro | Carry-over list. Scope change. Blocked tasks and how long each was blocked (best effort from stories, A12). Cycle time (`completed_at − created_at`, or from the first move into in-progress when stories show it). Estimate vs actual, from the points actuals task-conventions records. | per kind |
| R4 velocity | Points completed per closed sprint, for the last `velocity_window` sprints, plus the mean. | per kind |
| R5 health (check report) | One finding per enabled check: H1 a task in the sprint with no estimate; H2 a parent task carrying points; H3 an unassigned task in the sprint; H4 an overdue task; H5 in progress with no change for `stale_days`; H6 a person over `wip_limit`; H7 a blocked task; H8 the sprint over capacity; H9 no current sprint section or option exists; H10 a closed sprint still holding incomplete tasks; H11 a task in two sprints. Each finding carries a level (error or warning), the task, and a fix command. | used by H1, H2, H8 |
| R6 workload (`--from --to`, default: the current sprint) | Per person: incomplete assigned tasks in scope, story points, task points, effort hours (both kinds × `hours_per_point`, with the two parts shown), capacity hours from Allocations for the dates (hours as given; percent × `working_hours_per_day` × working days), utilization %, and over or under flags. Also a team total. | both kinds summed only as labelled effort hours, each part shown |

**Capacity (D4).** Capacity comes only from `AllocationsApi.getAllocations`, filtered by `assignee` and by `parent` for each project in the scope, clipped to the report's dates. When the call returns 402, or no allocation exists for a person, that person's capacity is "unknown". The report then names the reason (plan or no allocation) and still shows the load. H8 is skipped and says why. Out-of-office entries (`ooo list`) for the dates appear as a note beside the person's capacity and are never subtracted from it (D9).

### 7.2 Dashboard (D2, phased)

| Phase | Form | What it is | Asana API basis |
| --- | --- | --- | --- |
| D2.1 | CLI | `cyber-asana report dashboard`: the reports listed in `cyber-asana.dashboard` `reports`, in one text, JSON, or TOON output | the reports above |
| D2.2 | Asana status update | `report dashboard --post-status`: posts a status update on the scope's project, or its portfolio for a `portfolio` scope. `status_type` comes from `status_rules`; the body is the `## Status update` template in Asana's HTML subset. The skill shows the post and asks before sending. | `createStatusForObject` (A3). There is no edit, so each post is a new update and the history builds up. |
| D2.3 | Generated page | `report dashboard --page <path>`: writes a self-contained HTML file from the dashboard JSON, with burndown, velocity, and workload charts and the health findings. Until U14 decides where it is published, the CLI writes a local file (D8). | none; built from the CLI JSON |

An Asana-native dashboard (charts inside Asana) is not reachable through the API (A2). The docs page for the dashboard tells teams which fields to chart by hand in Asana.

## 8. Skills and CLI/API gaps

### 8.1 Skill set (D3)

| ID | Skill | Change | Role |
| --- | --- | --- | --- |
| K1 | `asana-scrum` | **new** | The routing skill for all scrum work: standup, refinement, planning, review, retro, health check, workload, velocity, dashboard, and sprint housekeeping (start, close, add). Each route is a procedure file in `skills/asana-scrum/references/` (as the `asana` skill does it), with `/cyber-asana:standup`, `/cyber-asana:sprint-plan`, `/cyber-asana:sprint-review`, and `/cyber-asana:retro` commands. Each procedure loads `cyber-asana.scrum`, the scope's `cyber-asana.sprint-model.<key>`, and its `cyber-asana.report.<key>` with the `reference` skill of `cyber-agentkit`. |
| K2 | `init-asana-scrum` | **new** | The setup skill (§ 8.2), separate from K1 (D5). |
| K3 | `asana-standup` | **retired** into K1's standup route | — |
| K4 | `asana-sprint-report` | **retired** into K1's review and retro routes | — |
| K5 | `asana` | changed | Its routing table sends standup and sprint requests to `asana-scrum`, and scrum setup to `init-asana-scrum`. |
| K6 | `config-asana` | changed | Adds scope add, remove, and list, and the `sprint` / `status` field roles. |
| K7 | `init-asana` | changed | Its last step offers `init-asana-scrum`. |
| K8 | `sync-asana-project` | unchanged | — |

Retiring K3 and K4 removes two skill names users may call directly. Each stays as a stub that routes to `asana-scrum` for one minor release, with a changeset that says so, and is then deleted (D7).

Every skill change also needs:

- `pnpm plugin:build`, with the derived manifests committed;
- the docs pages under `apps/web/src/content/docs/skills/`;
- the skill's node in the SDD spec under `packages/cyber-asana/.agents/spec/skills/`;
- a changeset, because `skills/` is published.

### 8.2 `init-asana-scrum` (setup)

It is idempotent: re-running it shows the current setup and changes only what the user picks. Nothing is created in Asana or written to the repo without the user's approval.

1. **Prerequisites.** Check that `init-asana` passed: the CLI form, the token, the workspace. If not, run `init-asana` and stop.
2. **Scope.** Ask which kind (project, projects, portfolio, team), find the objects with `project search`, `portfolio list`, and `team list`, then write the scope with `cyber-asana config scope add`.
3. **Sprint model.** List the implementations of `cyber-asana.sprint-model` with the `reference` skill. Recommend `sections` for a single-project scope and `custom-field` otherwise. Show the chosen model's `## Requirements`.
4. **Fields.** Run `config discover-fields` for every project in the scope (points, `sprint`, `status`). Offer to create what is missing: the Sprint enum field, the Status field, and attaching them to each project.
5. **Structure.** Offer to create the backlog section, and the section or option for the current sprint (`sprint start`).
6. **Policy.** Walk through sprint length, the anchor date, the name format, the workflow states, `carry_over`, and the definition of done. Write only the keys that differ from the default into `.agents/references/cyber-asana.scrum.md`, through the `reference` skill's Update mode.
7. **Capacity.** Probe Allocations (`allocation list --assignee me`). Report "available", "plan does not include it" (402), or "no allocations yet". Explain that workload shows no capacity until allocations exist (D4).
8. **Verify.** Run `report health --scope <name>` and show the findings and the next steps (`/cyber-asana:sprint-plan`).

### 8.3 CLI and API gaps

| ID | Gap | Needed by | Asana basis |
| --- | --- | --- | --- |
| G1 | `task list --completed-since` returns incomplete tasks too (Asana semantics), and its help text says otherwise. Fix the help text and add a true completed-after filter (filter `completed_at` client-side). | standup, sprint report (today and K1) | `getTasks` `completed_since` |
| G2 | No CLI for a section's tasks. Add `section tasks <gid>` (or `task list --section`). | `sections` model | `getTasksForSection` (wrapped) |
| G3 | `task search` lacks the `custom_fields.{gid}.*` filters and paging past 100 (page with `sort_by` plus a date bound) | `custom-field` model, team and workspace scopes | A6 |
| G4 | Team members and team projects not wrapped. Add `team members <gid>` and `team projects <gid>`. | `team` scope | A8 |
| G5 | Allocations not wrapped. Add an `allocation` domain (`list \| get \| create \| update \| delete`). | workload, planning, H8 | A9 |
| G6 | Custom-field create and enum-option create, insert, and update not wrapped | setup, `sprint start` (`custom-field`) | A5 |
| G7 | Attaching or detaching a project's custom-field setting not wrapped | setup | A5 |
| G8 | Portfolio item add and remove not wrapped; scope resolve needs recursion into nested portfolios | `portfolio` scope, `project` model | A7 |
| G9 | Field roles are only `story_points` / `task_points`. Add `sprint` and `status`. | all models with a field | — |
| G10 | Repo config has no scopes. Add `scrum.scopes` (schema 3) and `config scope add \| remove \| list`. | everything | — |
| G11 | The reference metadata loader is specific to conventions. Generalize it. | policy, reports, dashboard | cyber-agentkit |
| G12 | No sprint or report computation. Add the `sprint`, `backlog`, and `report` commands and their MCP tools. | K1 | — |
| G13 | `status create` passes `status_type` through unchecked. Validate it per parent type. | dashboard D2.2 | A3 |
| G14 | Scope-change and blocked-time history means reading system stories by `resource_subtype`. The values are from Asana's docs, not the SDK; confirm them with a system test before relying on them. | R2, R3 | A12 |

**Code placement.** Scrum is a cross-cutting capability, so under the Screaming Architecture it gets its own folder shaped like a domain, `src/scrum/`:

- `policy.ts`, which reads `cyber-asana.scrum`;
- `scope.ts`;
- `sprint-model/` with one module per model;
- `reports/` with one module per report;
- `api.ts`, `default.ts`, `cli.ts`, and `mcp.ts`.

New Asana resources it needs (allocations, team memberships) get their own domain folders and gateways (`src/allocations/`, the `teams/` gateway). `src/scrum/api.ts` takes those gateways as arguments and never calls the SDK. `architecture.test.ts` enforces this.

## 9. Phased build plan

Each unit can ship alone and passes `pnpm verify`; units that need it also pass system tests. A unit changes one concern and adds a changeset when it changes a published file. Later units depend only on earlier ones.

| Unit | Delivers | Closes | Depends on | Status |
| --- | --- | --- | --- | --- |
| U1 | A true completed-since filter, honest help text, and `section tasks`. Patch the two existing skills to use them. | G1, G2 (fixes G-S1, G-R1, G-R3 now) | — | Shipped (#321) |
| U2 | `loadReferenceMetadata` (conventions moved onto it). The `cyber-asana.scrum` package default with its key parser. A docs page on overriding it. Confirm whether project sections contribute frontmatter. | G11 | — | Shipped (#322) |
| U3 | `scrum.scopes` (schema 3), `config scope add \| remove \| list`, `scrum scope resolve` for `project`, `projects`, `portfolio`; the `sprint` and `status` field roles | G9, G10, G8 (recursion) | U2 | Built; in review |
| U4 | `cyber-asana.sprint-model.interface` + `.sections`; `sprint current \| list \| tasks \| add \| start \| close`, `backlog list`; MCP tools | G12 (sprints) | U1, U3 | Built; in review |
| U5 | `init-asana-scrum` v1: project and projects scopes, the `sections` model, writing the policy and fields | K2 | U4 | Built; in review |
| U6 | `cyber-asana.report.interface` + `.standup`; `report standup`; `asana-scrum` v1 with the standup route; turn `asana-standup` into a routing stub (D7); update K5 | G12 (standup), K1, K3 | U4 | Built; in review |
| U7 | `.sprint`, `.retro`, `.velocity` reports, the burndown, and the commitment snapshot (D6); review and retro routes; turn `asana-sprint-report` into a routing stub (D7) | K4, G14 | U6 |  |
| U8 | `.health` report and the health route | — | U6 |  |
| U9 | `team members \| projects`, the `team` scope, team standup | G4 | U3, U6 |  |
| U10 | The `allocations` domain, `.workload` report, workload route, H8, and the capacity probe in setup | G5 | U8 |  |
| U11 | `.custom-field` model, search custom-field filters and paging, custom-field create and enum options, project field attach; setup support | G3, G6, G7 | U4, U5 |  |
| U12 | `cyber-asana.dashboard` and `report dashboard` (CLI, D2.1); the planning route (needs velocity and capacity) | — | U7, U8, U10 |  |
| U13 | `--post-status` (D2.2) and `status_type` validation | G13 | U12 |  |
| U14 | `--page` generated HTML (D2.3), and where the page is published (D8) | — | U12 |  |
| U15 | `.project` model (one project per sprint, in a portfolio) | G8 (add/remove) | U11 |  |

U1 can ship before anything else and fixes wrong numbers users see today.

### 9.1 Decisions made while building U4

- **"Today" and the timezone (D11).** Asana's public API returns no user timezone: the SDK's `UsersApi` and user model carry none. `sprint current` reads a `time_zone` from `user me` when one is present and otherwise uses the machine's timezone, and reports which in `timezone_source` (`asana` or `machine`). The first live run that finds a timezone on `user me` needs no code change.
- **Exit codes (Q6, in part).** `sprint-none`, `sprint-unknown`, `model-unsupported`, and `policy-incomplete` all exit `2`: each is a command the caller can fix and retry (start a sprint, name a real one, change the scope or the policy). `error.code` tells them apart. `premium-required` is untouched: the `sections` model never uses search.
- **Scope kinds for `sections`.** `portfolio` is `model-unsupported` for the `sections` model, as § 4.2 lists only `project` and `projects`, with a message that says the kind, not the model, is the problem.
- **Backlog.** A sprint section is any section whose name matches `sprint_name_format`; the backlog is every incomplete task in the other sections, including the `backlog_section`, so a team's `Icebox` counts. A task a sprint section of another project holds is left out.
- **`sprint close` target.** With `carry_over: move` the next sprint's section is created where missing, because the tasks need somewhere to go. Sprints are listed by sections present, so `sprint list` shows the current sprint even before its section exists (`exists: no`).
- **Commands sit at the top level** (`sprint`, `backlog`), not under `scrum`, as the build brief names them; `scrum scope resolve` stays where U3 put it.

### 9.2 Decisions made while building U5

- **v1 scope of `init-asana-scrum`.** It sets up the `project` and `projects` scopes with the `sections` model only. For a portfolio or team scope, or another model, it says which later unit adds it and stops short, instead of offering a setup that would fail with `model-unsupported`.
- **Fields are reported, not created.** Step 4 runs `config discover-fields` and, for a missing role, tells the user how to add the field by hand (G6 and G7 land in U11). The `sections` model needs no `sprint` field.
- **Order of steps 5 and 6.** `sprint start` needs `sprint_anchor_date`, so the skill walks the policy before it starts the current sprint, though § 8.2 lists structure first.
- **Policy writes.** Only keys that differ from the default go into `.agents/references/cyber-asana.scrum.md`, frontmatter only and with no `merge` key. `sprint_anchor_date` has no default, so it is always written.
- **Skipped steps.** Step 7 (capacity probe) is skipped and said so (U10); step 8 verifies with `sprint current` and `backlog list` until `report health` exists (U8).
- **K7.** `init-asana` gains a last, optional step that offers `init-asana-scrum` and treats no answer as no.

### 9.3 Decisions made while building U6

- **Done, Today, and the window.** The Done window opens at midnight, in the user's timezone, of the previous working day (skipping days not in `working_days`) or of the day `<n>d` back, and runs to now, so a task completed earlier today counts. One Asana call per project (`completed_since`) serves Done and the no-sprint fallback; the sprint's own tasks come from the sprint model.
- **Overdue is in Today.** § 7.1 says "due today"; an incomplete sprint task whose `due_on` is before today also lists, with `reason: overdue`, since leaving it out would hide late work from the standup.
- **No sprint, in three ways.** D12's "no current sprint" covers an unset `sprint_anchor_date`, today before it, and a missing sprint section. Standup carries on in all three and says why in `sprint_note`, where the `sprint` commands fail with `policy-incomplete` or `sprint-none`. A sprint named with `--sprint` that has no section is still `sprint-none`.
- **Blocked reads a state only with a status field.** `state:<state>` signals need the `status` field role; without one they are skipped and `notes` says so. `state_carrier: sections` is treated like `none`, as no built-in model can combine it with sections.
- **Fields come from the project registry.** The scope store now returns each registered project's field roles; the report reads the story points, task points, and status GIDs from them. A role no project registers shows no figure, and `points_tracked` says which.
- **`--team` is `team-unsupported`, exit 2.** It is a code of its own until U9, told apart by `error.code`.
- **A member is a GID or an email**, looked up with `user get`; `--me` and `--member` conflict as a usage error.
- **Placement.** The report command lives in `src/scrum/reports/cli.ts` beside the pure `standup.ts`, because the architecture test treats only files named `cli.ts` or `mcp.ts` as delivery. `asana_report_standup` stays in `src/scrum/mcp.ts`.
- **K5 and the stub.** The `asana` skill's table sends standup, sprint, and scrum-setup requests to `asana-scrum` and `init-asana-scrum`. `asana-standup` keeps its trigger and routes to `asana-scrum` for one minor release.

## 10. Items settled after the first review

The Council agreed to each recommendation below on 2026-11-08. Each is recorded as D5–D9 in § 1.1.

| ID | Question | Recommendation |
| --- | --- | --- |
| O1 | Should setup be its own skill (`init-asana-scrum`) or a route of `asana-scrum`? D3 named a routing skill that covers standup and said nothing about setup. | A separate skill, matching the repo's `init-asana` / `asana` split, so a once-only setup never takes routing budget from daily use |
| O2 | Where should the sprint commitment snapshot live? Asana keeps no history of a sprint's membership, other than system stories. | Post it as a status update ("Sprint N started": the committed tasks and points) when the sprint starts. It is visible in Asana and cannot be edited (A3). Fall back to rebuilding it from stories when no snapshot exists. |
| O3 | How should `asana-standup` and `asana-sprint-report` be retired? | Keep each as a stub that routes to `asana-scrum` for one minor release, with a changeset that says so, then delete them |
| O4 | Where does the generated dashboard page (D2.3) go: a local file only, a file committed to the repo, or a published page? | Decide at U14. Until then the CLI writes a local file. |
| O5 | Should out-of-office entries (`ooo`, already wrapped) annotate workload? D4 rules them out as a capacity source. | Show them as a note beside a person's capacity and never subtract them, so D4 holds |

## 11. Questions from the spec dry run

A dry run of the `spec` skill (sdd2) on this document raised these questions. This document had left them unanswered. Each keeps the label the dry run gave it.

| ID | Question | Scope | Status | Recommendation |
| --- | --- | --- | --- | --- |
| Q6 | What CLI exit code does each failure status get (`scope-missing`, `scope-unknown`, `policy-invalid`, `policy-incomplete`, `model-unsupported`, `premium-required`, `sprint-none`)? | **Functional spec**, not design spec. An exit code is an encoding of an outcome. The design spec states only that each outcome is told apart and stable; the build unit that adds the command pins the code with its tests. | Open, for the functional spec; U3 pinned `scope-missing` and `scope-unknown` at `2` | `2` for the configuration statuses (`scope-*`, `policy-*`, `model-unsupported`), and the CLI's existing API-error code for `premium-required` |
| Q7 | Which timezone sets "today" and the standup window: the user's Asana timezone or the machine's? | Design spec | **Decided: D11** | The user's Asana timezone, read through `user me` |
| Q8 | When there is no current sprint (before `sprint_anchor_date`, or its section or option is missing), do reports fail with `sprint-none` or carry on without sprint filters? | Design spec | **Decided: D12** | Standup carries on and says so; review, health, and workload fail with `sprint-none` |
| Q9 | When two plugins ship `cyber-asana.scrum`, so the name is ambiguous, does a run warn and use the package default, or fail? | Design spec | **Decided: D13**, not as recommended | Warn and use the package default, as `loadConventions()` does for task conventions |
| Q10 | Where does the design spec live, given the repo already has an SDD spec tree with `.feature` suites? | Design spec | **Decided: D10** | `packages/cyber-asana/.agents/spec/` |
| Q11 | Does Blocked in the standup also list the member's blocked tasks outside the current sprint? | Design spec | **Decided: D14** | No; the current sprint only, matching Today |
