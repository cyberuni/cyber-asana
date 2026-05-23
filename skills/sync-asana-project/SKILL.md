---
name: sync-asana-project
description: Use this skill when the user wants to pull Asana tasks into local markdown files for offline planning, code context, or documentation. Fetches tasks from a project and writes them as structured markdown.
---

# Sync Asana Project

## When to use

When the user wants a local snapshot of an Asana project's tasks — for sprint planning, attaching context to a codebase, or working offline.

## Instructions

### 1. Identify the project

If the user hasn't specified a project GID:

```bash
cyber-asana projects list
```

Ask the user to pick one.

### 2. Fetch tasks

```bash
cyber-asana tasks list --project <project-gid> --json > /tmp/asana-tasks.json
```

### 3. Fetch sections (optional, for grouping)

```bash
cyber-asana sections list --project <project-gid> --json > /tmp/asana-sections.json
```

### 4. Write markdown

Create a file (e.g. `docs/asana-<project-name>.md` or wherever the user specifies) with this structure:

```markdown
# <Project Name>

_Synced from Asana on <date>_

## <Section Name>

- [ ] <task name> — <assignee> — due <due_on>
- [ ] ...

## (No section)

- [ ] ...
```

Use the JSON data to populate it. Mark completed tasks with `[x]`.

### 5. Confirm

Tell the user the file path and task count written. Suggest re-running after sprints to refresh.
