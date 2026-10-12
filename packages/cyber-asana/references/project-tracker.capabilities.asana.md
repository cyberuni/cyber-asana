---
description: What the Asana tracker can do for issue, epic, and initiative skills; operations, levels, categories, and visibility.
tags: [project-tracker, asana, issue]
contract: 1
---

## Tracker

- Name: `asana`
- Visibility: private, always. An Asana task is visible only to the people in its workspace, project, or share list. Nothing from an Asana task (title, description, comments, URL) goes into an item on a public tracker, and no operation here offers to copy it there.
- Levels held: issue, epic. Initiative is not held (see **Retype** and the note under **Kinds**).
- Categories held: bug, feature, task, carried by a tag or a custom field the workspace already has (see **Kinds**).
- Needs the `cyber-asana` CLI and an `ASANA_ACCESS_TOKEN`. The CLI form comes from the `init-asana` skill (**Ensure cyber-asana CLI**); every `cyber-asana` command below means that form. Check with `cyber-asana --version`, and with `cyber-asana task get <gid> --opt-fields name` for a known task. When the CLI or the token is missing, run `init-asana` and stop until it passes.

## Detect

- A task GID or an Asana URL appears in the request, the branch name, or the repository's `.agents/cyber-asana.json`. Read a URL with `cyber-asana url parse '<url>' --json`: `workspace_gid`, `project_gid`, and `task_gid`. The remote host plays no part; Asana is a tracker beside the repository, not the repository's own.
- Logged in: `ASANA_ACCESS_TOKEN` is set and a read such as `cyber-asana task get <gid> --opt-fields name` succeeds.
- Scope is a workspace and a project. Resolve them as the `asana` skill's `create-task` procedure (§ 2 and § 3) do (URL, explicit GID, repo config, project search, then ask). Pass `--workspace-gid` and `--project-gid` on every call.

## Kinds

Asana has no issue types, so read what the project offers and use only that:

```bash
cyber-asana project get <project-gid> --opt-fields custom_field_settings.custom_field.name,custom_field_settings.custom_field.enum_options.name
cyber-asana tag list --workspace-gid <workspace-gid>
```

- Category: a custom field named like `Type` or `Category` whose options include bug, feature, or task carries it; set it with `--custom-field <field-gid>=<option-gid>`. Without such a field, a tag named `bug`, `feature`, or `task` carries it; pass `--tag <tag-gid>`. With neither, create the task with no category and say so. Do not create fields or tags; follow the **Custom fields** and tag rules in the `cyber-asana.task-conventions` reference.
- Level: a task with no subtasks is an issue; a task with subtasks is an epic. Read `num_subtasks` (`cyber-asana task get <gid> --opt-fields num_subtasks`). The task conventions' **Choosing the object** and **Grouping** say when work is a parent task with subtasks.
- Initiative: Asana expresses it as a goal or a portfolio, neither of which is a task. This reference does not map it yet, so every operation at initiative level is unsupported.

## Search

Run at least two passes, each in the workspace and without a completion filter so closed tasks appear:

```bash
cyber-asana task search "<keywords>" --workspace-gid <workspace-gid> --project <project-gid> \
  --opt-fields name,completed,permalink_url,num_subtasks,parent.gid --json
cyber-asana task search "<core noun and verb>" --workspace-gid <workspace-gid> \
  --opt-fields name,completed,permalink_url,num_subtasks,parent.gid --json
```

Use the full title for the first pass and the core noun and verb for the second. Search matches names and descriptions; it returns subtasks too, so keep them. Each hit is `gid`, `name`, `completed` (closed when true), `permalink_url`, and a level from `num_subtasks`. Planning units of work is the `asana` skill's `plan-work` procedure (§ 4); this section is the same lookup for a skill that already has its units.

## Create

Create follows the `asana` skill's `create-task` procedure: load the task conventions (§ 1), gather the fields (§ 2), resolve the project (§ 3), then run the command (§ 4). Shape for this contract:

```bash
cyber-asana task create "<title>" --workspace-gid <workspace-gid> --project-gid <project-gid> \
  --notes "$(cat <file>)" [--tag <tag-gid>] [--custom-field <field-gid>=<option-gid>] \
  [--parent-gid <parent-gid>]
```

- Write the body to a file and read it with `"$(cat <file>)"`; never inline user text in the shell. For rich text, tidy it with the `asana` skill's `tidy-description` procedure and pass `--html-notes` instead.
- The category goes in the tag or custom field **Kinds** found.
- For an epic, create the parent task first, then each unit as a subtask: `cyber-asana task subtask create <epic-gid> "<title>" --notes "$(cat <file>)"`. An epic is a parent task by having subtasks, so there is no label to add.
- `--parent-gid` attaches the new task as a subtask of an existing one.
- `task create` prints the task, including `permalink_url`. When it exits non-zero, run `cyber-asana task search "<title>" --workspace-gid <workspace-gid> --json` before any retry, so a task that was created is not filed twice.

## Link

- Child of: `--parent-gid <gid>` at create, or `cyber-asana task update <child-gid> --parent-gid <parent-gid>` for an existing task.
- Detach: `cyber-asana task update <child-gid> --clear-parent`.
- Blocked by: `cyber-asana task dependency add <task-gid> <blocker-gid>`; remove with `task dependency remove`. Blocking is the same link read from the other end (`task dependent list`).
- Related items: Asana has no plain relation link; add a comment, `cyber-asana comment create "Related: <url>" --task-gid <gid>`. A pull request goes through the `asana` skill's `link-pr` procedure.
- Read the tree: `cyber-asana task subtask list <epic-gid> --json`; the parent is `parent.gid` from `task get --opt-fields parent.gid`.
- Subtasks nest up to 5 levels deep.

## Retype

A level change on Asana is in place: the task keeps its GID, URL, comments, and tags. Level is read from whether the task has subtasks, so there is nothing to relabel.

| Change | Steps | Open children |
|---|---|---|
| issue → epic | create the first subtask with `cyber-asana task subtask create <gid> "<title>"`, or move existing tasks under it with `task update <child-gid> --parent-gid <gid>` | n/a |
| epic → initiative | not supported | n/a |
| epic → issue | detach each subtask with `task update <child-gid> --clear-parent`; a task with no subtasks reads as an issue | kept as tasks, detached; a child is never completed or deleted by the retype |
| initiative → epic | not supported | n/a |

Not supported: Asana's initiative is a goal or a portfolio, neither of which is a task, so no task can be retyped into or out of one. Workaround: file the work as an epic whose title names the initiative, and tell the user it is an epic.

Limits: subtasks nest up to 5 levels.

## Close

```bash
cyber-asana task update <gid> --completed
cyber-asana comment create "<why>" --task-gid <gid>
```

Asana closes a task as completed and has no other reason. Done is `--completed`. Not planned and moved are also `--completed`, with a comment that says so first: `Not planned: <why>` or `Moved to <destination>`. For moved, give the destination's URL, which may be a public tracker; this tracker is private, so never put the Asana URL in the destination's item. Reopen with `--no-completed`. Completing an epic does not complete its subtasks; ask first, and do each one on request.

## Url

- `cyber-asana task get <gid> --opt-fields permalink_url` prints the URL, as does `task create`.
- `https://app.asana.com/<path>/<task-gid>` parses to workspace, project, and task: `cyber-asana url parse '<url>' --json`. A `kind` of `unknown` means the URL is not an Asana task link.
