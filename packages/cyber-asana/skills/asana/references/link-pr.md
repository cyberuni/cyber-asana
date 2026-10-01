# Link a PR

Record a pull request (a merge request on GitLab) on the Asana task it implements, as a comment.
Use it when the user opens or merges a pull request and wants it on the related task ("link this PR
to Asana", "comment the MR on the task", "connect my branch to the Asana ticket").

This file is the one home of the PR-linking procedure. The `asana` skill routes here for a
model-triggered request, and the `/cyber-asana:link-pr` command routes here for an explicit one. It
works on GitHub (including Enterprise), GitLab (including self-hosted), Bitbucket Cloud and Data
Center, Azure DevOps, Gitea, and Forgejo (including Codeberg). The host table in step 1 is the only
host-specific part; everything after it is the same on every host.

Credentials and the CLI form come from the `init-asana` skill (**Ensure cyber-asana CLI**). The
cyber-asana MCP server is opt-in; the `asana_*` tool names in parentheses apply only when it is
enabled.

If the team uses Asana's own GitHub or GitLab integration, it links pull requests to tasks by
itself; this procedure is for everyone else, and for a one-off link.

## 1. Find the pull request

You need the pull request's URL, and its title and description: the task may be named there. When
the user gave a pull request URL, use it and read the title and description with the host's CLI if
it is available. Otherwise find the pull request for the current branch.

Read the remote and the branch:

```sh
git remote get-url origin
git branch --show-current
```

Recognize the host from the remote's hostname. The host kinds match those of repobuddy's
`init-buddy` skill, so the two agree. When repobuddy is installed, `repobuddy env --json` (or
`npx -y repobuddy@^1.8.0 env --json`) reports the same kind as `hosts[].kind`; add `--probe` for a
self-hosted host it reports as `unknown`. Without repobuddy, a self-hosted hostname that does not
name its product is unknown: ask the user which host it is.

| Host | Remote hostname | Pull request for the current branch: URL, title, description | Logged in? |
| --- | --- | --- | --- |
| GitHub, Enterprise | `github.com`, or a GHE host | `gh pr view --json url,title,body` ([doc][gh-view]) | `gh auth status --hostname <host>` ([doc][gh-auth]) |
| GitLab, self-hosted | `gitlab.com`, or contains `gitlab` | `glab mr view --output json`: `web_url`, `title`, `description` ([doc][glab-view], [fields][gl-api]) | `glab auth status` ([doc][glab-auth]) |
| Bitbucket Cloud | `bitbucket.org` | No official CLI. Use the Atlassian MCP server if this session has it; otherwise REST with an API token: `GET https://api.bitbucket.org/2.0/repositories/<workspace>/<repo>/pullrequests?q=source.branch.name="<branch>"` (URL-encode `q`): `links.html.href`, `title`, `description` ([doc][bb-cloud]) | Ask the user for an API token; app passwords no longer work ([changelog][bb-auth]) |
| Bitbucket Data Center | a self-hosted host whose remote path starts `/scm/` | No official CLI. REST with an HTTP access token as `Authorization: Bearer`: `GET https://<host>/rest/api/latest/projects/<KEY>/repos/<slug>/pull-requests?at=refs/heads/<branch>&direction=OUTGOING`: `links.self[0].href`, `title`, `description` ([doc][bb-dc], [token][bb-dc-token]) | Ask the user for a token |
| Azure DevOps | `dev.azure.com`, `ssh.dev.azure.com`, `*.visualstudio.com` | `az repos pr list --detect true --source-branch refs/heads/<branch> --status all -o json`: `pullRequestId`, `title`, `description` (cut to 400 characters; `az repos pr show --id <id>` returns it whole). URL: `<repository.webUrl>/pullrequest/<pullRequestId>` ([cli][az-pr], [fields][az-api]) | `az devops login` ([doc][az-login]) |
| Gitea | `gitea.com`, or contains `gitea` | `tea pulls list --state all -o json -f index,url,title,body,head`, then keep the row whose `head` is the branch ([doc][tea]) | `tea login list` ([doc][tea]) |
| Forgejo, Codeberg | `codeberg.org`, or contains `forgejo` | `fj pr view` shows the current branch's pull request as text, with no JSON output; `fj pr view body` prints its description ([source][fj-src]) | `fj auth login` ([doc][fj-auth]) |

When a command needs a branch name, use the branch from `git branch --show-current`. When the
command finds no pull request, say so and ask whether one exists or should be opened; do not link a
branch in its place unless the user asks.

**The host's CLI is missing or not logged in.** When repobuddy's `init-buddy` skill is installed,
run it: it installs the CLI and walks the user through logging in. Otherwise tell the user which
CLI to install and to log in with it. Either way, the link does not have to wait: open the host's
pull request list for the repository in the browser (built from the remote URL) and ask the user to
paste the pull request URL. Never ask the user to paste a token into the chat.

## 2. Find the task

Look for the task in this order and stop at the first match:

1. A task GID or Asana URL the user mentioned. Read a URL with `cyber-asana url parse <url>`
   (MCP, if enabled: `asana_url_parse`).
2. The branch name: an Asana GID (a long run of digits, as in `feat/1209876543210987-login`) or a
   task name pattern.
3. The pull request's title and description: an Asana task URL or GID.

These three are host-agnostic: the same search works on any host. Check a GID with
`cyber-asana task get <gid> --opt-fields name,permalink_url` (MCP, if enabled: `asana_task_get`)
before using it.

When none of them names a task, look the work up the way
[`plan-work.md` § 4](plan-work.md#4-look-up-each-unit) does, with the pull request's title as the
unit's outcome. Present the candidates and let the user choose: a comment on the wrong task is seen
by the whole team. When no task tracks the work and the user wants one, plan and file it through
[`plan-work.md`](plan-work.md), which hands creation to [`create-task.md`](create-task.md); then
come back here to link the pull request.

## 3. Post the comment

Follow the **Comments** section of the `cyber-asana.task-conventions` reference (load it as
[`create-task.md` § 1](create-task.md#1-load-the-task-conventions) does): link the pull request in a
comment, and never rewrite the task's description to do it.

```sh
cyber-asana comment create "PR: <pr-url>" --task-gid <task-gid>
```

(`story create` is an alias. MCP, if enabled: `asana_comment_create`.)

## 4. Report

Tell the user the comment was posted, and give the task's `permalink_url` so they can check it.

[gh-view]: https://cli.github.com/manual/gh_pr_view
[gh-auth]: https://cli.github.com/manual/gh_auth_status
[glab-view]: https://docs.gitlab.com/cli/mr/view/
[glab-auth]: https://docs.gitlab.com/cli/auth/status/
[gl-api]: https://docs.gitlab.com/api/merge_requests/
[bb-cloud]: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/
[bb-auth]: https://developer.atlassian.com/cloud/bitbucket/changelog/
[bb-dc]: https://developer.atlassian.com/server/bitbucket/rest/v1000/api-group-pull-requests/
[bb-dc-token]: https://confluence.atlassian.com/bitbucketserver/http-access-tokens-939515499.html
[az-pr]: https://learn.microsoft.com/cli/azure/repos/pr
[az-api]: https://learn.microsoft.com/rest/api/azure/devops/git/pull-requests/get-pull-requests
[az-login]: https://learn.microsoft.com/cli/azure/devops
[tea]: https://gitea.com/gitea/tea/src/branch/main/docs/CLI.md
[fj-src]: https://codeberg.org/forgejo-contrib/forgejo-cli/src/branch/main/src/prs.rs
[fj-auth]: https://codeberg.org/Cyborus/forgejo-cli/wiki/Authentication
