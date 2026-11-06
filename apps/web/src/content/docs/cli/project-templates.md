---
title: Project templates
description: Browse Asana project templates and start a new project from one.
sidebar:
  order: 21
---

A project template is a saved project: sections, tasks, rules, and custom fields. Starting a
project from one builds the whole structure in a single call.

```sh
cyber-asana project-template list --workspace-gid <gid>
cyber-asana project-template list --team-gid <gid>
cyber-asana project-template get <gid>
cyber-asana project-template instantiate <gid> --name "Acme onboarding" --team-gid <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--workspace-gid <gid>` or `--team-gid <gid>` (the team is the narrower scope), [pagination](/cyber-asana/cli/#pagination) |
| `get` | `<gid>` | `--opt-fields` |
| `instantiate` | `<gid>` | `--name <name>` (required), `--team-gid <gid>` (required in an organization), `--public`, `--private`, `--privacy-setting <value>`, `--requested-date <gid=value>`, `--requested-role <gid=user>`, `--strict-dates`, `--no-wait`, `--timeout <seconds>` |

`--requested-date` and `--requested-role` repeat, one per date variable or role the template
declares. `get` prints those variables so you can find their GIDs. `--strict-dates` fails the
call if a date variable is left unfilled.

## Instantiating is asynchronous

Asana answers `instantiate` with a [job](/cyber-asana/cli/jobs/), not the project. The command
waits for the job and prints the new project GID. `--no-wait` returns the job GID instead, which
you can poll with `job get`. Task templates work the same way; see
[Task templates](/cyber-asana/cli/task-templates/).

The MCP tools are `asana_project_template_list`, `asana_project_template_get`, and
`asana_project_template_instantiate`.
