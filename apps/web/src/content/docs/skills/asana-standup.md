---
title: asana-standup
description: Builds a standup update from Asana, with what is done, what is for today, and blockers.
---

The `asana-standup` skill writes your standup from Asana. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-standup/SKILL.md).

## When it triggers

Use it when you ask for your standup, daily update, or a "what did I do / what am I doing" summary. Examples: "Write my standup from Asana", "What did I complete recently?".

## How to use it

1. **Fetch recently completed tasks** with `task list --project-gid <gid> --completed-since <date>`, which returns only tasks completed on or after the date. The default window is two days; say so if you want another.
2. **Fetch incomplete tasks** with `task list --project-gid <gid> --incomplete`. If no project is known, it asks you or lists projects. When the current sprint is a section, both fetches use `section tasks <section-gid>` with the same flags.
3. **Format the update** from the two sets: **Done**, **Today** (due today or in progress), and **Blockers**, which it asks you for. If the project's registry entry has `story_points` or `task_points` fields and you want points, it shows the two apart and never merges them.
4. **Present and offer to adjust** the date range, blockers, or format.

It reads through the CLI, so it needs [authentication](/cyber-asana/getting-started/#authentication) only.
