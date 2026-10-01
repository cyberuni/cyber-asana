---
title: Agent Skills
description: AI agent skills powered by cyber-asana
---

`cyber-asana` ships workflow skills for Cursor, Claude Code, and other agents. **Start here** — skills drive the CLI (and MCP tools if you have opted into the server), how to resolve projects from repo config, and common workflows.

## Installation

From the repo or after cloning:

```bash
npx skills add cyberuni/cyber-asana
```

Or link individual skills into your agent's skills directory (e.g. `~/.cursor/skills/`, `~/.claude/skills/`).

Set [authentication](/cyber-asana/getting-started/#authentication) before running any workflow.

## Included Skills

| Skill | Use when |
| --- | --- |
| [`asana`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/SKILL.md) | Entry point for Asana work — routes to the skill that owns the request; plans the work into tasks (reusing existing ones, grouping several under a parent task), imports TODO/FIXME comments as tasks, and tracks session work |
| [`init-asana`](https://github.com/cyberuni/cyber-asana/blob/main/skills/init-asana/SKILL.md) | First-time setup; `ASANA_ACCESS_TOKEN`, workspace GID, verify connection |
| [`config-asana`](https://github.com/cyberuni/cyber-asana/blob/main/skills/config-asana/SKILL.md) | Add, remove, refresh, and show Asana projects and users in the repo config or the personal global registry |
| [`improve-description`](https://github.com/cyberuni/cyber-asana/blob/main/skills/improve-description/SKILL.md) | Clean up or rewrite a description — light copy-edit by default, opt-in emoji/template/tone, Asana's HTML subset |
| [`asana-standup`](https://github.com/cyberuni/cyber-asana/blob/main/skills/asana-standup/SKILL.md) | Standup update — recent completions and due-soon tasks |
| [`asana-sprint-report`](https://github.com/cyberuni/cyber-asana/blob/main/skills/asana-sprint-report/SKILL.md) | Sprint retro — completed vs incomplete in a project/section |
| [`sync-asana-project`](https://github.com/cyberuni/cyber-asana/blob/main/skills/sync-asana-project/SKILL.md) | Pull project tasks into local markdown for planning |
| [`link-pr-to-task`](https://github.com/cyberuni/cyber-asana/blob/main/skills/link-pr-to-task/SKILL.md) | Post a GitHub PR URL as a comment on the related task |

To create a task explicitly, run the **`/cyber-asana:create-task`** command (plugin installs). It and the `asana` skill share one procedure, [`skills/asana/references/create-task.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/create-task.md), so prefer either over ad-hoc task creation: agents then resolve workspace, project, and URL fields consistently.

Before it creates anything, the `asana` skill plans the work with [`skills/asana/references/plan-work.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/plan-work.md), for both a task request and session tracking: it splits the request or the session (its conversation, commits, and diff) into units of work, looks each one up among the project's tasks, your incomplete tasks, and recently completed ones, groups two or more units that serve one outcome under a parent task, and shows the plan. It asks before creating more than one task or changing an existing one, and marks a task complete only when you say so.

To turn the codebase's TODO and FIXME comments into tasks, run the **`/cyber-asana:import-todos`** command, or ask the `asana` skill. Both follow [`skills/asana/references/import-todos.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/import-todos.md): scan, filter, deduplicate against the project, confirm, then create.

## Repo Project Registry

Agents and MCP tools can resolve human-readable project names without an API call. Commit a name → GID map at `.agents/cyber-asana.json`, where each project can also carry aliases, a purpose, and a `default` marker:

```bash
cyber-asana config add <project-gid> --alias api --purpose "Service work" --default  # seed or update an entry
cyber-asana config resolve-project "Backend" --json  # local lookup, no API (name or alias)
cyber-asana config sync                           # refresh cached names from Asana
cyber-asana config add-user <user-gid> --alias ali  # register a user for --assignee ali
cyber-asana config add-user --search "ada@example.com" --alias ada  # find the GID by typeahead
cyber-asana config resolve-user ali --json        # local lookup, no API
cyber-asana config set defaults.assignee ali      # fallback assignee for task create
cyber-asana config show
```

`asana_project_get` and `project get` opportunistically update cached names when results include `{ gid, name }`.
