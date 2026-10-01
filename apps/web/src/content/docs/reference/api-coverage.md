---
title: API Coverage
description: What cyber-asana supports compared to the Asana REST API, resource by resource.
---

cyber-asana is a curated wrapper, not a 1:1 mirror of the
[Asana REST API](https://developers.asana.com/reference/rest-api-reference). It covers the
operations that agents and humans reach for daily — tasks, projects, sections, comments,
tags, goals, portfolios — and deliberately leaves out admin, billing, and enterprise
surfaces.

Every operation below is reachable from both the CLI and the MCP server; they share the
same core, so nothing is CLI-only or MCP-only. For how the MCP server compares to Asana's
own, see [cyber-asana vs official Asana MCP](/cyber-asana/reference/mcp-comparison/).

:::note
Coverage is measured against the `asana` npm SDK v3.2.0, which is generated from the
public REST API spec. Counts exclude duplicate SDK aliases (e.g. `createTag` vs
`createTagForWorkspace`).
:::

## Coverage at a glance

Asana documents **49 resource groups**. cyber-asana wraps **25** of them. A resource is
fully covered only when every distinct REST operation in its SDK group is available; helper
operations such as project export and TODO scanning are described separately below.

| Legend | Meaning |
| --- | --- |
| ✅ | Fully covered |
| 🟡 | Partially covered |
| ❌ | Not wrapped |

### Covered resources

| Resource | Status | Ops | CLI namespace | Notes |
| --- | --- | --- | --- | --- |
| Tasks | 🟡 | 25 / 27 | `task` | Missing duplicate and custom-ID lookup |
| Status updates | ✅ | 4 / 4 | `status` | Complete |
| Rules | ✅ | 1 / 1 | `rule` | Complete — the whole Rules API is one trigger method (beta) |
| Events | ✅ | 1 / 1 | `event` | Complete; sync-token change feed, not paginated |
| Typeahead | ✅ | 1 / 1 | `search` | Complete; one resource type per call, single capped page |
| Tags | ✅ | 6 / 6 | `tag` | Complete, including task↔tag links |
| Task templates | 🟡 | 3 / 4 | `task-template` | Read plus instantiate; no template deletion |
| Attachments | ✅ | 4 / 4 | `attachment` | List, get, upload (file or external URL), and delete |
| Memberships | ✅ | 5 / 5 | `membership` | Complete; the unified endpoint covering project, portfolio, and goal memberships |
| Ooo entries | ✅ | 5 / 5 | `ooo` | Complete |
| AI Studio usage | ✅ | 2 / 2 | `ai-studio` | Runs and seats; Asana limits both to service accounts in AI Studio-licensed organizations |
| Jobs | ✅ | 1 / 1 | `job` | Complete; reads the async jobs other operations return |
| Project templates | 🟡 | 4 / 5 | `project-template` | List, get, and instantiate; no template deletion |
| Sections | ✅ | 7 / 7 | `section` | Complete, including section reordering and section-scoped task placement |
| Portfolios | 🟡 | 6 / 13 | `portfolio` | CRUD + item listing; members are managed under `membership` |
| Projects | 🟡 | 7 / 20 | `project` | CRUD, counts, search. Templates have their own row; members are managed under `membership` |
| Goals | 🟡 | 5 / 12 | `goal` | CRUD only; no metrics or followers |
| Users | 🟡 | 3 / 8 | `user` | Read-only |
| Teams | 🟡 | 2 / 7 | `team` | Read-only |
| Workspaces | 🟡 | 2 / 6 | `workspace` | Read-only |
| Stories | 🟡 | 5 / 7 | `story`, `comment` | Full comment lifecycle on tasks; no goal stories |
| Custom fields | 🟡 | 2 / 8 | `custom-field` | Read-only discovery; no field or enum-option authoring |
| Custom field settings | ✅ | 4 / 4 | `custom-field` | All four reads; attaching a field is administration and stays out |
| User task lists | 🟡 | — | `task my-tasks` | Only the "My Tasks" read path |
| Batch API | 🟡 | — | `task get-many` | Used internally, not exposed generically |

### Not wrapped

Access requests, Agents, Allocations, Audit log, Budgets, Custom types,
Exports, Goal relationships, Organization exports, Project briefs,
Project portfolio settings, Project statuses (superseded by Status updates),
Rates, Reactions, Roles, Team memberships†, Time periods, Time tracking
categories, Time tracking entries, Timesheet approval statuses, Webhooks,
Workspace memberships.

† **Team memberships** — who belongs to a team — stay on this list. Asana's unified
Memberships endpoint, which `membership` wraps, takes projects, portfolios, goals, custom
types, and custom fields as the parent; a team can be a *member* there, but team rosters
themselves are a separate resource.

For anything on this list, call the Asana API directly — cyber-asana does not proxy
arbitrary endpoints.

## Operation-level mapping

### Tasks

| Asana operation | CLI | MCP tool |
| --- | --- | --- |
| List tasks (project / section / workspace) | `task list` | `asana_task_list` |
| Get a task | `task get <gid>` | `asana_task_get` |
| Get many tasks by GID | `task get-many <gids...>` | `asana_task_get_many` |
| Search tasks in a workspace | `task search [text]` | `asana_task_search` |
| Get My Tasks | `task my-tasks list` | `asana_task_my_tasks` |
| Create a task | `task create <name>` | `asana_task_create` |
| Update a task (incl. reparent) | `task update <gid>` | `asana_task_update` |
| Delete a task | `task delete <gid>` | `asana_task_delete` |
| List subtasks | `task subtask list <gid>` | `asana_task_subtask_list` |
| Create a subtask | `task subtask create <gid> <name>` | `asana_task_subtask_create` |
| Add / remove project | `task project add\|remove` | `asana_task_project_add` / `_remove` |
| Add / remove followers | `task follower add\|remove` | `asana_task_follower_add` / `_remove` |
| List / add / remove dependencies | `task dependency list\|add\|remove` | `asana_task_dependency_*` |
| List / add / remove dependents | `task dependent list\|add\|remove` | `asana_task_dependent_*` |

Not covered: `POST /tasks/{gid}/duplicate`, `GET /tasks/custom_id/{id}`.

### Task templates

| Asana operation | CLI | MCP tool |
| --- | --- | --- |
| List task templates in a project | `task-template list` | `asana_task_template_list` |
| Get a task template | `task-template get <gid>` | `asana_task_template_get` |
| Instantiate a task from a template | `task-template instantiate <gid>` | `asana_task_template_instantiate` |

Instantiation returns a job rather than the task; both surfaces poll it briefly and hand
back the job with its `new_task` once it succeeds. That job can also be read directly with
`job get` (see below).

Not covered: `DELETE /task_templates/{gid}` — cyber-asana wraps using templates, not
managing them.

### Projects

| Asana operation | CLI | MCP tool |
| --- | --- | --- |
| List projects in a workspace | `project list` | `asana_project_list` |
| Get a project | `project get <gid>` | `asana_project_get` |
| Task counts | `project counts <gid>` | `asana_project_counts` |
| Search projects | `project search [text]` | `asana_project_search` |
| Create / update / delete | `project create\|update\|delete` | `asana_project_create` / `_update` / `_delete` |

Not covered: members, followers, attaching or detaching a custom field, duplicate,
save-as-template, and the team-scoped create/list variants. Reading a project's attached
custom fields is covered — see `custom-field project` below.

### Project templates and jobs

| Asana operation | CLI | MCP tool |
| --- | --- | --- |
| List project templates (workspace or team) | `project-template list` | `asana_project_template_list` |
| Get a project template | `project-template get <gid>` | `asana_project_template_get` |
| Instantiate a project from a template | `project-template instantiate <gid>` | `asana_project_template_instantiate` |
| Get a job | `job get <gid>` | `asana_job_get` |

Instantiation is asynchronous: Asana returns a job, not a project. The CLI and the MCP tool
wait for that job by default and hand back the new project's GID, under a bounded timeout
(`--timeout` / `timeout_seconds`, default 60 seconds); `--no-wait` / `wait: false` returns the
job GID for callers that would rather poll `job get` themselves. A failed job surfaces as an
error rather than a success with no project.

Not covered: `DELETE /project_templates/{gid}` — managing templates is a different act from
using one.

### Sections, tags, goals, portfolios, status updates, comments, memberships, out-of-office entries

| Resource | CLI | MCP tools |
| --- | --- | --- |
| Sections | `section list\|get\|create\|update\|move\|delete`, `section task add` | `asana_section_*` |
| Tags | `tag list\|get\|create\|update\|delete`, `tag task list\|add\|remove`, `tag tasks` | `asana_tag_*` |
| Goals | `goal list\|get\|create\|update\|delete` | `asana_goal_*` |
| Portfolios | `portfolio list\|items\|get\|create\|update\|delete` | `asana_portfolio_*` |
| Status updates | `status list\|get\|create\|delete` | `asana_status_*` |
| Stories / comments | `story list\|get\|create\|update\|delete`, same under `comment` | `asana_story_*`, `asana_comment_*` |
| Memberships | `membership list\|get\|create\|update\|delete` | `asana_membership_*` |
| Ooo entries | `ooo list\|get\|create\|update\|delete` | `asana_ooo_*` |
| AI Studio usage | `ai-studio runs\|seats` | `asana_ai_studio_*` |

Asana only allows editing and deleting comment stories you authored — system stories
(assignee changed, due date set) are immutable, and an attempt to change one comes back as
a `403` carrying that explanation as a hint.

`ooo list` is scoped to one user and one workspace, as Asana requires. Both the CLI and
the MCP tool default the user to the authenticated one, so an unscoped call reads your own
calendar rather than failing on a missing GID.

### Rules

| Asana operation | CLI | MCP tool |
| --- | --- | --- |
| Trigger a rule | `rule trigger <rule-trigger-gid>` | `asana_rule_trigger` |

The rule must be configured in Asana with an **incoming web request** trigger. Asana
generates the `rule_trigger_gid` there and it can only be copied out of the Asana UI —
no API call discovers or lists it. Asana documents the endpoint as beta, with `task` the
only supported resource type, and answers `402` when the workspace plan does not include
the operation.

### Events

| Asana operation | CLI | MCP tool |
| --- | --- | --- |
| Get events on a resource | `event list <resource-gid>` | `asana_event_list` |

The change feed is cursored by a sync token rather than an offset, so it takes neither the
shared pagination options nor `--all`. A call with no token (or an expired one) returns a
fresh token and `sync_reset: true` instead of events — Asana's documented "start here"
handshake, surfaced as a normal result rather than a `412`. See
[Events](/cyber-asana/cli/events/).

### Read-only resources

| Resource | CLI | MCP tools |
| --- | --- | --- |
| Users | `user list\|get\|me` | `asana_user_list`, `asana_user_get`, `asana_user_me` |
| Teams | `team list\|get` | `asana_team_list`, `asana_team_get` |
| Workspaces | `workspace list\|get` | `asana_workspace_list`, `asana_workspace_get` |
| Attachments | `attachment list\|get\|create\|delete` | `asana_attachment_list`, `asana_attachment_get`, `asana_attachment_create`, `asana_attachment_delete` |
| Custom fields | `custom-field list\|get` | `asana_custom_field_list`, `asana_custom_field_get` |
| Custom field settings | `custom-field project\|portfolio\|goal\|team` | `asana_custom_field_list_for_*` |

Custom fields are read-only here by design: `custom-field list` and `custom-field get`
exist so the GIDs that `task create` / `task update` require in `--custom-field` and
`--custom-fields-json` are discoverable — `get` returns the field's `enum_options` and
their GIDs. Defining or editing fields is workspace administration and is not wrapped.

`custom-field project <gid>` is the narrower half of the same question: the fields
actually attached to that project, with their enum options, which is what Asana will
accept in a `custom_fields` payload there. `portfolio`, `goal`, and `team` cover the other
three parents. Attaching or detaching a field lives on the Projects API and is
administration, so it stays out.

## What cyber-asana adds on top

These have no REST equivalent — they exist only in cyber-asana:

- **Project export to Markdown** — `project export <gid>` / `asana_project_export`
  renders a project and its tasks as a Markdown document.
- **Status roll-up** — `status overview <gid>` / `asana_status_overview` collapses a
  project's or portfolio's latest status and task counts into one call, rolling up per item
  for a portfolio. Asana has no such endpoint; it composes existing ones.
- **TODO scanning** — `task scan-todos [dir]` / `asana_task_scan_todos` walks a codebase
  for `TODO`/`FIXME` comments and turns them into task drafts.
- **Comment templates** — `comment create` interpolates `{task.name}`, `{task.assignee}`,
  `{task.due_on}`, and `{task.notes}` against the target task.
- **Auto-pagination** — every list endpoint accepts `--all` / `fetchAll` and follows
  `next_page` up to `maxPages` (default 10) instead of making you thread cursors.
- **Token-efficient output** — `--toon` (or `CYBER_ASANA_MCP_FORMAT=toon`) emits TOON;
  `--json` emits raw JSON; text mode is the default.
- **Truncation with `--full`** — long free-text fields (notes, comment bodies) are
  truncated with a size hint unless you ask for everything.
- **Minimal default field sets** — list commands request 3–4 `opt_fields` by default
  rather than the full object, so responses stay small.
- **Structured errors and exit codes** — Asana failures surface as typed errors with
  meaningful process exit codes; usage errors exit `2`.
- **OAuth login** — `cyber-asana auth login` authorizes in the browser and stores
  credentials locally, as an alternative to passing a personal access token on every call.
- **Repo project registry** — `.agents/cyber-asana.json` maps a repository to its default
  workspace and project, so commands can omit `--workspace`/`--project`.
- **Asana URL parsing** — task and project URLs are accepted anywhere a GID is.

## Requesting coverage

If you need a resource from the "not wrapped" list, open an issue on
[GitHub](https://github.com/cyberuni/cyber-asana/issues) describing the workflow — the
wrapper is intentionally curated, so new surfaces are added when there is a concrete use
case behind them.
