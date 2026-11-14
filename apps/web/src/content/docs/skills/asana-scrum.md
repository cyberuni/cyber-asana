---
title: asana-scrum
description: Routes scrum work, starting with a standup computed by the CLI, and the current sprint and backlog.
---

The `asana-scrum` skill is the entry point for scrum work. It classifies the request and follows the
one procedure that owns it. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/SKILL.md).

## When it triggers

Use it when you ask for a standup, the sprint's status, or to start, fill, or close a sprint. Examples: "Write my standup", "What is blocking me?", "Start the next sprint".

## Routes

| You want | It does |
| --- | --- |
| A standup | Follows [`references/standup.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-scrum/references/standup.md), or run `/cyber-asana:standup`. |
| The current sprint, its tasks, or the backlog | Runs `sprint current`, `sprint tasks`, or `backlog list`. |
| Start, fill, or close a sprint | Runs `sprint start`, `sprint add`, or `sprint close`, and asks before closing. |
| Setup | Hands off to the setup skill. |

Review, retro, health, workload, and velocity routes arrive in later releases.

## The standup route

The CLI computes and the skill narrates. The procedure:

1. Loads the `cyber-asana.scrum` policy, the scope's `cyber-asana.sprint-model.<key>`, and `cyber-asana.report.standup` with the `reference` skill of `cyber-agentkit`. If a name is ambiguous, it lists the options and saves your pick with `reference customize`.
2. Runs [`cyber-asana report standup --json`](/cyber-asana/cli/reports/) for you, or for a teammate with `--member`.
3. Fills the report's layout from the data. It does not recount tasks or add points, and it keeps story points and task points apart. It says when there is no current sprint, or when no workflow state is tracked.
4. Offers a teammate, another sprint, or a task for a blocker nobody owns. It changes nothing in Asana without your yes.

You can change the layout by patching `## Layout` in `.agents/references/cyber-asana.report.standup.md`; see [Overriding references](/cyber-asana/reference/overriding-references/).

It reads through the CLI, so it needs [authentication](/cyber-asana/getting-started/#authentication) only.
