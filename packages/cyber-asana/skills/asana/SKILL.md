---
name: asana
description: Use this skill when the user wants Asana work — create a task, track a session, import TODOs, report, link a PR, set up.
---

# Asana

The entry point for Asana work in the cyber-asana plugin. Classify the request, then hand it to
the one procedure that owns it. This skill owns only the routing; every procedure lives in its
own file.

## Route the request

Pick the first row that matches. When a request spans two rows (track the session, then link the
PR), run them in order.

| The user wants to… | Go to |
| --- | --- |
| create, add, or file a task or several ("create an Asana task for this", "file this bug in Asana", "break this work into tasks", a pasted Asana URL to create a related task) | **Create a task** below |
| record this session's work as a task ("track this in Asana", "log what we did") | **Track session work** below |
| set up credentials, the workspace, or verify the connection | `init-asana` skill |
| add, remove, or sync projects or users in the registry | `config-asana` skill |
| a standup update — done, today, blockers | `asana-standup` skill |
| a sprint summary for a retro or stakeholders | `asana-sprint-report` skill |
| post a PR URL on a task that already exists | `link-pr-to-task` skill |
| clean up a task or project description, or fix "XML is invalid" | `improve-description` skill |
| turn TODO/FIXME comments in the code into tasks ("create tasks from TODOs", a tech-debt sweep) | **Import TODOs** below |
| pull a project's tasks into local markdown | `sync-asana-project` skill |

Anything else — a single read or update of one Asana object — needs no procedure: run the
matching `cyber-asana <resource> <action>` command directly (see **Ensure cyber-asana CLI** in the
`init-asana` skill for how to invoke it). The cyber-asana MCP server is opt-in; when it is enabled,
its `asana_<resource>_<action>` tools are equivalent.

## Create a task

Read [`references/plan-work.md`](references/plan-work.md) and follow it, with the user's request
as its input. It finds the units of work in the request, reuses a task that already tracks one,
groups several under a parent task, and confirms the plan; it then files each new task through
[`references/create-task.md`](references/create-task.md), the one home of task creation. The
`/cyber-asana:create-task` command routes here too. Do not create a task from memory of these
steps: the files carry the lookup, conventions, URL, and section rules.

## Import TODOs

Read [`references/import-todos.md`](references/import-todos.md) and follow it, with the user's
request as its input. It is the one home of the TODO-import procedure; the
`/cyber-asana:import-todos` command routes here too.

## Track session work

Record the work this session is doing in Asana. Read
[`references/plan-work.md`](references/plan-work.md) and follow it, with the session as its input:
the conversation, the branch's commits and diff, and any pull request. The
`cyber-asana.task-conventions` reference's **Tracking session work** section shapes each task it
creates or reuses: named for the outcome, assigned to the user, in the repo's default project.

When the pull request opens later in the session, link it in a comment on the same tasks, as
plan-work § 7 does for a reused task.
