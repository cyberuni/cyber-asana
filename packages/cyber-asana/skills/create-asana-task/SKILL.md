---
name: create-asana-task
description: Use this skill when the user asks to create, add, or file an Asana task via MCP or CLI.
---

# Create Asana Task

## When to use

When the user wants a new Asana task created and you have (or can resolve) workspace and project context.

## Instructions

### 1. Gather required fields

All three are required before `asana_task_create`. Infer when possible; ask if any are missing.

| Field | Sources |
| --- | --- |
| `name` | User prompt |
| `workspace_gid` | `ASANA_WORKSPACE` env, Asana URL parse, or explicit GID — **not** repo config |
| `project_gid` | Asana URL parse, explicit GID, repo config (name, alias, or the project marked `default: true`), or project search |

Optional: `notes`, `due_on`, `assignee_gid` or `assignee`, `parent_gid`, `follower_gids`, `tag_gids`, `html_notes`, `custom_fields`. On the CLI, `task create` falls back to `defaults.assignee` when no assignee is given, and to the repo config's default project when no project is given — both come from the same registry as `--assignee` and `--project`.

Do **not** use section APIs unless the user explicitly names a section, column, or list **by name**.

### 1a. Follow the repo's task conventions

If `.agents/cyber-asana.json` has a `conventions` block (`cyber-asana config show`), write the
task the way that repo writes tasks:

| Key | How to use it |
| --- | --- |
| `task_name_format` | Shape the `name` you pass to match it (e.g. `<area>: <summary>` → `auth: expire idle sessions`). Nothing applies this for you — it is yours to follow |
| `description_template` | The CLI and MCP fill it in as the description when you pass no notes. Pass your own `notes`/`html_notes` only when you have real content, and start from the template's headings when you do |
| `default_tags` | Applied automatically when you pass no tags. Each entry is a tag GID or a tag name resolved in the workspace. Pass `tag_gids` (CLI: `--tag`) only to override them |

### 2. Resolve project

Pick the first applicable source:

1. **Asana URL** — `asana_url_parse` / `cyber-asana url parse '<url>' --json` → use `workspace_gid` and `project_gid`
2. **Explicit GID** from the user
3. **Repo config** — read `.agents/cyber-asana.json` or `cyber-asana config resolve-project "<name>" --json` (no API call; resolves a name or alias)
4. **`asana_project_search`** in the workspace (requires `ASANA_WORKSPACE` or resolved `workspace_gid`)
5. **Repo config default** — the project marked `default: true`, if one is registered and nothing else applies (CLI: `task create` falls back to it automatically)
6. Ask the user

#### When parsing a URL

**Ignore `list_view_gid` for placement** — browser list-view metadata, not a Sections API section GID. Do not call section APIs just because the URL contains `/list/`.

If `kind` is `unknown` or GIDs are missing, fall back to other resolution paths.

#### Repo config name refresh

- **Lazy:** when an API result already includes `{ gid, name }` for a project in the registry, the CLI/MCP layer may update the cached name automatically.
- **Explicit:** `cyber-asana config sync` reconciles all cached names with Asana.

#### Assignee named by a person

When the user names an assignee ("assign it to Ali"), pass the name as `assignee` (CLI: `--assignee`) — it resolves against the repo user registry with no API call. Use `assignee_gid` only for a literal GID. If the name is not registered, the call fails and names the fix: `cyber-asana config add-user --search "<name or email>" --alias <alias>`, which registers the person only when typeahead finds a clear match. If it lists several candidates, or the registry matches more than one user, ask which one rather than guessing.

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
