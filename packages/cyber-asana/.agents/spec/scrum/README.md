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
`sprint_length_days`, and `sprint_anchor_date`. Three more optional keys name the Asana objects of the
`project` sprint model: `backlog_project`, `sprint_portfolio`, and `sprint_template`.

| Kind | Members | Resolves to |
|---|---|---|
| `project` | exactly one project GID | that project |
| `projects` | one or more project GIDs | those projects; a task homed in two of them counts once |
| `portfolio` | one portfolio GID | the portfolio's projects, following nested portfolios |
| `team` | one team GID | the team's unarchived projects, and the team's members as the scope's people |

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
- A `team` scope reads `getProjectsForTeam` (archived projects left out, every page) for its projects
  and `getTeamMembershipsForTeam` for its people: the team's members, each once by user GID,
  including members who have no task yet. `scrum scope resolve` returns them as `people`; other kinds
  return no `people`, because their people are the assignees seen. A team scope is a multi-project
  scope, so its sprint model must support that: the `sections` model does not (below).

- `team members <gid>` (`asana_team_members`) lists a team's memberships, each with its user, and
  `team projects <gid>` (`asana_team_projects`) lists its projects (`--archived` keeps only archived
  ones; unset returns both). They page like every other list: `--limit`, `--offset`, `--all`, and an
  empty result says `0 team members found` or `0 projects found`. The `teams` spec node is frozen
  and covers `team list | get` only; these two reads exist for the `team` scope and are specified here.

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
  workspace. Scope kinds `project` and `projects` only; a `portfolio` or `team` scope is `model-unsupported`, because a sprint start would create a section in every project a portfolio or team holds.
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

### The `custom-field` model

- A sprint is an option, named by the computed name, of the one `Sprint` enum field the scope's
  projects share. The field comes from the `sprint` field role in repo config, else from the
  project's custom field settings by name (`Sprint` or `Iteration`, enum). No project with the field
  is `sprint-field-missing`; two different fields in one scope is `sprint-field-ambiguous`. Every
  scope kind works.
- A sprint "exists" when the field has an enabled option of that name. `sprint current`, `tasks`,
  `add`, and `close` need it, else `sprint-none` naming an option (not a section).
- `sprint tasks` and `backlog list` use task search. A sprint's tasks are those whose Sprint value is
  the option; the backlog is incomplete tasks whose Sprint field is unset. Search pages past 100
  results by sorting on `created_at`. A `402` from Asana is `premium-required`, which names the model,
  and exits 7 like any other plan limitation.
- `sprint start` creates the option; when it exists, nothing changes and the result is
  `already_started`. `sprint add` sets the task's field to the option; a task already holding it is
  `already_in_sprint`, and a task none of whose projects has the field is `outside_scope`.
  `sprint close` follows `carry_over`: `move` sets each incomplete task's field to the next sprint's
  option, created when missing; `leave` changes nothing. All three can be repeated safely.
- `backlog list` has no backlog section: it reports no missing `backlog_section`.
### The `project` model

