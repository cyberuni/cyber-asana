---
name: asana-standup
description: Use this skill when the user wants a standup update from Asana — done, today, and blockers.
---

# Asana Standup

## When to use

When the user asks for their standup, daily update, or "what did I do / what am I doing" summary from Asana.

## Instructions

### 1. Fetch recently completed tasks

Use two days ago as the cutoff (adjust if the user specifies a different window):

```bash
cyber-asana task list --project-gid <project-gid> --completed-since <two-days-ago-date> --toon
```

### 2. Fetch incomplete tasks

```bash
cyber-asana task list --project-gid <project-gid> --incomplete --toon
```

If no project is known, ask the user or run:

```bash
cyber-asana project list --toon
```

Read the output to pick a project GID. (`--toon` is the token-efficient format; use `--json` if you need raw JSON.)

When the project's entry in `.agents/cyber-asana.json` has `fields.story_points` or `fields.task_points`, and the user wants points in the update, add `--opt-fields name,due_on,completed,custom_fields.gid,custom_fields.display_value` to both fetches. Show story points and task points apart, never merged into one "points" figure that hides which is which. The `cyber-asana.task-conventions` reference (§ Story points and task points) defines the two; a task carries one of them and a parent task neither, so they never overlap.

### 3. Format standup (LLM judgment)

From the two result sets, select and prioritize:

- **Done**: completed tasks worth mentioning (skip trivial or unrelated items)
- **Today**: incomplete tasks due today or actively in progress
- **Up next**: other near-term incomplete tasks, if relevant

```
**Done**
- Task name (Project)

**Today**
- Task name — due <date>

**Blockers**
(ask the user if any)
```

### 4. Present and offer to adjust

Output the standup. Ask if the user wants to tweak the date range, add blockers, or change the format.
