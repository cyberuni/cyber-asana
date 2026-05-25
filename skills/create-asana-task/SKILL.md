---
name: create-asana-task
description: Use when the user pastes an Asana URL and asks to create or add a task to that project. Parses the URL locally, creates the task with one API call, and avoids section APIs unless the user explicitly names a section or column.
---

# Create Asana Task from URL

## When to use

When the user asks to create, add, or file a task and provides an Asana app URL (or project context from a URL), e.g. “add this task to https://app.asana.com/1/…/project/…”.

Do **not** use section APIs unless the user explicitly mentions a section, column, or list **by name**.

## Instructions

### 1. Parse the URL (no API call)

MCP:

```
asana_url_parse { "url": "<asana-url>" }
```

CLI:

```sh
cyber-asana url parse '<asana-url>' --json
```

Use `workspace_gid` and `project_gid` from the result for task create.

**Ignore `list_view_gid` for placement** — it is browser list-view metadata, not a Sections API section GID. Do not call `asana_section_get`, `asana_section_list`, or `asana_task_project_add` just because the URL contains `/list/`.

If `kind` is `unknown` or required GIDs are missing, ask the user for a project or workspace URL.

### 2. Create the task (one API call)

MCP:

```
asana_task_create {
  "workspace_gid": "<from parse>",
  "project_gid": "<from parse>",
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

### 3. Optional comment

If linking deferred work, PR context, or plan notes:

```
asana_comment_create {
  "task_gid": "<new task gid>",
  "text": "<context>"
}
```

### 4. Confirm

Return the task `permalink_url` from the create response (or `asana_task_get`) so the user can verify.

## Section placement (only when explicitly requested)

If the user names a section or column:

1. `asana_section_list` with `project_gid`
2. Match the section by name
3. `asana_task_project_add` with `section_gid`, **or** wait for a future `section_gid` on create

Never infer section placement from `/list/{gid}` in the URL alone.
