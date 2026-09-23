---
title: Agent Skills
description: AI agent skills powered by cyber-asana
---

`cyber-asana` ships workflow skills for Cursor, Claude Code, and other agents. **Start here** — skills encode when to use MCP tools vs CLI, how to resolve projects from repo config, and common workflows.

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
| [`init-asana`](https://github.com/cyberuni/cyber-asana/blob/main/skills/init-asana/SKILL.md) | First-time setup; `ASANA_ACCESS_TOKEN`, workspace GID, verify connection |
| [`manage-asana-registry`](https://github.com/cyberuni/cyber-asana/blob/main/skills/manage-asana-registry/SKILL.md) | Add, remove, refresh, and show Asana projects and users in the repo config or the personal global registry |
| [`create-asana-task`](https://github.com/cyberuni/cyber-asana/blob/main/skills/create-asana-task/SKILL.md) | Create or file a task (URL parse, repo project lookup, MCP `asana_task_create`) |
| [`improve-description`](https://github.com/cyberuni/cyber-asana/blob/main/skills/improve-description/SKILL.md) | Clean up or rewrite a description — light copy-edit by default, opt-in emoji/template/tone, Asana's HTML subset |
| [`asana-standup`](https://github.com/cyberuni/cyber-asana/blob/main/skills/asana-standup/SKILL.md) | Standup update — recent completions and due-soon tasks |
| [`asana-sprint-report`](https://github.com/cyberuni/cyber-asana/blob/main/skills/asana-sprint-report/SKILL.md) | Sprint retro — completed vs incomplete in a project/section |
| [`sync-asana-project`](https://github.com/cyberuni/cyber-asana/blob/main/skills/sync-asana-project/SKILL.md) | Pull project tasks into local markdown for planning |
| [`create-tasks-from-code`](https://github.com/cyberuni/cyber-asana/blob/main/skills/create-tasks-from-code/SKILL.md) | Scan TODO/FIXME comments and create actionable Asana tasks |
| [`link-pr-to-task`](https://github.com/cyberuni/cyber-asana/blob/main/skills/link-pr-to-task/SKILL.md) | Post a GitHub PR URL as a comment on the related task |

Prefer **`create-asana-task`** over ad-hoc `asana_task_create` calls so agents resolve workspace, project, and URL fields consistently.

## Repo Project Registry

Agents and MCP tools can resolve human-readable project names without an API call. Commit a name → GID map at `.agents/cyber-asana.json`:

```bash
cyber-asana config add <project-gid>              # seed or update an entry
cyber-asana config resolve-project "Backend" --json  # local lookup, no API
cyber-asana config sync                           # refresh cached names from Asana
cyber-asana config add-user <user-gid> --alias ali  # register a user for --assignee ali
cyber-asana config add-user --search "ada@example.com" --alias ada  # find the GID by typeahead
cyber-asana config resolve-user ali --json        # local lookup, no API
cyber-asana config show
```

`asana_project_get` and `project get` opportunistically update cached names when results include `{ gid, name }`.
