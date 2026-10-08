---
name: asana-sprint-report
description: Use this skill when the user wants a sprint summary — completed vs incomplete tasks for retro or stakeholders.
metadata:
  stability: alpha
---

# Asana Sprint Report

## When to use

When the user asks for a sprint summary, retrospective data, or completion stats for a project or section.

## Instructions

### 1. Identify scope

Ask (or infer): which project, which section (sprint), and the sprint start date.

```bash
cyber-asana project list --toon
cyber-asana section list --project-gid <project-gid> --toon
```

Read the output for project and section GIDs. (`--toon` is the token-efficient format; use `--json` for raw JSON.)

### 2. Fetch completed tasks

```bash
cyber-asana task list --project-gid <project-gid> --completed-since <sprint-start-date> --toon
```

### 3. Fetch incomplete tasks

```bash
cyber-asana task list --project-gid <project-gid> --incomplete --toon
```

Filter both lists by section GID if reporting on a specific sprint section.

### 3b. Points (when the project has points fields)

Read `fields.story_points` and `fields.task_points` on the project's entry in `.agents/cyber-asana.json`. Skip this step when it has neither. Otherwise add the field values to both fetches:

```bash
--opt-fields name,assignee.name,due_on,completed,custom_fields.gid,custom_fields.display_value
```

Report story points and task points as two separate totals, completed and incomplete. The `cyber-asana.task-conventions` reference (§ Story points and task points) draws the line between them. A finished task may carry both. Its two values split its effort, so a combined total may add them. Parent tasks carry neither; do not count a parent's subtasks again through the parent.

### 4. Produce the report (LLM judgment)

Compute completion rate and identify patterns — blocked tasks, scope creep, assignee load. Write a narrative summary alongside the raw counts.

```
## Sprint Report — <Section/Project Name>
Period: <start> – <end>

**Completed (N)**
- Task name — assignee

**Incomplete (M)**
- Task name — assignee — due <date>

Completion rate: X%
Story points: <done> of <total> · Task points: <done> of <total>   (only when the project has the fields)

<narrative: patterns, blockers, notes>
```

### 5. Offer follow-up

Ask if the user wants to move incomplete tasks to the next sprint section.
