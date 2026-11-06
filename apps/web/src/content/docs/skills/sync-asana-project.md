---
title: sync-asana-project
description: Pulls an Asana project's tasks into a local markdown file for offline planning or documentation. Alpha.
---

The `sync-asana-project` skill (alpha) exports a project to markdown. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/sync-asana-project/SKILL.md).

## When it triggers

Use it when you want a local snapshot of a project's tasks, for sprint planning, for context in a codebase, or to work offline.

## How to use it

1. **Identify the project.** If you gave no GID, it runs `project search` with your name fragment, or lists active projects, and asks you to pick one. Search needs `ASANA_WORKSPACE_GID` or `--workspace`.
2. **Export** with `cyber-asana project export <gid> --output <path>`, for example `docs/sprint.md` or `TASKS.md`. Without `--output` it prints to stdout so you can preview first.
3. **Confirm** the written path. Re-run after each sprint to refresh.
