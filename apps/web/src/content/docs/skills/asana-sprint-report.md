---
title: asana-sprint-report
description: Summarizes a sprint as completed versus incomplete tasks, for a retro or for stakeholders. Alpha.
---

The `asana-sprint-report` skill (alpha) produces a sprint summary. Source: [`SKILL.md`](https://github.com/cyberuni/cyber-asana/blob/main/packages/cyber-asana/skills/asana-sprint-report/SKILL.md).

## When it triggers

Use it when you ask for a sprint summary, retrospective data, or completion stats for a project or section.

## How to use it

1. **Identify scope.** It asks or infers the project, the section that is the sprint, and the start date, using `project list` and `section list`.
2. **Fetch completed tasks** with `task list --completed-since <start-date>`.
3. **Fetch incomplete tasks** with `task list --incomplete`, and filter both by section for a specific sprint.
4. **Points, when the project has them.** With `story_points` or `task_points` in the registry entry, it reports the two as separate totals, completed and incomplete, and never counts a parent's subtasks twice.
5. **Write the report:** completed and incomplete lists with assignees, the completion rate, and a short narrative on blockers, scope creep, and load.
6. **Offer follow-up:** moving incomplete tasks to the next sprint section.
