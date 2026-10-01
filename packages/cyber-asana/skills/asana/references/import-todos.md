# Import TODOs

Scan a codebase for `TODO` and `FIXME` comments, keep the actionable ones, and create an Asana task
for each one the user approves. Use it when the user wants code TODOs tracked in Asana, or a sweep
to surface technical debt ("create Asana tasks from TODOs", "scan the repo for FIXME comments",
"turn technical debt comments into tasks").

This file is the one home of the TODO-import procedure. The `asana` skill routes here for a
model-triggered request, and the `/cyber-asana:import-todos` command routes here for an explicit
one. Task creation itself is not restated here: each approved item is created through
[`create-task.md`](create-task.md), which carries the project resolution and the repo's task
conventions.

The request may name a directory to scan, a target project, or file extensions. Credentials and
the optional repo project registry are set up by the `init-asana` skill.

A scan of any real codebase returns many rows, most of them noise. So most of the steps below throw
results away, and nothing is created until the user approves the list: creating a hundred tasks is
far harder to undo than declining to.

## 1. Scan the codebase

```sh
cyber-asana task scan-todos [dir] --toon
```

Omit `[dir]` to scan the current working directory. Pass `--ext` or `--exclude` to narrow the
search if needed.

Read stdout: a token-efficient TOON table of `{ file, line, pattern, text }` rows. Use `--json`
instead if you need raw JSON. With MCP connected, `asana_task_scan_todos` returns the same rows.

## 2. Resolve the target project

Resolve the project once, before filtering, with the precedence in
[`create-task.md` § 2](create-task.md#2-resolve-project). The dedup in the next step needs it.

## 3. Review and filter

From the scan results, sort each row into one of two groups:

- **Actionable**: real work that should be tracked (e.g. `TODO: handle rate limit errors`).
- **Skip**: noise, already-done items, test fixtures, auto-generated comments.

Check the actionable rows against the project's existing tasks to avoid duplicates:

```sh
cyber-asana task list --project-gid <project-gid> --toon
```

With MCP connected, `asana_task_list` with `project_gid` returns the same list.

Deduplicate semantically, not textually: "Fix auth timeout" and "TODO: fix auth timeout" are the
same item. A string comparison would file the same debt again on every sweep.

## 4. Confirm with the user

Present the filtered list before creating anything. Let the user remove or rename items.

## 5. Create the tasks

Create each approved item through [`create-task.md`](create-task.md), with the project already
resolved in step 2:

- **Name**: the work the comment describes, shaped to the repo's `task_name_format`, not the raw
  comment text.
- **Description**: the comment's location as `<file>:<line>`. Start from the
  `description_template` headings when the conventions define one.

The basic call is:

```sh
cyber-asana task create "<task name>" --project-gid <project-gid> --notes "<file>:<line>"
```

## 6. Report

Summarize: N tasks created, M skipped. List each created task's `permalink_url`.
