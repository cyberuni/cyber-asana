---
name: create-tasks-from-code
description: Use this skill when scanning code for TODO/FIXME comments and creating actionable Asana tasks from them.
---

# Create Tasks from Code

## When to use

When the user wants to track code TODOs/FIXMEs in Asana, or do a sweep to surface technical debt.

## Instructions

### 1. Scan the codebase

```bash
cyber-asana task scan-todos [dir] --json
```

Omit `[dir]` to scan the current working directory. Pass `--ext` or `--exclude` to narrow the search if needed.

Parse stdout JSON — an array of `{ file, line, pattern, text }` objects.

### 2. Review and filter (LLM judgment)

From the scan results, identify which items are:

- **Actionable**: real work that should be tracked (e.g. `TODO: handle rate limit errors`)
- **Skip**: noise, already-done items, test fixtures, auto-generated comments

Also check against existing tasks to avoid duplicates:

```bash
cyber-asana task list --project-gid <project-gid> --json
```

Deduplicate semantically — "Fix auth timeout" and "TODO: fix auth timeout" are the same thing.

### 3. Confirm with the user

Present the filtered list before creating anything. Let the user remove or rename items.

### 4. Create tasks

For each approved item:

```bash
cyber-asana task create "<task name>" --project-gid <project-gid> --notes "<file>:<line>"
```

### 5. Report

Summarize: N tasks created, M skipped.
