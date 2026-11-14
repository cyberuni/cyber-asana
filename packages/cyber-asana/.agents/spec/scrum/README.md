---
spec-type: behavioral
concept: [cyber-asana, scrum, scope, repo-registry]
---

# scrum — scopes, sprints, and the backlog

## What

The scrum system (design: [`docs/design/scrum-system.md`](../../../../../docs/design/scrum-system.md))
runs on a **scope**: the set of Asana projects a team works in. This node specifies the scope layer
(how a scope is configured, listed, selected, and resolved to its projects) and the sprint layer
(sprint identity, the `sections` sprint model, and the `sprint` and `backlog` commands). Reports start with the standup.

A scope names Asana objects by GID, so it lives in config beside the project registry, never in the
`cyber-asana.scrum` reference (which holds policy and no GIDs). A scope has a `name`, a `kind`, and
the members that kind needs, and may override exactly three policy keys: `sprint_model`,
`sprint_length_days`, and `sprint_anchor_date`.

| Kind | Members | Resolves to |
|---|---|---|
| `project` | exactly one project GID | that project |
| `projects` | one or more project GIDs | those projects; a task homed in two of them counts once |
| `portfolio` | one portfolio GID | the portfolio's projects, following nested portfolios |

The `team` kind belongs to a later unit and is rejected today.

**Key terms**

- **Scope** — a named set of projects a scrum team works in.
- **Implicit scope** — the repo's default project, standing in as a `project` scope when no scope is
  configured.
- **Sprint settings** — the effective `sprint_model`, `sprint_length_days`, and `sprint_anchor_date`
  for a scope: the policy's value with the scope's override laid over it.

## Logic

### Configuration

- Scopes live in `scrum.scopes[]` of `.agents/cyber-asana.json`. A `scrum` block needs
  `schema_version: 3`; the loader still reads 1 and 2 (read as 2), and rejects a `scrum` block under
  them. Adding a scope rewrites the file as schema 3. Removing the last scope drops the block.
- A scope name is unique ignoring case. Adding a scope with an existing name replaces it. At most one
  scope in a list is `default`, and a scope added with `default` takes the marker from the others.
- An unknown key on a scope, an unknown `kind`, a member the kind does not allow, a
  `sprint_length_days` that is not a positive integer, and a `sprint_anchor_date` that is not a real
  `YYYY-MM-DD` date are each rejected with a message naming the path.
- The global registry (`~/.config/cyber-asana/config.json`) may hold `scopes` inside a `repos[]`
  entry, with the same shape. The effective list is the repo's scopes then the global ones the repo
  does not shadow: the repo wins a name clash, and supplies the `default` when it has one. Editing a
  repo's projects in the global registry never drops its scopes.
- `config scope add | remove | list` and the `asana_scope_add | remove | list` tools go through one
  `api.ts`. `add` and `remove` write the repo config, or the global registry with `--global`;
  `remove` without it takes the scope from the repo config, else from the global registry. Removing a
  scope that is not configured succeeds with `already_absent: true` and writes nothing.
- Two field roles join `story_points` and `task_points`: `sprint` and `status`, both enum fields.
  `config discover-fields` matches a field named `Sprint` or `Iteration` to `sprint`, and `Status` or
  `Stage` to `status`, ignoring case and separators; a field of another subtype never matches.

### Selecting and resolving

- `--scope <name>` selects a scope, ignoring case. Without it the scope marked `default` is used.
  With no scope configured at all, the repo's default project acts as an implicit `project` scope.
  Once any scope is configured the default project no longer stands in.
- `scrum scope resolve` and `asana_scope_resolve` return the selected scope, whether it is implicit,
  its projects, and its sprint settings; `--tasks` also returns the scope's tasks, each once by GID.
- A `portfolio` scope reads `getItemsForPortfolio`, recurses into items that are portfolios, and
  collects items that are projects. A portfolio is read once however it is reached, so a cycle ends,
  and a project reachable twice is listed once.

### Failure statuses

Two failures are told apart by `error.code`, and both are stable:

| Code | When | Exit |
|---|---|---|
| `scope-unknown` | `--scope` names a scope that is not configured; `options` lists the ones that are | 2 |
| `scope-missing` | no `--scope`, no default scope, and no default project to stand in | 2 |

Both exit 2, the code for a command the caller can fix and retry. They are `kind: config` errors with
`code`, `options`, and `hint`, in the CLI body and in the MCP error alike.

## Sprints

### Identity