- A sprint is a project, named by the computed name, in a portfolio. The scope names the **backlog
  project** (`backlog_project`, or a `project` scope's own project) and the **sprint portfolio**
  (`sprint_portfolio`, or a `portfolio` scope's own portfolio); a scope that lacks either is
  `scope-incomplete` (exit 2) naming what is missing. Every scope kind works once both are known.
  Only the portfolio's projects whose names match `sprint_name_format` are sprints; the backlog project
  is never one.
- A sprint "exists" when the portfolio holds such a project. `sprint current`, `tasks`, `add`, and
  `close` need it, else `sprint-none` naming a project. `section_gid` in `sprint current` is the sprint
  project's GID.
- `sprint tasks` lists the sprint project's tasks. The backlog is the backlog project's incomplete
  tasks that no sprint project holds. Neither uses task search, so reading works on a free plan;
  portfolios are the one paid piece.
- `sprint start` creates the project and adds it to the portfolio: it duplicates the scope's
  `sprint_template` when set, else creates a plain project in the backlog project's workspace and team.
  It reports the new project as `sprint_project`. When the project exists it changes nothing and reports
  `already_started`. `sprint add` multi-homes a backlog task into the sprint project (the task stays in
  the backlog project); a task already in it is `already_in_sprint`, and a task not in the backlog
  project is `outside_scope`. `sprint close` follows `carry_over`: `move` starts the next sprint's
  project when missing, adds each incomplete task to it, then removes the task from the closed sprint's
  project, so a task is in one sprint at a time; `leave` changes nothing. The closed project is not
  archived. All three can be repeated safely.
- `state_carrier: sections` is allowed with this model, as with `custom-field`. Reports do not read
  sections as workflow states, so they fall back to completion and assignment and say so in `notes`.
- `backlog list` has no backlog section: it reports no missing `backlog_section`.

- A scope whose `sprint_model` is not built into the CLI stops with `model-unsupported`, naming the
  model and the built-in options. An agent then follows that model's `cyber-asana.sprint-model.<key>`
  reference with its primitive commands. `cyber-asana.sprint-model.interface` (cardinality `many`)
  declares the sections each model fills; `cyber-asana.sprint-model.sections` and
  `cyber-asana.sprint-model.custom-field`, and `cyber-asana.sprint-model.project` implement it, and
  `reference check` accepts all four.
- Every sprint command has an `asana_sprint_*` MCP tool (`backlog list` is `asana_backlog_list`)
  through the same `api.ts`.

### Failure statuses

| Code | When | Exit |
|---|---|---|
| `sprint-none` | today is before the anchor, there is no previous sprint, or the sprint has no section in any project | 2 |
| `sprint-unknown` | `--sprint` names no sprint | 2 |
| `model-unsupported` | the scope's model is not built in, or the scope kind does not suit the model | 2 |
| `policy-incomplete` | `sprint_anchor_date` is not set | 2 |
| `window-invalid` | `report workload` with only one of `--from` and `--to`, a malformed date, or `from` after `to` | 2 |
| `sprint-field-missing` | the `custom-field` model finds no Sprint field on the scope's projects | 2 |
| `sprint-field-ambiguous` | the scope's projects use more than one Sprint field | 2 |
| `scope-incomplete` | the `project` model's scope names no backlog project or no sprint portfolio | 2 |
| `premium-required` | the `custom-field` model needs task search and Asana answered 402 | 7 |

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
`--sprint` that has no section is `sprint-none`.

`--team` runs the same report for every person of the scope and groups it by person: `members[]`, each
with `member` (`gid`, `name`) and that person's `done`, `today`, and `blocked`, plus `count.members`.
The people are a `team` scope's members (including those with no task yet, in the team's order), else
the assignees seen in the scope's tasks, ordered by name; unassigned tasks belong to no one. The
basis (`today_basis`), `points_tracked`, and `notes` hold for everyone, so they appear once. A scope
with no one to report on has `members: []`, and the text output says `0 members found`. `--team`
conflicts with `--me` and `--member` as a usage error.

### Health

`report health` (`--scope`, `--sprint`) runs one result per check named in the `checks` key of the
`cyber-asana.report.health` reference (default: all eleven) over the sprint's tasks. Each finding has
a level, the task, and a fix command. Thresholds are that reference's frontmatter: `stale_days` (3),
`wip_limit` (3), `overdue_grace_days` (0).

| Check | Finds | Level |
|---|---|---|
| H1 | an incomplete sprint task with no estimate, parents excluded | warning |
| H2 | a task with subtasks that carries points | warning |
| H3 | an incomplete sprint task with no assignee | warning |
| H4 | an incomplete sprint task due more than `overdue_grace_days` ago | error |
| H5 | an in-progress task unchanged for `stale_days` | warning |
| H6 | a person with more than `wip_limit` tasks in progress (one finding per person) | warning |
| H7 | a sprint task a `blocked_signals` entry marks | warning |
| H8 | the sprint over capacity | error |
| H9 | the sprint has no section in a project of the scope (one finding per project) | error |
| H10 | an incomplete task in a sprint older than today's | warning |
| H11 | an incomplete task in two or more sprints | error |

- **In progress** is the policy's `in_progress` state read from the `status` field when
  `state_carrier` is `field` and the scope registers one; otherwise every incomplete assigned sprint
  task, and `notes` says so (§ 4.3).
- **H8 reads the workload.** Capacity comes from Allocations only (D4). The sprint's open tasks are
  loaded against the capacity for the sprint's dates exactly as `report workload` does, and each
  person over `over_allocation_pct` is one error finding (fix: `report workload`). Allocations are
  read only when H8 is enabled. When Asana answers 402, or no allocation overlaps the sprint, H8 is
  `skipped` with a reason beginning `capacity unknown`, never passed; people with unknown capacity
  beside known ones are named in `notes`. A check that needs the sprint's tasks, or a points field,
  is skipped with its reason when they are missing.
- **H9 wins over `sprint-none`.** When today's sprint has no section in any project and H9 is
  enabled, the report runs: H9 reports it and the checks that read the sprint's tasks are skipped
  (D12 holds for every other cause). With H9 not enabled it fails with `sprint-none`. A sprint
  that has not begun (today before the anchor) is `sprint-none`, and an unset anchor is
  `policy-incomplete`, whatever `checks` says: there is no sprint to be missing.
- A report that ran exits 0 however many findings it holds; `counts` carries the result.

### Workload

`report workload` (`--scope`, `--sprint`, or `--from` with `--to`, and `--workspace`) shows, per
person, the load of their incomplete assigned tasks against capacity. Thresholds are the
`cyber-asana.report.workload` frontmatter: `over_allocation_pct` (100) and `under_allocation_pct`
(60).

- **Window.** The current sprint's dates by default, with the sprint's incomplete tasks, so a sprint
  with no section is `sprint-none` (D12). `--from` and `--to` replace the sprint: the scope's
  incomplete assigned tasks whose due date lies inside the window; tasks with no due date are left
  out and `notes` counts them. `--sprint` conflicts with them, and giving only one of the two is
  `window-invalid`. A window needs no anchor date.
- **Load.** Story points and task points are summed apart. Effort hours are each kind times
  `hours_per_point`, with both parts and their total shown. Completed tasks and unassigned tasks
  count for no one; the unassigned are counted in `unassigned_tasks`.
- **Capacity (D4)** comes only from `AllocationsApi.getAllocations`, read once per project of the
  scope (`parent`), clipped to the window. A percent allocation is `percent × working_hours_per_day ×
  the working days inside the window`. An hours allocation is its hours as given when it lies inside
  the window, and in proportion to the working days inside when it extends past. A person's capacity
  is the sum over their allocations that overlap the window.
- **Unknown capacity.** Asana answering 402 makes every person's capacity unknown with reason `plan`;
  a person with no overlapping allocation is unknown with reason `no-allocation`. The load still
  shows, no flag is drawn (`unknown`), and `notes` names the plan limit. Any other allocation error
  is an error. The team's `capacity_hours` and `utilization_pct` count only people whose capacity is
  known, and `capacity_unknown` says how many are not.
- **Utilization and flags.** Utilization is effort hours over capacity hours, as a percentage to one
  decimal. Above `over_allocation_pct` is `over`, below `under_allocation_pct` is `under`, otherwise
  `ok`. A person with allocations and no tasks is listed, at 0% and `under`.
- **Out of office (D9).** `ooo list` entries overlapping the window appear as `ooo` beside a person's
  capacity and are never subtracted from it. Without a workspace (`--workspace` or
  `ASANA_WORKSPACE_GID`), or when the read fails, the report says so in `notes` and carries on.
- A report that ran exits 0 whatever it found.
### The commitment snapshot

`sprint start --snapshot` (and `asana_sprint_start` with `snapshot`) posts, on each project of the scope
that holds the sprint's section, a status update titled `<sprint> started` (`status_type` `on_track`).
Its text carries a marker line with the sprint index, a count line, and one line per task: GID, story
points, task points, name. A project that already has a snapshot for the sprint is left alone, so the
command is idempotent. The snapshot is posted after the sprint is filled; the first one posted for a
sprint is its commitment, since Asana cannot edit a status update (D6). Without `--snapshot`, `sprint
start` does not touch status updates.

### Sprint review, retro, and velocity

`report sprint`, `report retro`, and `report velocity` (`--scope`; `--sprint` on the first two)
compute from the sprint's tasks, its commitment, and, for the retro, each task's system stories.

- **Commitment.** From the snapshot when one exists (`source: snapshot`). Otherwise rebuilt from each
  task's "moved to the sprint" story: a task that joined by the end of the sprint's first day, in the
  user's timezone, was committed (`source: rebuilt`). Tasks removed from the sprint cannot be found
  that way, so `removed` is `null`. With no history at all, `source` is `unavailable`. Each case adds
  a note. Points in a rebuild are as they are now.
- **Sprint review (R2).** Committed, completed, added (in the sprint now, not committed), and removed
  (committed, gone now); completion rate by count and by each kind of points, against everything in the
  sprint now, `null` where nothing was planned; carry-over candidates (incomplete tasks); a daily
  burndown from `completed_at` up to today; and the completed stories for the demo (completed tasks
  with story points, or every completed task when no story points are tracked).
- **Retro (R3).** Carry-over, scope change, blocked tasks and hours, cycle time (`completed_at` minus
  `created_at`, mean and median), and estimate against actual: the points committed in the snapshot
  against the points the finished task carries now (task-conventions records actuals over the
  estimate). Without a snapshot the estimate comparison is `null` and a note says why.
- **Blocked time is best effort (G14).** It reads system stories by `resource_subtype`: a dependency
  added until removed or completed, a tag added until removed. The values are Asana's documented ones,
  held in `reports/stories.ts` and probed by a system test; a `state:<x>` signal leaves no story the
  report reads. When no story shows a block, `notes` says no block time is reported.
- **Velocity (R4).** The points each of the last `velocity_window` closed sprints completed (completed
  by the end of its last day), story and task apart, and their mean. Fewer closed sprints than the
  window gives a note.
- A sprint without a section is `sprint-none` (D12). Points are never merged into one figure.

### Dashboard

`report dashboard` (`--scope`, `--sprint`; D2.1) runs the reports the `cyber-asana.dashboard`
reference lists in `reports` (default `sprint, health, workload, velocity`), in that order, into one
result.

- **Reports are found through `implementations cyber-asana.report`.** The CLI computes the six it
  ships (`standup`, `sprint`, `retro`, `velocity`, `health`, `workload`). A listed report it does not
  compute, such as a repo's `cyber-asana.report.release-readiness`, is an entry with `status:
  unsupported`, its `reason`, and its `reference` when an implementation exists. A key no
  implementation ships is unsupported too. No listed report is dropped.
- **A failure is recorded, not fatal.** A report that fails with a coded configuration status
  (`sprint-none`, `policy-incomplete`, `model-unsupported`, `premium-required`) is an entry with
  `status: failed` and its `error.code`; the rest still run. A scope that cannot be selected
  (`scope-missing`, `scope-unknown`) fails the command, and so does anything that is not a coded
  status. The command exits 0 once it has built the dashboard.
- **`status_type`** is graded from the health findings by `status_rules`: `off_track` when a finding
  reaches the level `off_track` names (default `error`), else `at_risk` at the level `at_risk` names
  (default `warning`), else `otherwise` (default `on_track`). It is `null`, with `status_basis`
  saying so, when the health report is not listed or did not run. U13 posts it.
- **Settings** are the frontmatter of `cyber-asana.dashboard`. A bad value throws, as the policy's
  does. `forms` and `status_parent` are read and validated now and used by U13 and U14.

### Planning arithmetic

`sprint plan` (`--scope`, `--sprint`, default `next`; `--tasks`) is read only. It combines the mean
of the last `velocity_window` closed sprints, the Allocations capacity hours for the sprint's dates
(the workload computation with no tasks), and the backlog in priority order.

- **Limits.** Story points and task points each against their own velocity mean (a kind that is not
  tracked has none); effort hours (both kinds times `hours_per_point`) against capacity hours. A
  limit that cannot be known is `null` and not applied. Capacity unknown carries its reason (`plan`
  or `no-allocation`).
- **Proposal.** The backlog top in order, stopping at the first task whose running total overruns a
  limit (`stopped_before`, naming the limits); it never skips ahead. With no limit at all the
  proposal is empty and a note says there is nothing to fit against.
- **Selection.** `--tasks` totals the tasks the user picked and compares each total with its limit
  (`fits`); a GID outside the backlog is `not_in_backlog`.
- The sprint needs no section: planning comes before `sprint start`.

## Scenario map

See [scrum.feature](scrum.feature).
