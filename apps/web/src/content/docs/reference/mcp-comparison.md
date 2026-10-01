---
title: cyber-asana vs official Asana MCP
description: How the cyber-asana MCP server compares to Asana's official MCP server, tool by tool.
---

Asana ships an [official MCP server](https://developers.asana.com/docs/mcp-tools-reference)
(hosted, OAuth) alongside which cyber-asana runs its own local MCP server. They are not
competitors — tool names do not collide, and running **both** in the same host is the
intended setup. The MCP server is opt-in: the cyber-asana plugin does not start it (see [CLI vs MCP](/cyber-asana/reference/cli-vs-mcp/)). This page shows what each one covers so you know which to reach for.

:::note
Compared against Asana's documented MCP tools reference (27 tools). The official server
also exposes undocumented internal/widget tools in some hosts; those are out of scope.
:::

## At a glance

| | Official Asana MCP | cyber-asana MCP |
| --- | --- | --- |
| Tools | 27 | 105 |
| Transport | Hosted remote (`https://mcp.asana.com/v2/mcp`) | Local stdio (`cyber-asana mcp`) |
| Auth | OAuth 2.0 (hosted, an **MCP app** you register) | Personal access token, or OAuth 2.0 + PKCE via `cyber-asana auth login` (your own **API app**) |
| Config key | `asana` | `cyber-asana` |
| Backing surface | Asana's MCP-native V2 API | Asana REST API |
| Output | JSON | JSON, or TOON via `CYBER_ASANA_MCP_FORMAT=toon` |
| Also available as a CLI | No | Yes — same core, same operations |

**Overlap: 21 tool pairs. Official-only: 6. cyber-asana-only: 84.**

## What only the official server has

These are routed to the official server by design. cyber-asana's remit is write-heavy REST
automation; discovery, preview-then-confirm flows, and preview APIs stay where they already
work. The exception is made when the REST cost turns out to be trivial — the reasoning for
each is below, so you can tell a deliberate boundary from an oversight.

| Official tool | What it does | cyber-asana alternative |
| --- | --- | --- |
| `search_tasks_preview` | Preview a task search before running it | None by design — a host-UX confirm flow, not an API capability |
| `create_task_preview` | Interactive preview of a task before creating it | None by design — same reason; `asana_task_create` writes directly |
| `create_project_preview` | Interactive preview of a project before creating it | None by design — same reason; `asana_project_create` writes directly |
| `get_agent` | Fetch an Asana AI agent | None while Asana's agent endpoints stay early-access and require an opt-in header |
| `get_workspace_agents` | List a workspace's AI agents | Same — though `asana_search_objects` covers basic discovery via typeahead's `agent` / `actor` types |
| `get_status_overview` | Aggregated status report across projects and portfolios — task summaries and flagged blockers, found by its own keyword search | None for the search half. Once you know the GID, `asana_status_overview` rolls up the latest status and task counts for a project or portfolio in one call — deterministic and parent-scoped, with no keyword search and no blocker flagging |

If your workflow depends on preview-then-confirm flows, Asana AI agents, or searched
status reporting, keep the official server installed.

## What both servers cover

21 pairs overlap. Use whichever server is already loaded — ✅ means the two are equivalent
for everyday use, 🟡 means the scope differs (explained under the table).

| Capability | Official | cyber-asana | Match |
| --- | --- | --- | --- |
| Get a task | `get_task` | `asana_task_get` | ✅ |
| List tasks | `get_tasks` | `asana_task_list` | ✅ |
| My Tasks | `get_my_tasks` | `asana_task_my_tasks` | ✅ |
| Search tasks | `search_tasks` | `asana_task_search` | ✅ |
| Create a task | `create_tasks` | `asana_task_create` | ✅ |
| Update a task | `update_tasks` | `asana_task_update` | ✅ |
| Delete a task | `delete_task` | `asana_task_delete` | ✅ |
| Comment on a task | `add_comment` | `asana_comment_create` | ✅ |
| Get a project | `get_project` | `asana_project_get` | ✅ |
| List projects | `get_projects` | `asana_project_list` | ✅ |
| Create a project | `create_project` | `asana_project_create` | ✅ |
| Get a portfolio | `get_portfolio` | `asana_portfolio_get` | ✅ |
| List portfolios | `get_portfolios` | `asana_portfolio_list` | ✅ |
| List portfolio items | `get_items_for_portfolio` | `asana_portfolio_item_list` | ✅ |
| Get a user | `get_user` | `asana_user_get` | ✅ |
| Get the current user | `get_me` | `asana_user_me` | ✅ |
| List users | `get_users` | `asana_user_list` | ✅ |
| List teams | `get_teams` | `asana_team_list` | ✅ |
| Create a status update | `create_project_status_update` | `asana_status_create` | 🟡 |
| List attachments | `get_attachments` | `asana_attachment_list` | ✅ |
| Find objects by name | `search_objects` | `asana_search_objects` | 🟡 |

Where the pairs are 🟡, the scope differs — and not always in cyber-asana's favor:

- **Create a status update** — cyber-asana is the superset.
  `create_project_status_update` posts to a project or portfolio;
  `asana_status_create` adds goals, and `asana_status_get` / `asana_status_delete` round
  out the resource.
- **Find objects by name** — the official server is the superset per call.
  `search_objects` searches across object types in one call; `asana_search_objects` takes
  one `resource_type`, because that is all Asana's typeahead endpoint accepts. Both are
  capped, relevance/recency-ordered, and explicitly not exhaustive.

## What only cyber-asana has

84 tools, mostly relationship edits and resources outside the official server's V2 scope.

### Task relationships

`asana_task_subtask_list`, `asana_task_subtask_create`, `asana_task_dependency_list|add|remove`,
`asana_task_dependent_list|add|remove`, `asana_task_follower_add|remove`,
`asana_task_project_add|remove`, `asana_task_get_many`.

This is the biggest gap. The official server can create and update tasks but cannot wire
them together — subtasks, dependencies, followers, and project membership are cyber-asana
only.

### Sections

`asana_section_list|get|create|update|move|delete`, plus `asana_section_task_add`. The
official server has no section tools at all, so board-column workflows — including
reordering the columns and dropping a task straight into one — need cyber-asana.

### Tags

`asana_tag_list|get|create|update|delete`, plus `asana_tag_list_for_task`,
`asana_tag_add_to_task`, `asana_tag_remove_from_task`, `asana_tag_list_tasks`.

### Goals

`asana_goal_list|get|create|update|delete`.

### Out-of-office entries

`asana_ooo_list|get|create|update|delete`. Asana holds who is away and nothing else does;
the official server exposes no path to it, so checking availability before assigning work
needs cyber-asana.

### Writes on projects and portfolios

`asana_project_update`, `asana_project_delete`, `asana_project_counts`,
`asana_project_search`, `asana_portfolio_create|update|delete`,
`asana_status_list|get|delete`, `asana_status_overview`. The official server creates
projects and portfolios but does not update or delete them, and has no way to list the
status updates on one parent. `asana_status_overview` rolls a parent's latest status and
task counts into one call — the deterministic half of `get_status_overview`, without its
keyword search.

### Custom field settings

`asana_custom_field_list_for_project|portfolio|goal|team`. The official server has no way
to ask which custom fields a project accepts, so an agent writing `custom_fields` has to
guess the field and option GIDs. These four reads answer that directly.

### Workspaces and teams

`asana_workspace_list`, `asana_workspace_get`, `asana_team_get`.

### Attachments

`asana_attachment_get`, `asana_attachment_create`, `asana_attachment_delete`. The official
server can list attachments but not add or remove one; `asana_attachment_create` uploads a
local file or links an external URL to a task, project, or project brief.

### Comments and stories

`asana_story_list|get|create|update|delete` and the `asana_comment_*` aliases — the
official server can add a comment but not read the thread back, and cannot correct or
withdraw one it posted.

### No REST equivalent at all

| Tool | What it does |
| --- | --- |
| `asana_url_parse` | Turn an Asana web URL into the task/project GIDs it refers to |
| `asana_project_export` | Render a project and its tasks as a Markdown document |
| `asana_task_scan_todos` | Scan a codebase for `TODO`/`FIXME` comments and draft tasks from them |

## Choosing between them

Both can be installed at once — see
[Using alongside official Asana MCP](https://github.com/cyberuni/cyber-asana#using-alongside-official-asana-mcp)
for the dual config. When both could do the job:

| Prefer official `asana` | Prefer `cyber-asana` |
| --- | --- |
| Cross-object discovery in one call (`search_objects`, `search_tasks_preview`) | Anything relational: subtasks, dependencies, followers, sections |
| Preview-then-confirm creation flows | Write-heavy automation and bulk edits |
| Asana AI agents | Tags, goals, portfolio and project updates/deletes |
| New MCP-only capabilities Asana ships first | Token-efficient output (`--toon`), auto-pagination, `--full` control |
| Zero local setup — hosted OAuth | Running the same operations from a CLI or a script |

Rule of thumb: **official for discovery and previews, cyber-asana for writes and
structure.**
