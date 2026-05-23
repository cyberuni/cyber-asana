---
name: asana-standup
description: Use this skill when the user wants a standup update from Asana — tasks completed recently and tasks due today or this week. Formats output suitable for pasting into Slack or a standup doc.
---

# Asana Standup

## When to use

When the user asks for their standup, daily update, or "what did I do / what am I doing" summary from Asana.

## Instructions

### 1. Fetch the user's tasks

```bash
cyber-asana tasks my --json
```

### 2. Categorize tasks

From the JSON, split into:

- **Done (recently completed)**: `completed === true` and `completed_at` within the last 2 days
- **In progress / due today**: `completed === false` and `due_on <= today`
- **Up next**: `completed === false` and `due_on` within the next 7 days

### 3. Format standup output

```
**Yesterday / Done**
- Task name (Project)
- ...

**Today**
- Task name (due: <date>) (Project)
- ...

**Blockers**
(ask the user if any)
```

Keep names concise. Include the project name in parentheses for context.

### 4. Present and offer to copy

Output the formatted standup. Ask if the user wants to adjust date range or add blockers.