Sprint identity is computed from the policy and never typed in: `sprint_anchor_date` is the first
day of sprint 1, sprints follow each other in blocks of `sprint_length_days`, the name comes from
`sprint_name_format` (`{n}`, `{start}`, `{end}`, `{year}`), and `working_days` counts the weekdays a
sprint holds. A scope's overrides apply first. A date before the anchor is in no sprint. With no
anchor the commands stop with `policy-incomplete`.

"Today" is the date in the timezone `user me` reports (D11). Asana's public API returns no user
timezone at the time of writing, so the machine's timezone stands in, and `sprint current` reports
which one it used as `timezone_source` (`asana` or `machine`). A zone name that does not parse is
treated as absent.

`--sprint` takes `current` (default), `next`, `previous`, a number, or a name the format writes; any
other text is `sprint-unknown`. `previous` of sprint 1 is `sprint-none`.

### The `sections` model

- A sprint is a section named by the computed name in each project of the scope. The backlog is every
  incomplete task in a section that does not match `sprint_name_format` (the policy's
  `backlog_section` is one of them), in each project's order, each task once, minus any task a sprint
  section of another project holds. It reads sections and their tasks only, so it works on a free
  workspace. Scope kinds `project` and `projects` only; a `portfolio` scope is `model-unsupported`.
- `sprint current` needs the sprint's section in at least one project, else `sprint-none` with the
  `sprint start` command to run. `tasks`, `add`, and `close` need the same.
- `sprint start` creates the section in each project that lacks it; when none lacks it, it changes
  nothing and reports `already_started`. `sprint add` moves each task into the sprint's section of
  each scope project the task is in; a task already there is `already_in_sprint`, and a task in none
  of the scope's projects is `outside_scope`. `sprint close` follows the policy's `carry_over`: `move`
  puts each incomplete task in the next sprint's section, created when missing; `leave` moves nothing
  and lists what stayed; no incomplete task means nothing happens. All three can be repeated safely.
- `sprint list` shows the sprints that have a section in the scope plus the current one, each `past`,
  `current`, or `future`.
- A scope whose `sprint_model` is not built into the CLI stops with `model-unsupported`, naming the
  model and the built-in options. An agent then follows that model's `cyber-asana.sprint-model.<key>`
  reference with its primitive commands. `cyber-asana.sprint-model.interface` (cardinality `many`)
  declares the sections each model fills; `cyber-asana.sprint-model.sections` implements it, and
  `reference check` accepts both.
- Every sprint command has an `asana_sprint_*` MCP tool (`backlog list` is `asana_backlog_list`)
  through the same `api.ts`.

### Failure statuses

| Code | When | Exit |
|---|---|---|
| `sprint-none` | today is before the anchor, there is no previous sprint, or the sprint has no section in any project | 2 |
| `sprint-unknown` | `--sprint` names no sprint | 2 |
| `model-unsupported` | the scope's model is not built in, or the scope kind does not suit the model | 2 |
| `policy-incomplete` | `sprint_anchor_date` is not set | 2 |
| `team-unsupported` | `report standup --team`, until the team scope is built | 2 |

## Reports

Every report is `cyber-asana report <key>` with an `asana_report_<key>` tool, through the same
`api.ts`. The CLI computes and the skill narrates; the layout is a `cyber-asana.report.<key>`
reference that implements `cyber-asana.report`.

### Standup

`report standup` (`--me` default, `--member <gid-or-email>`, `--scope`, `--sprint`) returns, for one
member:

- **Done** — tasks completed within `standup_window`, a true completed filter. The window opens at
  midnight, in the user's timezone, of the previous working day (skipping days not in
  `working_days`) or of the day `<n>d` back, and runs to now.
- **Today** — incomplete tasks in the current sprint that are in progress, due today, or overdue. When
  no workflow state is carried (`state_carrier` is `none`, or `field` with no registered `status`
  field) Today is every incomplete assigned task in the sprint, and `notes` says so.
- **Blocked** — incomplete tasks in the current sprint that a `blocked_signals` entry marks, each with
  its blocker: the incomplete dependency, the tag, or the state. Tasks outside the sprint are not
  listed (D14).
- Story points and task points are totalled apart, per section, and shown only for fields the scope's
  projects register.

With no current sprint (no `sprint_anchor_date`, today before it, or no section for the sprint) the
report carries on without sprint filters, and `sprint_note` says why (D12). A sprint named with
`--sprint` that has no section is `sprint-none`. `--team` is `team-unsupported` (exit 2) until the team
scope is built.

## Scenario map

See [scrum.feature](scrum.feature).
