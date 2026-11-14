---
name: asana-scrum
description: Use this skill when the user wants scrum work from Asana — standup, review, retro, health, workload, or sprints.
---

# Asana Scrum

The entry point for scrum work in the cyber-asana plugin: classify the request, then follow the
one procedure that owns it. This skill owns only the routing; each procedure lives in its own file
under `references/`.

The CLI computes (sprints, counts, points, blockers). This skill narrates: it adds judgment, never
arithmetic.

## Route the request

| The user wants to… | Go to |
| --- | --- |
| a standup update — done, today, blockers ("write my standup", "what did I do yesterday", "what is blocking me") | **Standup** below |
| a sprint health check — missing estimates, unassigned or overdue tasks, stale or blocked work, a sprint never started ("is the sprint healthy", "what is wrong with the board") | **Health** below |
| the team's workload or capacity — who is over or under allocated, who has room ("is anyone overloaded", "how loaded is the sprint") | **Workload** below |
| the current sprint, its tasks, or the backlog ("which sprint is this", "what is in the sprint") | run `cyber-asana sprint current`, `sprint tasks`, or `backlog list` directly |
| start a sprint, add a task to it, or close it and carry work over | **Start a sprint** below; run `cyber-asana sprint add <task-gid>` or `sprint close` directly, and ask before `close` |
| a sprint review for stakeholders — what was committed, completed, added, removed ("sprint review", "what did we deliver", "demo list") | **Review** below |
| a retro — carry-over, blocked time, cycle time, actions ("run the retro", "retro data") | **Retro** below |
| velocity ("how many points per sprint", "what is our velocity") | run `cyber-asana report velocity` and present it as `cyber-asana.report.velocity` lays out |
| set up scopes, the policy, or the sprint structure | `init-asana-scrum` skill |

## Standup

Read [`references/standup.md`](references/standup.md) and follow it, with the user's request as its
input. It is the one home of the standup procedure; the `/cyber-asana:standup` command routes here
too.

## Health

Read [`references/health.md`](references/health.md) and follow it, with the user's request as its
input. It is the one home of the health procedure.

## Workload

Read [`references/workload.md`](references/workload.md) and follow it, with the user's request as
its input. It is the one home of the workload procedure.

## Review

Read [`references/review.md`](references/review.md) and follow it. The `/cyber-asana:sprint-review`
command routes here too.

## Retro

Read [`references/retro.md`](references/retro.md) and follow it. It files the agreed actions as tasks
through the `asana` skill's create-task procedure and, at its end, offers `sprint close`. The
`/cyber-asana:retro` command routes here too.

## Start a sprint

`cyber-asana sprint start` creates the sprint's section and does nothing if it exists. The commitment
is a separate, posted record: once the sprint holds the tasks the team commits to, ask before running

```bash
cyber-asana sprint start --snapshot
```

Tell the user what it posts: a status update on each project in the scope, titled `<sprint> started`,
listing the committed tasks and their points. Asana cannot edit a status update, so it is posted once
per sprint (a re-run changes nothing). The review and the retro read it back; without it they rebuild
the commitment from task history and cannot name removed tasks. Post it only on the user's yes.

## Failure statuses

A command's `error.code` says what to fix. `scope-missing` and `scope-unknown`: run `cyber-asana config scope list`, then pass `--scope`. `sprint-none`: offer `cyber-asana sprint start` (the health report instead reports a sprint with no section as finding H9, unless that check is turned off). `policy-incomplete`: the policy has no `sprint_anchor_date`. `window-invalid` (workload): pass both `--from` and `--to` as `YYYY-MM-DD`, in order, or neither. `reference-ambiguous` (exit 8): settle it as the procedure's step 1 says.
