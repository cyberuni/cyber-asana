# create-tasks-from-code

Scan the codebase for TODO and FIXME comments, filter actionable items, and create Asana tasks from them.

## When to use

Use this skill when the user wants to track code TODOs or FIXMEs in Asana, or sweep for technical debt.

Good triggers include:

- "Create Asana tasks from TODOs"
- "Scan the repo for FIXME comments"
- "Turn technical debt comments into tasks"

## What it does

The skill guides:

- Scanning with `cyber-asana task scan-todos --json`
- Filtering actionable items vs noise (LLM judgment)
- Deduplicating against existing project tasks
- Confirming with the user before creating tasks
- Creating tasks with file and line references in notes

## Install

```bash
npx skills add cyberuni/cyber-asana --skill create-tasks-from-code
```

Requires a target project GID and `ASANA_TOKEN`. See [`init-asana`](../init-asana/README.md) for setup.
