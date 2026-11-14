---
name: asana-scrum
description: Use this skill when the user wants scrum from Asana — standup, planning, review, retro, health, workload, or dashboard.
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
| plan a sprint — propose and commit the next sprint's work ("plan the sprint", "what should we commit to", "sprint planning") | **Plan** below |
| a sprint health check — missing estimates, unassigned or overdue tasks, stale or blocked work, a sprint never started ("is the sprint healthy", "what is wrong with the board") | **Health** below |
| the team's workload or capacity — who is over or under allocated, who has room ("is anyone overloaded", "how loaded is the sprint") | **Workload** below |
| the current sprint, its tasks, or the backlog ("which sprint is this", "what is in the sprint") | run `cyber-asana sprint current`, `sprint tasks`, or `backlog list` directly |
| start a sprint, add a task to it, or close it and carry work over | **Start a sprint** below; run `cyber-asana sprint add <task-gid>` or `sprint close` directly, and ask before `close` |
| a sprint review for stakeholders — what was committed, completed, added, removed ("sprint review", "what did we deliver", "demo list") | **Review** below |
| a retro — carry-over, blocked time, cycle time, actions ("run the retro", "retro data") | **Retro** below |
| velocity ("how many points per sprint", "what is our velocity") | run `cyber-asana report velocity` and present it as `cyber-asana.report.velocity` lays out |
| the dashboard — every report at once, with a status ("sprint dashboard", "how is the sprint going overall") | **Dashboard** below |
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

## Plan

Read [`references/plan.md`](references/plan.md) and follow it. It runs `cyber-asana sprint plan` for the
totals, lets the user edit the commitment, and asks before each of `sprint start`, `sprint add`, and
`sprint start --snapshot`. The `/cyber-asana:sprint-plan` command routes here too.

## Dashboard

Run `cyber-asana report dashboard --json` (add `--scope` or `--sprint` as the user names them) and
present it from the JSON as given. Lead with `status_type` and `status_basis`, then each report's key
figures in the listed order. Name every entry that is `failed` (with its `error.code` and what fixes
it, as the route for that report says) and every entry that is `unsupported` (its `reason`). For an
unsupported report that has a `reference`, load that `cyber-asana.report.<key>` reference with the
`reference` skill and follow it with the primitive commands it names. Never recount, regrade, or
invent a status: `status_type` is `null` when health did not run, and you say so. Offer the full
report (`cyber-asana report <key>`) for any section the user wants to open.

Then offer to write the page: `cyber-asana report dashboard --page <path>` (default
`./sprint-dashboard.html`, plus `--scope` or `--sprint` as before) writes one self-contained HTML
file and publishes nothing. Ask for the path first; on the user's yes run it, and tell them the path
it printed and that it opens in any browser. It overwrites only a page it wrote before: on
`page-path-refused` (exit 2), another file is there, so ask for a new path. Never overwrite it
yourself.

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
