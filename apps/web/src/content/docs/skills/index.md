---
title: Agent Skills
description: AI agent skills powered by cyber-asana
sidebar:
  order: 1
---

`cyber-asana` ships workflow skills for Cursor, Claude Code, and other agents. **Start here** — skills drive the CLI (and MCP tools if you have opted into the server), how to resolve projects from repo config, and common workflows.

## Installation

In Claude Code, add the repo's marketplace, then install the plugin:

```text
/plugin marketplace add cyberuni/cyber-asana
/plugin install cyber-asana@cyberuni
```

Claude Code installs the plugin from the `cyber-asana` npm package and updates it when the package version changes.

Set [authentication](/cyber-asana/getting-started/#authentication) before running any workflow.

## Included Skills

| Skill | Use when |
| --- | --- |
| [`asana`](/cyber-asana/skills/asana/) | Entry point for Asana work — routes to the skill that owns the request; plans the work into tasks (reusing existing ones, grouping several under a parent task), imports TODO/FIXME comments as tasks, links a pull or merge request to its task, tidies descriptions, and tracks session work |
| [`init-asana`](/cyber-asana/skills/init-asana/) | First-time setup; `ASANA_ACCESS_TOKEN`, workspace GID, verify connection |
| [`init-asana-scrum`](/cyber-asana/skills/init-asana-scrum/) | Scrum setup — scope, `sections` sprint model, fields, backlog, current sprint, policy |
| [`config-asana`](/cyber-asana/skills/config-asana/) | Add, remove, refresh, and show Asana projects and users in the repo config or the personal global registry |
| [`asana-scrum`](/cyber-asana/skills/asana-scrum/) | Scrum work — the standup (done, today, blocked), computed by the CLI; sprint housekeeping |
| [`asana-standup`](/cyber-asana/skills/asana-standup/) | Moved into `asana-scrum`; a stub that routes there for one minor release |
| [`asana-sprint-report`](/cyber-asana/skills/asana-sprint-report/) (alpha) | Sprint retro — completed vs incomplete in a project/section |
| [`sync-asana-project`](/cyber-asana/skills/sync-asana-project/) (alpha) | Pull project tasks into local markdown for planning |

To create a task explicitly, run the **`/cyber-asana:create-task`** command (plugin installs). It and the `asana` skill share one procedure, [`skills/asana/references/create-task.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/create-task.md), so prefer either over ad-hoc task creation: agents then resolve workspace, project, and URL fields consistently.

Before it creates anything, the `asana` skill plans the work with [`skills/asana/references/plan-work.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/plan-work.md), for both a task request and session tracking: it splits the request or the session (its conversation, commits, and diff) into units of work, looks each one up among the project's tasks, your incomplete tasks, and recently completed ones, groups two or more units that serve one outcome under a parent task, and shows the plan. It asks before creating more than one task or changing an existing one, and marks a task complete only when you say so.

To turn the codebase's TODO and FIXME comments into tasks, run the **`/cyber-asana:import-todos`** command, or ask the `asana` skill. Both follow [`skills/asana/references/import-todos.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/import-todos.md): scan, filter, deduplicate against the project, confirm, then create.

To record a pull or merge request on its Asana task, run the **`/cyber-asana:link-pr`** command, or ask the `asana` skill. Both follow [`skills/asana/references/link-pr.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/link-pr.md): find the current branch's PR on GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, or Forgejo, infer the task from the branch name or PR text, confirm, then comment the PR on the task.

To tidy a task or project description, run the **`/cyber-asana:tidy-description`** command, or ask the `asana` skill. Both follow [`skills/asana/references/tidy-description.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/tidy-description.md): a light copy-edit by default, with opt-in emoji, a PRD, bug, or research template, a tone rewrite, or sources, written back in the HTML subset Asana accepts. It is also the fix when `html_notes` fails with `XML is invalid`.

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
