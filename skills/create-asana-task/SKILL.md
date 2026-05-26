---
name: create-asana-task
description: Use when the user asks to create, add, or file an Asana task
---

# Create Asana Task

## Instructions

### 1. Gather required fields

All three are required before `asana_task_create`. Infer when possible; ask if any are missing.

| Field | Sources |
| --- | --- |
| `name` | User prompt |
| `workspace_gid` | `ASANA_WORKSPACE` env, Asana URL parse, or explicit GID — **not** repo config |
| `project_gid` | Asana URL parse, explicit GID, repo config, or project search |

Optional: `notes`, `due_on`, `assignee_gid`, `parent_gid`, `follower_gids`, `html_notes`, `custom_fields`.

Do **not** use section APIs unless the user explicitly names a section, column, or list **by name**.

### 2. Resolve project

Pick the first applicable source:

1. **Asana URL** — `asana_url_parse` / `cyber-asana url parse '<url>' --json` → use `workspace_gid` and `project_gid`
2. **Explicit GID** from the user
3. **Repo config** — read `.agents/cyber-asana.json` or `cyber-asana config resolve-project "<name>" --json` (no API call)
4. **`asana_project_search`** in the workspace (requires `ASANA_WORKSPACE` or resolved `workspace_gid`)
5. Ask the user

#### When parsing a URL

**Ignore `list_view_gid` for placement** — browser list-view metadata, not a Sections API section GID. Do not call section APIs just because the URL contains `/list/`.

If `kind` is `unknown` or GIDs are missing, fall back to other resolution paths.

#### Repo config name refresh

- **Lazy:** when an API result already includes `{ gid, name }` for a project in the registry, the CLI/MCP layer may update the cached name automatically.
- **Explicit:** `cyber-asana config sync` reconciles all cached names with Asana.

### 3. Create the task

MCP:

```
asana_task_create {
  "workspace_gid": "<workspace_gid>",
  "project_gid": "<project_gid>",
  "name": "<task name>",
  "notes": "<optional notes>"
}
```

CLI:

```sh
cyber-asana task create "<name>" \
  --workspace-gid <workspace_gid> \
  --project-gid <project_gid> \
  --notes "<optional notes>"
```

### When both MCPs are connected

- Default: `asana_task_create` (rich fields, repo config, URL parse workflow).
- Official `create_tasks` / `create_task_preview` only when the user wants an interactive preview or cyber-asana is unavailable.
- Never use the official MCP OAuth token as `ASANA_TOKEN` for CLI or cyber-asana.

### 4. Optional comment

If linking deferred work, PR context, or plan notes:

```
asana_comment_create {
  "task_gid": "<new task gid>",
  "text": "<context>"
}
```

### 5. Confirm

Return the task `permalink_url` from the create response (or `asana_task_get`).

## Section placement (only when explicitly requested)

If the user names a section or column:

1. `asana_section_list` with `project_gid`
2. Match the section by name
3. `asana_task_project_add` with `section_gid`

Never infer section placement from `/list/{gid}` in the URL alone.
