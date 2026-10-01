# Create Asana Task

Create or file an Asana task with the cyber-asana CLI, with consistent workspace, project, and URL
resolution. The request may carry the task's subject, an Asana URL, a project name, an assignee, or
a section. When it carries no subject, ask what the task is for.

This file is the one home of the task-creation procedure. The `asana` skill routes here for a
model-triggered "create a task", and the `/cyber-asana:create-task` command routes here for an
explicit one, so both paths resolve context the same way. Prefer it over ad-hoc
`cyber-asana task create` calls.

**What the task looks like** is decided by the `cyber-asana.task-conventions` reference: task,
subtask, or dependency; name; description; assignee; due date; tags; section; custom fields and
story points; comments. This file does not restate those rules. **How the task reaches Asana** is
decided here: workspace and project resolution, URL parsing, the registry, assignees named by a
person, the CLI call, and the confirmation.

**Plan first.** A request to create a task starts in [`plan-work.md`](plan-work.md), which splits
the request into units of work, looks each one up so an existing task is reused rather than filed
twice, groups them, and confirms the plan. It hands each task to create back here. Arriving from
`plan-work.md` or from [`import-todos.md`](import-todos.md), which has its own lookup and
confirmation, the plan is done: start at § 1.

Credentials and the optional repo project registry are set up by the `init-asana` skill; it also
says how to invoke the CLI (**Ensure cyber-asana CLI**). Every `cyber-asana` command below means
that form. The cyber-asana MCP server is opt-in; the `asana_*` tool names given in parentheses apply
only when it is enabled.

## 1. Load the task conventions

Before anything else, load the `cyber-asana.task-conventions` reference with the `reference` skill
in the `buddy-agent-harness` plugin. It is merged from the repo copy (`.agents/references/`), the
user copy, and the copy cyber-asana ships. Follow its body for the shape of the work:

- **Choosing the object** — whether this is a task, a subtask (`--parent-gid`), or a dependency
  between tasks (`cyber-asana task dependency add`).
- **Task** / **Subtask** — name, description, assignee, due date, tags, and section.
- **Custom fields** and **Story points** — which fields to set and how to estimate.
- **Comments** — when a comment is the right place instead of the description.
- **Tracking session work** — when the task records work done in this agent session.

Its frontmatter holds the repo's settings, which the CLI (and the MCP server, if enabled) read too:

| Key | How to use it |
| --- | --- |
| `task_name_format` | Shape the `name` you pass to match it (e.g. `<area>: <summary>` → `auth: expire idle sessions`). Nothing applies this for you — it is yours to follow |
| `description_template` | The CLI fills it in as the description when you pass no notes. Pass your own `--notes`/`--html-notes` only when you have real content, and start from the template's headings when you do |
| `default_tags` | Applied automatically when you pass no tags. Each entry is a tag GID or a tag name resolved in the workspace. Pass `--tag` only to override them |

## 2. Gather required fields

All three are required before `cyber-asana task create`. Infer when possible; ask if any are missing.

| Field | Sources |
| --- | --- |
| `name` | The request, shaped as the conventions say |
| `workspace_gid` | `ASANA_WORKSPACE_GID` env, Asana URL parse, or explicit GID — **not** repo config |
| `project_gid` | Asana URL parse, explicit GID, repo config (name, alias, or the project marked `default: true`), or project search |

The conventions decide which optional fields to fill. Their flags are `--notes`, `--html-notes`,
`--due-on`, `--assignee` or `--assignee-gid`, `--parent-gid`, `--follower`, `--tag`, and
`--custom-field <field-gid>=<value>`. `task create` falls back to `defaults.assignee` when no assignee
is given, and to the repo config's default project when no project is given — both come from the
same registry as `--assignee` and `--project`.

## 3. Resolve the project

Pick the first applicable source:

1. **Asana URL** — `cyber-asana url parse '<url>' --json` (MCP, if enabled: `asana_url_parse`) → use `workspace_gid` and `project_gid`
2. **Explicit GID** from the user
3. **Repo config** — read `.agents/cyber-asana.json` or `cyber-asana config resolve-project "<name>" --json` (no API call; resolves a name or alias)
4. **`cyber-asana project search "<text>"`** (MCP, if enabled: `asana_project_search`) in the workspace (requires `ASANA_WORKSPACE_GID` or resolved `workspace_gid`)
5. **Repo config default** — the project marked `default: true`, if one is registered and nothing else applies (CLI: `task create` falls back to it automatically)
6. Ask the user

### When parsing a URL

`list_view_gid` is browser list-view metadata, not a section GID: it never decides placement.

If `kind` is `unknown` or GIDs are missing, fall back to other resolution paths.

### Repo config name refresh

- **Lazy:** when an API result already includes `{ gid, name }` for a project in the registry, the CLI may update the cached name automatically.
- **Explicit:** `cyber-asana config sync` reconciles all cached names with Asana.

### Assignee named by a person

When the user names an assignee ("assign it to Ali"), pass the name as `--assignee` — it resolves against the repo user registry with no API call. Use `--assignee-gid` only for a literal GID. If the name is not registered, the call fails and names the fix: `cyber-asana config add-user --search "<name or email>" --alias <alias>`, which registers the person only when typeahead finds a clear match. If it lists several candidates, or the registry matches more than one user, ask which one rather than guessing.

## 4. Create the task

```sh
cyber-asana task create "<name>" \
  --workspace-gid <workspace_gid> \
  --project-gid <project_gid> \
  --notes "<description, when the conventions call for one>"
```

With the cyber-asana MCP server enabled, `asana_task_create` takes the same fields (`workspace_gid`, `project_gid`, `name`, `notes`).

### Placing it in a section

When the conventions' **Section** rule applies, place the task after creating it. `defaults.section`
in `.agents/cyber-asana.json` is already a section GID. For a section the user named:

1. `cyber-asana section list --project-gid <project_gid>` (MCP, if enabled: `asana_section_list`)
2. Match the section by name
3. `cyber-asana task project add <task-gid> <project-gid> --section-gid <section_gid>` (MCP: `asana_task_project_add`)

### When the official Asana MCP is also connected

- Default: `cyber-asana task create` (rich fields, repo config, URL parse workflow).
- Official `create_tasks` / `create_task_preview` only when the user wants an interactive preview or cyber-asana is unavailable.
- Never use the official MCP OAuth token as `ASANA_ACCESS_TOKEN` for CLI or cyber-asana.

## 5. Confirm

Return the task `permalink_url` from the create response (or `cyber-asana task get <gid> --opt-fields permalink_url`).
