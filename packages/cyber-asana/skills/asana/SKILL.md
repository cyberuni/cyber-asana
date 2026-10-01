---
name: asana
description: Use this skill when the user wants Asana work done — create a task, track session work, report, link a PR, or set up.
---

# Asana

The entry point for Asana work in the cyber-asana plugin. Classify the request, then hand it to
the one procedure that owns it. This skill owns only the routing and the session-tracking
procedure; every other procedure lives in its own file.

## Route the request

Pick the first row that matches. When a request spans two rows (track the session, then link the
PR), run them in order.

| The user wants to… | Go to |
| --- | --- |
| create, add, or file a task ("create an Asana task for this", "file this bug in Asana", a pasted Asana URL to create a related task) | **Create a task** below |
| record this session's work as a task ("track this in Asana", "log what we did") | **Track session work** below |
| set up credentials, the workspace, or verify the connection | `init-asana` skill |
| add, remove, or sync projects or users in the registry | `config-asana` skill |
| a standup update — done, today, blockers | `asana-standup` skill |
| a sprint summary for a retro or stakeholders | `asana-sprint-report` skill |
| post a PR URL on a task that already exists | `link-pr-to-task` skill |
| clean up a task or project description, or fix "XML is invalid" | `improve-description` skill |
| turn TODO/FIXME comments into tasks | `create-tasks-from-code` skill |
| pull a project's tasks into local markdown | `sync-asana-project` skill |

Anything else — a single read or update of one Asana object — needs no procedure: run the
matching `cyber-asana <resource> <action>` command directly (see **Ensure cyber-asana CLI** in the
`init-asana` skill for how to invoke it). The cyber-asana MCP server is opt-in; when it is enabled,
its `asana_<resource>_<action>` tools are equivalent.

## Create a task

Read [`references/create-task.md`](references/create-task.md) and follow it, with the user's
request as its input. It is the one home of the task-creation procedure; the
`/cyber-asana:create-task` command routes here too. Do not create a task from memory of its
steps: the file carries the conventions, URL, and section rules.

## Track session work

Record the work this session is doing as an Asana task. Reuse a task before creating one.

1. **Load the conventions.** Load the `cyber-asana.task-conventions` reference with the
   `reference` skill in the `buddy-agent-harness` plugin, and follow its **Tracking session work**
   section. Its rules win over this summary where they differ.
2. **Gather the session's context.**
   - The outcome the session is working toward — from the user's request and what was agreed. Not
     the steps taken.
   - The current branch: `git branch --show-current`.
   - The pull request, if one exists: `gh pr view --json url -q .url`.
3. **Look for a task to reuse.** Search the user's incomplete tasks for one that describes the
   same outcome: `cyber-asana task my-tasks list --incomplete`, or
   `cyber-asana task search "<text>" --no-completed` when the list is long (MCP, if enabled:
   `asana_task_my_tasks`, `asana_task_search`). When one
   matches, confirm it with the user before writing to it.
4. **Update a reused task** with a comment linking the branch and any pull request
   (`cyber-asana comment create "<text>" --task-gid <gid>`; MCP, if enabled: `asana_comment_create`). Never
   overwrite its description.
5. **Otherwise create one** through [`references/create-task.md`](references/create-task.md),
   shaped as the reference says:
   - **Name:** the session's outcome.
   - **Description:** `## Context` from the user's request; `## Done when` from what was agreed;
     `## Links` with the branch and any pull request.
   - **Assignee:** the user — `--assignee me`.
   - **Project:** the repo's default project, unless the work names another.
6. **Confirm.** Return the task's `permalink_url`, and say whether it was reused or created.

When the pull request opens later in the session, link it with step 4 on the same task.
