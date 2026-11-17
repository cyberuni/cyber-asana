---
title: Comments
description: Read, post, edit, and delete comments (Asana stories) on tasks, with optional templating.
sidebar:
  order: 5
---

`comment` is an alias for `story` — the two commands are identical, so use whichever reads
better in your script.

```sh
cyber-asana comment list --task <gid>
cyber-asana comment create "Great work!" --task <gid>

# Equivalent
cyber-asana story list --task <gid>
cyber-asana story create "Great work!" --task <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `list` | — | `--task-gid <gid>` / `--task <gid>`, [pagination](/cyber-asana/cli/#pagination) |
| `create` | `[text]` | `--task-gid <gid>` / `--task <gid>`, `--html-text <html>`, `--pin`, `--sticker <name>`, `--template` |
| `get` | `<gid>` | — |
| `update` | `<gid> [text]` | `--html-text <html>`, `--pin`, `--unpin`, `--sticker <name>` |
| `delete` | `<gid>` | — |

Comment bodies are truncated in list output with a size hint; pass `--full` for the
complete text.

## Goal comments

```sh
cyber-asana story list-goal <goal-gid>
cyber-asana story create-goal <goal-gid> "On track: 3 of 5 milestones done" --pin
```

Goals carry comments too, which suits progress notes. `create-goal` takes the same `--html-text`,
`--pin`, and `--sticker` options as `create`; there is no `--template`. Goals are a paid feature.
The MCP tools are `asana_story_goal_list` and `asana_story_goal_create`. Edit or delete a goal
comment with `update` and `delete`, which take the story GID. The request shapes come from Asana's
docs and have not been confirmed against a live paid workspace.

## Correcting or withdrawing a comment

`list` returns each comment's story GID; `get`, `update`, and `delete` take it.

```sh
cyber-asana comment get <story-gid>
cyber-asana comment update <story-gid> "Corrected text"
cyber-asana comment update <story-gid> --html-text '<body><strong>Corrected</strong></body>'
cyber-asana comment update <story-gid> --pin
cyber-asana comment update <story-gid> --unpin
cyber-asana comment delete <story-gid>
```

`--sticker <name>` attaches one of Asana's stickers: `green_checkmark`, `people_dancing`,
`dancing_unicorn`, `heart`, `party_popper`, `people_waving_flags`, `splashing_narwhal`, `trophy`,
`yeti_riding_unicorn`, `celebrating_people`, `determined_climbers`, `phoenix_spreading_love`. Any
other name is rejected locally, before a request is sent.

`--pin` and `--unpin` set Asana's `is_pinned`, which keeps a comment at the top of its
task. They are mutually exclusive, and `update` accepts either on its own — pinning is an
edit in its own right, so no replacement text is needed — and the same is true of `--sticker`.
`create --pin` posts a comment already pinned.

Asana only permits editing and deleting comment stories you authored — system stories
(assignee changed, due date set) are immutable, and the refusal comes back as a `403` whose
hint says so. `delete` is idempotent: withdrawing a comment that is already gone still
succeeds.

## Rich text

```sh
cyber-asana comment create --task <gid> \
  --html-text '<body>Deployed to <strong>staging</strong>.</body>'
```

## Templating

`--template` interpolates task data into the text before posting, so you can write one
message and reuse it across tasks:

```sh
cyber-asana comment create \
  "Hey {task.assignee}, your task '{task.name}' is due {task.due_on}. Please update!" \
  --task <gid> --template
```

Supported variables: `{task.name}`, `{task.assignee}`, `{task.due_on}`, `{task.notes}`.

Without `--template`, braces are posted literally.
