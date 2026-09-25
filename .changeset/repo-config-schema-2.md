---
"cyber-asana": minor
---

Give the repo config richer project entries and repo-wide defaults.

Project entries carry `aliases`, a `purpose` line, and a `default: true` marker alongside `gid` and `name`, so a project can be reached by keyword and an agent can tell what belongs in it. Two optional top-level blocks join them: `defaults` (`assignee`, `section`) and `conventions` (`task_name_format`, `description_template`, `default_tags`). The schema moves to version 2; a version 1 file still parses and is upgraded in place on the next write.

Manage them with `config add --alias --purpose --default`, `config set-default`, `config remove-project-alias`, and `config set` / `config unset` for the dotted keys.

`task create` and `asana_task_create` resolve through the registry: a project may be given as a name or alias, and with none given the project marked `default: true` is used, as is `defaults.assignee` when no assignee is given. They also apply the repo's conventions — `description_template` as the description when no notes are given, and `default_tags` when no tags are given. Updates are unaffected, so editing a task cannot silently reassign it.

Both surfaces can now send tags on creation: `--tag <gid-or-name[,...]>` on the CLI, `tag_gids` on `asana_task_create`. A tag may be named rather than given by GID — a numeric value is used as-is, and anything else is resolved against the workspace's tags.

Migration:

- `--project` on `task create` now follows the same contract as `--assignee`: a numeric value is a GID, and anything else is looked up in the repo config. `--project-gid` is sent to Asana untouched, so pass it for a value that is neither numeric nor registered.
