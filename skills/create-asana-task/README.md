# create-asana-task

Create or file an Asana task via MCP or CLI with consistent workspace, project, and URL resolution.

## When to use

Use this skill when the user asks to create, add, or file an Asana task and you have (or can resolve) workspace and project context.

Good triggers include:

- "Create an Asana task for this"
- "Add a task to the Backend project"
- "File this bug in Asana"
- Parsing an Asana URL to create a related task

## What it does

The skill guides:

- Gathering required fields (`name`, `workspace_gid`, `project_gid`)
- Resolving project from URL parse, explicit GID, repo config, or search
- Creating via `asana_task_create` (MCP) or `cyber-asana task create` (CLI)
- Optional comments and section placement when explicitly requested
- Routing between cyber-asana and official Asana MCP when both are connected

Prefer this skill over ad-hoc `asana_task_create` calls so agents resolve context consistently.

## Install

```bash
npx skills add cyberuni/cyber-asana --skill create-asana-task
```

See [`init-asana`](../init-asana/README.md) for credentials and optional repo project registry.
