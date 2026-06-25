---
name: asana-sprint-report
description: Use this skill when the user wants a sprint summary — completed vs incomplete tasks for retro or stakeholders.
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

<narrative: patterns, blockers, notes>
```

### 5. Offer follow-up

Ask if the user wants to move incomplete tasks to the next sprint section.
