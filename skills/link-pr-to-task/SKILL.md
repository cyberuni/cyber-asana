---
name: link-pr-to-task
description: Use this skill when the user wants to post a GitHub PR URL as a comment on an Asana task, linking the code change back to the work item. Resolves the task from context or prompts the user.
---

# Link PR to Asana Task

## When to use

When the user opens or merges a PR and wants to record it on the related Asana task, or when asked to "link this PR to Asana".

## Instructions

### 1. Get the PR URL

If not provided, fetch from the current branch:

```bash
gh pr view --json url -q .url 2>/dev/null
```

### 2. Find the Asana task

Try to infer the task from context in this order:

1. Task GID or URL the user mentioned
2. Branch name — look for a GID or task name pattern (e.g. `feat/1234567890-my-feature`)
3. PR title or description — search for an Asana task URL or GID

If no task is found automatically:

```bash
cyber-asana tasks search --query "<pr title keywords>" --json
```

Present matches and ask the user to confirm.

### 3. Post the comment

```bash
cyber-asana stories create --task <task-gid> \
  --text "PR: <pr-url>"
```

### 4. Confirm

Tell the user the comment was posted and provide the task URL for verification.
