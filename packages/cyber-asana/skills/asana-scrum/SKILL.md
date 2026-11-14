---
name: asana-scrum
description: Use this skill when the user wants scrum work from Asana — a standup, sprint status, or sprint housekeeping.
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
| the current sprint, its tasks, or the backlog ("which sprint is this", "what is in the sprint") | run `cyber-asana sprint current`, `sprint tasks`, or `backlog list` directly |
| start a sprint, add a task to it, or close it and carry work over | run `cyber-asana sprint start`, `sprint add <task-gid>`, or `sprint close` directly; ask before `close` |
| set up scopes, the policy, or the sprint structure | `init-asana-scrum` skill |
| a sprint review, retro, health check, workload, or velocity | not built yet; say so, and offer `sprint tasks --incomplete` for a quick look |

## Standup

Read [`references/standup.md`](references/standup.md) and follow it, with the user's request as its
input. It is the one home of the standup procedure; the `/cyber-asana:standup` command routes here
too.

## Failure statuses

A command's `error.code` says what to fix. `scope-missing` and `scope-unknown`: run `cyber-asana config scope list`, then pass `--scope`. `sprint-none`: offer `cyber-asana sprint start`. `policy-incomplete`: the policy has no `sprint_anchor_date`. `reference-ambiguous` (exit 8): settle it as the procedure's step 1 says.
