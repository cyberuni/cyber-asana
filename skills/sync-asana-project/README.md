# sync-asana-project

Pull Asana project tasks into local markdown for offline planning, sprint prep, or codebase documentation.

## When to use

Use this skill when the user wants a local snapshot of an Asana project's tasks.

Good triggers include:

- "Export this Asana project to markdown"
- "Sync project tasks to a file"
- Sprint planning or attaching task context to a repo

## What it does

The skill guides:

- Resolving the target project (search by name or pick from active projects)
- Exporting tasks with `cyber-asana project export`
- Writing markdown to a chosen path (or previewing on stdout first)

## Install

```bash
npx skills add cyberuni/cyber-asana --skill sync-asana-project
```

Set `ASANA_TOKEN` and `ASANA_WORKSPACE` before running workflows. See [`init-asana`](../init-asana/README.md) for setup.
