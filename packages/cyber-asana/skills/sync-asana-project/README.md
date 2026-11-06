# sync-asana-project

> **Alpha:** this skill is alpha. Its behavior and output may change in any release.

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

In Claude Code, add the marketplace, then install the plugin (it ships every skill):

```text
/plugin marketplace add cyberuni/cyber-asana
/plugin install cyber-asana@cyberuni
```

Set `ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID` before running workflows. See [`init-asana`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/init-asana/README.md) for setup.
