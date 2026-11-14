---
title: asana-scrum
description: "Routes scrum work: a standup, a sprint health check, and team workload computed by the CLI, and the current sprint and backlog."
---

The `asana-scrum` skill is the entry point for scrum work. It classifies the request and follows the
one procedure that owns it. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/SKILL.md).

## When it triggers

Use it when you ask for a standup, a sprint health check, the team's workload or capacity, the sprint's status, or to start, fill, or close a sprint. Examples: "Write my standup", "What is blocking me?", "Is the sprint healthy?", "Is anyone overloaded?", "Start the next sprint".

## Routes

| You want | It does |
| --- | --- |
| A standup | Follows [`references/standup.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/standup.md), or run `/cyber-asana:standup`. |
| A health check | Follows [`references/health.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/health.md). |
| The team's workload | Follows [`references/workload.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/workload.md). |
| The current sprint, its tasks, or the backlog | Runs `sprint current`, `sprint tasks`, or `backlog list`. |
| Start, fill, or close a sprint | Runs `sprint start`, `sprint add`, or `sprint close`, and asks before closing. |
| Setup | Hands off to the setup skill. |

Review, retro, and velocity routes arrive in later releases.

## The standup route

The CLI computes and the skill narrates. The procedure:

1. Loads the `cyber-asana.scrum` policy, the scope's `cyber-asana.sprint-model.<key>`, and `cyber-asana.report.standup` with the `reference` skill of `cyber-agentkit`. If a name is ambiguous, it lists the options and saves your pick with `reference customize`.
2. Runs [`cyber-asana report standup --json`](/cyber-asana/cli/reports/) for you, or for a teammate with `--member`.
3. Fills the report's layout from the data. It does not recount tasks or add points, and it keeps story points and task points apart. It says when there is no current sprint, or when no workflow state is tracked.
4. Offers a teammate, another sprint, or a task for a blocker nobody owns. It changes nothing in Asana without your yes.

## The health route

It loads `cyber-asana.scrum`, the scope's sprint model, and `cyber-asana.report.health`, runs [`cyber-asana report health --json`](/cyber-asana/cli/reports/#report-health), and fills the report's layout from the findings: errors first, then warnings, then the checks that did not run and why. It does not re-grade a finding. It runs a finding's fix command only after you agree to it, and offers to run the report again afterwards.

## The workload route

It loads `cyber-asana.scrum`, the scope's sprint model, and `cyber-asana.report.workload`, runs [`cyber-asana report workload --json`](/cyber-asana/cli/reports/#report-workload), and fills the report's layout: each person's story and task points, effort hours, capacity from [Allocations](/cyber-asana/cli/allocations/), utilization, and over or under flag, then the team total. A person whose capacity is unknown is named with the reason (the plan has no allocations, or none overlaps the window) and their load still shows. Out-of-office entries are a note beside capacity and never reduce it. It does not recompute a figure, and it changes nothing in Asana without your yes.

You can change the layout by patching `## Layout` in `.agents/references/cyber-asana.report.standup.md`; see [Overriding references](/cyber-asana/reference/overriding-references/).

It reads through the CLI, so it needs [authentication](/cyber-asana/getting-started/#authentication) only.
