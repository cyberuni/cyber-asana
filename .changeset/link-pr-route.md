---
"cyber-asana": minor
---

Fold the `link-pr-to-task` skill into the `asana` router as the **Link a PR** route, and add the `/cyber-asana:link-pr` command. The `link-pr-to-task` skill is removed: ask the `asana` skill to link a pull request to its task, or run `/cyber-asana:link-pr`. The procedure lives in `skills/asana/references/link-pr.md` and now works on every major git host — GitHub (including Enterprise), GitLab (including self-hosted), Bitbucket Cloud and Data Center, Azure DevOps, Gitea, and Forgejo/Codeberg — with that host's official CLI or REST API. When the host's CLI is missing or logged out it hands off to repobuddy's `init-buddy` skill if installed, or asks for the pull request URL.
