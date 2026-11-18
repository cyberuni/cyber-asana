---
name: sync-asana-project
description: Use this skill when pulling Asana project tasks into local markdown for offline planning or documentation.
metadata:
  stability: alpha
---

# Sync Asana Project

## When to use

When the user wants a local snapshot of an Asana project's tasks — for sprint planning, attaching context to a codebase, or working offline.

## Instructions

### 1. Identify the project

If the user hasn't specified a project GID, search for it (requires `ASANA_WORKSPACE_GID` or `--workspace`):

If they gave a project name or fragment:

```bash
node <this skill's folder>/scripts/cyber-asana.mjs project search "<name or fragment>" --toon
```

Otherwise search active projects:

```bash
node <this skill's folder>/scripts/cyber-asana.mjs project search --no-completed --toon
```

Read the output and ask the user to pick one. (`--toon` is the token-efficient format; use `--json` for raw JSON.)

### 2. Export to markdown

```bash
node <this skill's folder>/scripts/cyber-asana.mjs project export <project-gid> --output <path>
```

For example: `--output docs/sprint.md` or `--output TASKS.md`.

Omit `--output` to preview markdown on stdout first.

### 3. Confirm

Tell the user the file path written. Suggest re-running after each sprint to refresh.
