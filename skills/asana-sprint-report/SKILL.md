---
name: asana-sprint-report
description: Use this skill when the user wants a sprint summary — completed vs incomplete tasks in an Asana project or section. Produces a report suitable for a retro or stakeholder update.
---

# Asana Sprint Report

## When to use

When the user asks for a sprint summary, retrospective data, or completion stats for a project or section.

## Instructions

### 1. Identify scope

Ask (or infer):
- Which project?
- Which section (sprint), or all sections?
- Date range for "completed during sprint"?

```bash
cyber-asana projects list
cyber-asana sections list --project <project-gid>
```

### 2. Fetch tasks

```bash
cyber-asana tasks list --project <project-gid> --json
```

Filter by section GID if a specific sprint section was chosen.

### 3. Compute stats

From the JSON:

- **Completed**: `completed === true`, optionally filtered by `completed_at` within sprint dates
- **Incomplete**: `completed === false`
- **Completion rate**: `completed / total * 100`

### 4. Format report

```
## Sprint Report — <Section/Project Name>
Period: <start> – <end>

**Completed (N)**
- Task name — assignee
- ...

**Incomplete (M)**
- Task name — assignee — due <date>
- ...

Completion rate: X%
```

### 5. Offer follow-up

Ask if the user wants to move incomplete tasks to the next sprint section or mark them as blocked.
