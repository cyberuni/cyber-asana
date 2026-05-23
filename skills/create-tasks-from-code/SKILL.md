---
name: create-tasks-from-code
description: Use this skill when the user wants to scan code for TODO or FIXME comments and create Asana tasks from them. Searches the codebase, deduplicates against existing tasks, and bulk-creates new ones.
---

# Create Tasks from Code

## When to use

When the user wants to track code TODOs/FIXMEs in Asana, or do a cleanup sweep to surface technical debt.

## Instructions

### 1. Scan for TODOs and FIXMEs

```bash
grep -rn "TODO\|FIXME" --include="*.ts" --include="*.js" --include="*.py" --include="*.go" . \
  | grep -v node_modules | grep -v dist
```

Adjust file extensions to match the project. Collect: file path, line number, comment text.

### 2. Identify target project

```bash
cyber-asana projects list
```

Ask the user which project (and optionally which section) to create tasks in.

### 3. Check for existing tasks to avoid duplicates

```bash
cyber-asana tasks list --project <project-gid> --json
```

Skip any TODOs whose text already matches an existing task name.

### 4. Create tasks

For each new TODO/FIXME, create a task with:
- **Name**: the comment text (strip `TODO:` / `FIXME:` prefix)
- **Notes**: file path + line number for traceability

```bash
cyber-asana tasks create --project <project-gid> \
  --name "<todo text>" \
  --notes "<file>:<line>"
```

### 5. Report

Summarize: N tasks created, M skipped (already exist), P skipped (no project match).
