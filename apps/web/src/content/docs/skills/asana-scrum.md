---
title: asana-scrum
description: "Routes scrum work: the standup, sprint planning, review, retro, velocity, health check, team workload, and dashboard, computed by the CLI."
---

The `asana-scrum` skill is the entry point for scrum work. It classifies the request and follows the
one procedure that owns it. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/SKILL.md).

## When it triggers

Use it when you ask for a standup, to plan a sprint, a sprint review, a retro, velocity, a sprint health check, the team's workload, the sprint's status, or to start, fill, or close a sprint. Examples: "Write my standup", "Plan the next sprint", "What did we deliver this sprint?", "Run the retro", "Is the sprint healthy?", "Start the next sprint".

## Routes

| You want | It does |
| --- | --- |
| A standup | Follows [`references/standup.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/standup.md), or run `/cyber-asana:standup`. |
| To plan a sprint | Follows [`references/plan.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/plan.md), or run `/cyber-asana:sprint-plan`. |
| A health check | Follows [`references/health.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/health.md). |
| The team's workload | Follows [`references/workload.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/workload.md). |
| A sprint review | Follows [`references/review.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/review.md), or run `/cyber-asana:sprint-review`. |
| A retro | Follows [`references/retro.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/retro.md), or run `/cyber-asana:retro`. |
| Velocity | Runs `report velocity` and presents it. |
| The current sprint, its tasks, or the backlog | Runs `sprint current`, `sprint tasks`, or `backlog list`. |
| Start, fill, or close a sprint | Runs `sprint start`, `sprint add`, or `sprint close`. It asks before posting the commitment snapshot and before closing. |
| The dashboard | Runs `report dashboard` and presents the status and each report's key figures, naming any report that failed or that the CLI does not compute. Offers `--page` to write the dashboard as a local HTML file. |
| Setup | Hands off to the setup skill. |


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

## The review route

Runs [`cyber-asana report sprint --json`](/cyber-asana/cli/reports/) and fills the layout of `cyber-asana.report.sprint`: committed against completed, added, and removed; the completion rate; the carry-over candidates; the burndown trend; and the demo list. It says where the commitment came from, and what a missing snapshot costs. It offers to record feedback as backlog tasks, and the retro.

## The plan route

Runs [`cyber-asana sprint plan --json`](/cyber-asana/cli/sprints/#sprint-plan), which computes the mean velocity of the last closed sprints, the team's Allocations capacity for the sprint's dates, and the backlog top that fits both. The skill presents the proposal and why it stopped, judges the proposed tasks against the definition of ready, and drafts a sprint goal. You edit the commitment; each edit is totalled by the CLI (`sprint plan --tasks`), never added by the model. Then it asks before each of `sprint start`, `sprint add`, and `sprint start --snapshot`.

## The retro route

Runs `cyber-asana report retro --json`, opens with the previous retro's actions, presents the facts (carry-over, scope change, blocked time, cycle time, estimate against actual) with their limits, and leads the discussion. Each action you agree to becomes a task through the `asana` skill's create-task procedure. At the end it offers `sprint close`, which carries the open tasks over as the policy's `carry_over` says, and runs it only on your yes.

## Starting a sprint

`sprint start` creates the sprint's section. Once the sprint holds what the team commits to, the skill asks before running `sprint start --snapshot`, which posts the commitment as a status update (Asana cannot edit one, so it is posted once). The review and the retro read it back.

It reads through the CLI, so it needs [authentication](/cyber-asana/getting-started/#authentication) only.
