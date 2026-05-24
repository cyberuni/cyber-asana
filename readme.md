# asana-agent

Asana CLI and MCP server for AI agents.

## Installation

```sh
npm install -g asana-agent
```

## Authentication

Set your [Asana personal access token](https://app.asana.com/0/my-apps):

```sh
export ASANA_TOKEN=<your-pat>
export ASANA_WORKSPACE=<workspace-gid>   # optional default workspace
```

Or pass `--token <pat>` and `--workspace <gid>` per command.

## CLI

```sh
cyber-asana <resource> <action> [options]
```

Output is human-readable by default. Add `--json` for raw API JSON.

List commands support pagination and field selection where Asana supports it:

```sh
cyber-asana task list --project <gid> --json
cyber-asana task list --project <gid> --limit 50 --offset <next_page.offset>
cyber-asana task list --project <gid> --all --max-pages 5
cyber-asana project list --opt-fields gid,name,permalink_url
```

List commands request 100 results per page by default.
When pagination is used, JSON output includes `data`, `next_page`, and `limit`.
Readable output prints the page table and a `Next offset` hint when another page is available.
Use `--all` to fetch multiple pages intentionally; `--max-pages` caps the number of pages fetched.

### Resources

| Resource | Actions |
|---|---|
| `workspace` | `list`, `get` |
| `project` | `list`, `get`, `create`, `update`, `delete` |
| `task` | `list`, `my-tasks list`, `get`, `create`, `update`, `delete`, `subtask list`, `subtask create`, `search`, `dependency list/add/remove`, `dependent list/add/remove` |
| `section` | `list`, `get`, `create`, `update`, `delete` |
| `user` | `list`, `get`, `me` |
| `team` | `list`, `get` |
| `portfolio` | `list`, `get`, `create`, `update`, `delete` |
| `goal` | `list`, `get`, `create`, `update`, `delete` |
| `tag` | `list`, `get`, `create` |
| `attachment` | `list`, `get` |
| `story` | `list`, `create` |
| `comment` | `list`, `create` (alias for `story`) |

### GID options

Commands that accept a resource GID support both a canonical `--foo-gid` flag and a shorter legacy alias `--foo`:

```sh
cyber-asana task list --project-gid <gid>
cyber-asana task list --project <gid>      # legacy alias
```

### Incomplete tasks

All task list commands accept `--incomplete` as a shorthand for `--completed-since now`:

```sh
# Only incomplete tasks in a project
cyber-asana task list --project <gid> --incomplete

# Only incomplete My Tasks
cyber-asana task my-tasks list --incomplete

# Only incomplete subtasks
cyber-asana task subtask list <task-gid> --incomplete
```

### Subtask opt_fields shortcuts

`task subtask list` provides named flags for commonly needed extra fields. These compose with `--opt-fields`:

```sh
# Get assignee emails for all incomplete subtasks
cyber-asana task subtask list <task-gid> --incomplete --assignee-email

# Get follower emails (for blast email)
cyber-asana task subtask list <task-gid> --follower-emails

# Combine shortcuts with custom opt-fields
cyber-asana task subtask list <task-gid> --assignee-email --opt-fields "due_on,notes"
```

| Flag | Adds to opt_fields |
|---|---|
| `--assignee-email` | `assignee,assignee.email` |
| `--follower-emails` | `followers,followers.email` |
| `--num-subtasks` | `num_subtasks` |
| `--custom-fields` | `custom_fields` |

### Task dependencies and dependents

Asana models dependencies as simple blocking relationships (Finish-to-Start only). A dependency is a task that must finish before this task can start; a dependent is a task that cannot start until this task finishes.

```sh
# List tasks this task depends on (includes completed/due_on by default)
cyber-asana task dependency list <task-gid>
cyber-asana task dependency list <task-gid> --opt-fields "gid,name,assignee"

# Add/remove dependencies
cyber-asana task dependency add <task-gid> <dep-gid> [<dep-gid>...]
cyber-asana task dependency remove <task-gid> <dep-gid> [<dep-gid>...]

# List tasks that are blocked by this task
cyber-asana task dependent list <task-gid>

# Add/remove dependents
cyber-asana task dependent add <task-gid> <dep-gid> [<dep-gid>...]
cyber-asana task dependent remove <task-gid> <dep-gid> [<dep-gid>...]
```

Asana enforces a combined limit of 30 dependencies and dependents per task.

### Comments (stories)

`comment` is an alias for `story`. Both commands are identical:

```sh
cyber-asana comment list --task <gid>
cyber-asana comment create "Great work!" --task <gid>

# Equivalent:
cyber-asana story list --task <gid>
cyber-asana story create "Great work!" --task <gid>
```

Use `--template` to interpolate task data into the comment text before posting. Supported variables: `{task.name}`, `{task.assignee}`, `{task.due_on}`, `{task.notes}`.

```sh
cyber-asana comment create \
  "Hey {task.assignee}, your task '{task.name}' is due {task.due_on}. Please update!" \
  --task <gid> --template
```

### Task search filters

`task search` accepts an optional text query plus filters.

Filters that accept `<gid[,gid...]>` take one or more comma-separated GIDs.

```sh
# Text search
cyber-asana task search "login"

# Incomplete tasks in a project
cyber-asana task search --no-completed --project <gid>

# Overdue milestones assigned to a user
cyber-asana task search --assignee <user-gid> --subtype milestone --due-on-before 2026-01-01

# Blocked tasks, sorted by due date
cyber-asana task search --is-blocked --sort-by due_date --json

# Tasks modified this week, excluding a specific project
cyber-asana task search --modified-on-after 2026-05-17 --project-not <gid>
```

**Status filters:** `--completed/--no-completed`, `--subtask/--no-subtask`, `--has-attachment`, `--is-blocking`, `--is-blocked`

**Resource filters** (accept `<gid[,gid...]>`):
- `--assignee`, `--assignee-not`
- `--project`, `--project-not`, `--project-all`
- `--section`, `--section-not`, `--section-all`
- `--tag`, `--tag-not`, `--tag-all`
- `--team`, `--portfolio`
- `--follower`, `--follower-not`
- `--created-by`, `--created-by-not`
- `--assigned-by`, `--assigned-by-not`
- `--liked-by-not`, `--commented-on-by-not`

**Date filters** (YYYY-MM-DD for `*-on`, ISO 8601 for `*-at`):
- `--due-on`, `--due-on-before`, `--due-on-after`, `--due-at-before`, `--due-at-after`
- `--start-on`, `--start-on-before`, `--start-on-after`
- `--created-on`, `--created-on-before`, `--created-on-after`, `--created-at-before`, `--created-at-after`
- `--completed-on`, `--completed-on-before`, `--completed-on-after`, `--completed-at-before`, `--completed-at-after`
- `--modified-on`, `--modified-on-before`, `--modified-on-after`, `--modified-at-before`, `--modified-at-after`

**Other:** `--subtype <subtype>`, `--sort-by <field>`, `--sort-asc`, `--opt-fields <fields>`

### Examples

```sh
# List projects
cyber-asana project list

# Create a task
cyber-asana task create "Fix the bug" --project-gid <gid> --due-on 2026-06-01

# Search tasks
cyber-asana task search "login" --json
```

## MCP Server

Add to your MCP host config:

```json
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": ["node_modules/asana-agent/dist/mcp.js"],
      "env": {
        "ASANA_TOKEN": "<your-pat>",
        "ASANA_WORKSPACE": "<workspace-gid>"
      }
    }
  }
}
```

Tools are named `asana_<resource>_<action>` (e.g. `asana_task_create`).

List tools accept `limit`, `offset`, `opt_fields`, `fetch_all`, and `max_pages` parameters where Asana supports them.
Paginated MCP responses include `data`, `next_page`, and `limit`.
Fetch-all responses also include `page_count` and `truncated`.

`asana_task_list`, `asana_task_my_tasks`, and `asana_task_subtask_list` accept `incomplete: true` to filter to incomplete tasks only.

`asana_task_subtask_list` also accepts `assignee_email`, `follower_emails`, `num_subtasks`, and `custom_fields` boolean params to expand the returned fields.

`asana_story_create` and `asana_comment_create` accept `template: true` to interpolate `{task.name}`, `{task.assignee}`, `{task.due_on}`, and `{task.notes}` in the comment text before posting.

`asana_comment_*` tools are aliases for `asana_story_*`.

## License

MIT
