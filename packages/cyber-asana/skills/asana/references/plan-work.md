# Plan the Work

Before any task is created for a request or a session, decide what the work is, which of it Asana
already tracks, and how the rest is grouped. Then show that plan and apply it. This is the Asana
counterpart of splitting a working tree into one-concern commits: one unit of work per task, found
before it is filed twice.

This file is the one home of the planning procedure. The `asana` skill runs it first for both
**Create a task** and **Track session work**. It decides *which* tasks to reuse, create, group, or
complete. It does not decide what a task looks like: the `cyber-asana.task-conventions` reference
does (its **Grouping** and **Tracking session work** sections). It does not create tasks either:
every creation goes through [`create-task.md`](create-task.md), entered past its plan step.

The input is either the user's description of the work, or the session itself when the user asks
to track it. Credentials and the CLI form come from the `init-asana` skill (**Ensure cyber-asana
CLI**). The cyber-asana MCP server is opt-in; the `asana_*` tool names in parentheses apply only
when it is enabled.

## 1. Load the task conventions

Load the `cyber-asana.task-conventions` reference with the `reference` skill in the
`cyber-agent-harness` plugin, as [`create-task.md` § 1](create-task.md#1-load-the-task-conventions)
does. Its **Grouping** section decides steps 4 and 5.

## 2. Identify the units of work

A unit is one deliverable that one person can finish on its own. One unit is the common case: do
not split a request or a session that serves one outcome.

- **From a description:** each deliverable the user names. "Fix the login timeout" is one unit.
  "Add CSV export and document it" is one unit unless the user tracks docs separately.
- **From the session:** read what the session did and agreed to do.
  - The user's request and what was agreed in the conversation.
  - The branch's commits: `git log --oneline <base>..HEAD`, where `<base>` is the default branch
    (`main` unless the repo says otherwise).
  - The change itself: `git diff --stat <base>...HEAD` and `git status --short`.
  - The pull request, if one exists: its URL and title, read with the command for this repo's git
    host in [`link-pr.md` § 1](link-pr.md#1-find-the-pull-request). When there is none, or the
    host's CLI is not available, plan without it.

Commits are not units. Several commits usually serve one unit; split only where a part could be
reviewed, shipped, or assigned on its own, and where the user would want to see it tracked apart.
For each unit, note its outcome and whether it is finished, in progress, or still to do.

## 3. Resolve the project

Resolve the project once, with the precedence in
[`create-task.md` § 3](create-task.md#3-resolve-the-project). The lookup searches it, and every
creation in step 6 reuses it.

## 4. Look up each unit

Search for a task that already describes each unit's outcome, and for one that describes the
outcome the units share:

| Look in | Command |
| --- | --- |
| the project's incomplete tasks | `cyber-asana task search "<text>" --project <project-gid> --no-completed` |
| the user's incomplete tasks | `cyber-asana task my-tasks list --incomplete` |
| tasks completed recently, in the project | `cyber-asana task search "<text>" --project <project-gid> --completed-on-after <date>` |

(MCP, if enabled: `asana_task_search`, `asana_task_my_tasks`.) For "recently", use the date the
branch's first commit was made, or 30 days ago when there is no branch.

Match by outcome, not by wording: "Fix auth timeout" and "auth: expire idle sessions after 30 min"
can be the same work. When a match is uncertain, list it as a candidate in the plan rather than
choosing for the user. Each unit ends with one of:

- **Reuse** an incomplete task that describes it.
- **Already done** — a completed task describes it. Do not create it again.
- **Create** — nothing describes it.

## 5. Group the units

Apply the reference's **Grouping** section:

- Two or more units that serve one outcome become subtasks of a parent task. Reuse a task found in
  step 4 that describes that outcome as the parent; otherwise the parent is created too.
- A unit that cannot start until another is done gets a dependency on it.
- A lone unit is a plain task, with no parent.

## 6. Show the plan and confirm

Show one row per unit, plus a row for a parent task that is created:

| Unit | Action | Task |
| --- | --- | --- |
| <outcome> | create / reuse / subtask of <parent> / mark complete / depends on <unit> / already done | <name, or the matched task's name and URL> |

A row may carry two actions (for example *subtask of P; depends on U1*).

- **Confirm before writing** when the plan creates more than one task, or changes an existing task
  in any way: a comment, a new subtask under it, a dependency, or marking it complete. Let the user
  drop, merge, split, or rename rows, then show the plan again.
- **A single new task** with no other change may proceed after the plan is shown.
- **Mark complete** only on the user's explicit yes for that row. Never infer it from finished
  work alone.

## 7. Apply the plan

Work in this order, so every reference points at a task that exists:

1. **Create the parent task**, if the plan has one, through [`create-task.md`](create-task.md)
   with the project from step 3. Its conventions are already loaded.
2. **Create each unit's task** the same way. For a subtask, pass the parent's GID as
   `--parent-gid`.
3. **Add dependencies:** `cyber-asana task dependency add <task-gid> <blocking-task-gid>`
   (MCP, if enabled: `asana_task_dependency_add`).
4. **Comment on each reused task** with the branch and any pull request:
   `cyber-asana comment create "<text>" --task-gid <gid>` (MCP, if enabled:
   `asana_comment_create`). Never rewrite its description.
5. **Mark complete** each confirmed row: `cyber-asana task update <gid> --completed`
   (MCP, if enabled: `asana_task_update`).

## 8. Report

Show the plan table again with each task's `permalink_url`, and say which tasks were reused,
created, or completed.
