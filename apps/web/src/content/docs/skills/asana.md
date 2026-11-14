---
title: asana
description: The entry-point skill for Asana work in the cyber-asana plugin, which routes each request to the procedure that owns it.
---

The `asana` skill is the entry point for Asana work. It classifies the request and hands it to the one procedure that owns it. It owns only the routing; every procedure lives in its own file. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/SKILL.md).

## When it triggers

Use it when doing Asana work: creating or tracking tasks, importing TODOs, tidying descriptions, linking pull requests, reporting, or setting up. Examples: "create an Asana task for this", "file this bug in Asana", "track this in Asana", "link this PR to Asana", "tidy this description", "create tasks from TODOs".

## How to use it

Ask in plain words. The skill picks the first row that matches; when a request spans two rows (track the session, then link the PR), it runs them in order.

| You want to | The skill runs |
| --- | --- |
| Create, add, or file one task or several | [Create a task](#create-a-task) |
| Record this session's work as a task | [Track session work](#track-session-work) |
| Link a pull or merge request to its task | [Link a PR](#link-a-pr) |
| Clean up or write a task or project description | [Tidy a description](#tidy-a-description) |
| Turn TODO and FIXME comments into tasks | [Import TODOs](#import-todos) |
| Set up credentials or verify the connection | [`init-asana`](/cyber-asana/skills/init-asana/) |
| Add, remove, or sync registry projects and users | [`config-asana`](/cyber-asana/skills/config-asana/) |
| A standup update, the current sprint, or sprint housekeeping | [`asana-scrum`](/cyber-asana/skills/asana-scrum/) |
| A sprint summary | [`asana-sprint-report`](/cyber-asana/skills/asana-sprint-report/) |
| Pull a project into local markdown | [`sync-asana-project`](/cyber-asana/skills/sync-asana-project/) |

A single read or update of one Asana object needs no procedure: the skill runs the matching `cyber-asana <resource> <action>` command. When you have opted in to the MCP server, its `asana_<resource>_<action>` tools are equivalent. To read a task with its comments and change history in one call, it runs `cyber-asana task get <gid> --with-stories [--since <iso-time>] --json`.

## Create a task

Follows [`references/plan-work.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/plan-work.md): it finds the units of work in the request, reuses a task that already tracks one, groups several under a parent task, and confirms the plan. It then files each new task through [`references/create-task.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/create-task.md), the one home of task creation. The `/cyber-asana:create-task` command routes here too.

## Track session work

Records the work the session is doing in Asana. The input is the conversation, the branch's commits and diff, and any pull request. Each task is named for the outcome, assigned to you, and placed in the repo's default project, following the **Tracking session work** section of the `cyber-asana.task-conventions` reference. When the pull request opens later, the skill links it in a comment on the same tasks.

## Import TODOs

Follows [`references/import-todos.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/import-todos.md): scan, filter, deduplicate against the project, confirm, then create. The `/cyber-asana:import-todos` command routes here too.

## Link a PR

Follows [`references/link-pr.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/link-pr.md), for GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, and Forgejo. The `/cyber-asana:link-pr` command routes here too.

## Tidy a description

Follows [`references/tidy-description.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/tidy-description.md), the one home of description tidying and of Asana's accepted HTML subset. It is also the fix when `html_notes` fails with `XML is invalid`. Templates live in [`tidy-description-templates.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana/references/tidy-description-templates.md). The `/cyber-asana:tidy-description` command routes here too.

See [Agent skills](/cyber-asana/skills/) for the commands and an overview of every skill.
