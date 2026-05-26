# link-pr-to-task

Post a GitHub PR URL as a comment on the related Asana task to link code changes back to the work item.

## When to use

Use this skill when the user opens or merges a PR and wants to record it on the related Asana task.

Good triggers include:

- "Link this PR to Asana"
- "Comment the PR on the task"
- "Connect my branch to the Asana ticket"

## What it does

The skill guides:

- Getting the PR URL (from context or `gh pr view`)
- Inferring the Asana task from GID, branch name, PR title, or search
- Posting a comment with `cyber-asana comment create`
- Confirming the task URL for verification

## Install

```bash
npx skills add cyberuni/cyber-asana --skill link-pr-to-task
```

Requires `ASANA_TOKEN`, the GitHub CLI (`gh`) for automatic PR lookup, and an identifiable Asana task. See [`init-asana`](../init-asana/README.md) for Asana setup.
