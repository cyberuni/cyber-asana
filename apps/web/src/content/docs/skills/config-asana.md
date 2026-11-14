---
title: config-asana
description: The registry skill, which adds, removes, refreshes, and shows Asana projects and users in the repo config or the personal global registry.
---

The `config-asana` skill manages what `.agents/cyber-asana.json` (committed, per repo) or the personal global registry (`--global`, uncommitted) knows about. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/config-asana/SKILL.md).

## When it triggers

Use it to add or pin, remove, refresh, or show projects and users. Examples: "pin our Asana projects", "register ali as an alias for Alice", "remove that old project from the registry", "this repo's config is stale", "what does `--assignee ali` resolve to". It needs `ASANA_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID`; see [`init-asana`](/cyber-asana/skills/init-asana/).

## Repo config or global registry

| | Repo config | Global registry (`--global`) |
| --- | --- | --- |
| Where | `.agents/cyber-asana.json`, committed | `~/.config/cyber-asana/config.json`, outside every repo |
| Projects | Listed under this repo | Filed per repo key; `--repo <key>` manages another repo's |
| Users | Listed here | One flat personal list, no `--repo` |

The skill defaults to the repo config unless you say personal, global, cross-repo, or don't commit. `--merged` reads both, with the repo config winning a conflict, which shows what an agent will actually resolve.

## What it does

- **Add a project.** It derives keywords, runs `project search`, shows the candidates and the target registry, and adds only what you confirm with `config add`. It asks for aliases, a purpose, and whether the project is the default.
- **Add a user.** `config add-user` by GID, or `--search`, which registers a match only when it is clear (a single hit, or an exact name or email) and otherwise lists candidates.
- **Remove** a project (`config remove`), a user (`remove-user`), or aliases (`remove-alias`).
- **Refresh** drifted names with `config sync`, optionally with `--global` and `--repo`.
- **Show** with `config show`, `list-users`, and `path`.
- **Custom fields.** `discover-fields`, `set-field`, and `unset-field` record the `story_points`, `task_points`, `sprint`, and `status` roles on a project.
- **Scrum scopes.** `config scope add`, `remove`, and `list` manage the projects a scrum team works in, as a project, a list of projects, a portfolio, or a team, in the repo config or with `--global`. It asks the kind and the members first, then runs `scrum scope resolve` to show what the scope covers. See [Repo config](/cyber-asana/cli/repo-config/#scrum-scopes).
- **Task conventions** are not in either registry. They live in the frontmatter of `.agents/references/cyber-asana.task-conventions.md`, and the skill moves a legacy `conventions` block there.

`--assignee` on `task create`, `task update`, and `task subtask create` resolves a GID, `me`, or a name the same way `resolve-user` does, repo config first. See [Repo config](/cyber-asana/cli/repo-config/) for the CLI side.
