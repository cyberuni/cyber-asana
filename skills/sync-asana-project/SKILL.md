---
name: sync-asana-project
description: Use this skill when the user wants to pull Asana tasks into local markdown files for offline planning, code context, or documentation.
---

# Sync Asana Project

## When to use

When the user wants a local snapshot of an Asana project's tasks — for sprint planning, attaching context to a codebase, or working offline.

## Instructions

### 1. Identify the project

If the user hasn't specified a project GID:

```bash
cyber-asana project list
```

Ask the user to pick one.

### 2. Export to markdown

```bash
cyber-asana project export <project-gid> --output <path>
```

For example: `--output docs/sprint.md` or `--output TASKS.md`.

Omit `--output` to preview in stdout first.

### 3. Confirm

Tell the user the file path written. Suggest re-running after each sprint to refresh.
