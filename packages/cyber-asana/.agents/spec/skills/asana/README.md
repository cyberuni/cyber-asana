---
spec-type: reference
concept: [cyber-asana, skills, tasks, resolution, todo-scan, planning]
---

# asana — the routing skill, work planning, task filing, TODO import, and session tracking

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/asana/`, the single
model-triggered entry for Asana work in the plugin, and the `/cyber-asana:create-task` and
`/cyber-asana:import-todos` commands at `packages/cyber-asana/commands/` that reach the same
procedures explicitly.

## Subject

- **Artifacts** — `skills/asana/SKILL.md` (the router),
  `skills/asana/references/plan-work.md` (the work-planning procedure),
  `skills/asana/references/create-task.md` (the task-filing procedure),
  `skills/asana/references/import-todos.md` (the TODO-import procedure), and
  `commands/create-task.md` and `commands/import-todos.md` (thin user-invoked entries into them).
- **Trigger** — the user wants Asana work done, including turning code TODOs into tasks. Its front
  block reads: *"Use this skill when the user wants Asana work — create a task, track a session,
  import TODOs, report, link a PR, set up."*
  The commands never auto-trigger; a person types `/cyber-asana:create-task` or
  `/cyber-asana:import-todos`.
- **What it covers** — classifying the request and handing it to the skill that owns it
  (`init-asana`, `config-asana`, `asana-standup`, `asana-sprint-report`, `link-pr-to-task`,
  `improve-description`, `sync-asana-project`), plus the procedures it owns itself:
  - **Plan the work** — run first for both a task request and session tracking: splitting the
    request or the session (conversation, the branch's commits and diff, any pull request) into
    units of work, looking each one up among the project's incomplete tasks, the user's
    incomplete tasks, and recently completed ones, grouping two or more units that serve one
    outcome under a parent task with dependencies where one unit waits on another, showing the
    plan, and applying it — every creation through the task-filing procedure.
  - **Create a task** — gathering the three required fields, loading the repo's task conventions,
    resolving the project through a fixed precedence (a pasted Asana URL, an explicit GID, the repo
    registry, a workspace search, the registry default, then asking), creating the task, and
    reporting back the new task's URL.
  - **Import TODOs** — scanning with `task scan-todos`, **filtering** the hits into actionable work
    versus noise, **deduplicating semantically** against the tasks already in the project,
    presenting the filtered list for approval, and only then creating each task through the
    task-filing procedure.
  - **Track session work** — the plan step with the session as its input, each task shaped by the
    `cyber-asana.task-conventions` reference's *Tracking session work* section: a reused task gets
    a comment with the branch and pull request, a new one is assigned to the user.

**Its place in the catalog.** It is the front door: a request that names no skill lands here and is
routed, so the other skills keep their own triggers but no longer have to be found on their own.
Task filing is the most-used path and the one that most needs a *stated precedence*: a caller who
pastes a URL, a caller in a repository with a registry, and a caller who knows only a project's
name all arrive at the same operation by different routes, and without a fixed order an agent
would pick differently each time.

Work planning is the path whose failure mode is *duplication*. An agent asked for a task files
one without looking, so the same work lands in Asana twice, and work the session already finished
is filed as new. So the plan step looks before it writes, and it treats the session like a working
tree being split into commits: one unit per independently finishable deliverable, with one unit
the common case. The grouping rules — a parent task only when two or more units share an outcome —
live in the conventions reference, not here, so a repo can override them. Confirmation is
**mandatory** whenever the plan creates more than one task or touches an existing one, and
completing a task needs the user's explicit yes for that row: a wrong batch or a wrongly closed task
is harder to undo than asking.

TODO import is the one path whose failure mode is *volume*. A scan of any real codebase returns
hundreds of rows, most of them noise — test fixtures, generated comments, notes that were resolved
years ago. So most of its steps exist to throw results away, and the confirm-before-creating step
is not politeness: creating a hundred tasks is far harder to undo than declining to. Its dedup
instruction is deliberately **semantic, not textual** — "Fix auth timeout" and
"TODO: fix auth timeout" are the same item — because a string comparison would let the same debt be
filed on every sweep.

**One home for each procedure.** Work planning lives in the skill's `references/plan-work.md`, task
filing in `references/create-task.md`, and TODO import in `references/import-todos.md`, not in the
commands, so both ship with a skills-only
install and reach runtimes that have no plugin commands (Codex). The commands and the router point
at them and restate neither, and TODO import creates its tasks through the task-filing procedure
rather than restating it. Planning hands each creation to task filing too; task filing starts with
the plan unless it is entered from the plan or from TODO import, which has its own lookup and
confirmation.

Two of its instructions are corrections of mistakes an agent makes unprompted, which is why they are
written as prohibitions rather than steps: **the workspace GID never comes from the repo registry**
(it is deliberately not stored there), and **`list_view_gid` in a pasted URL is not a section** — it
is browser view metadata, so a URL containing `/list/` is not an instruction to call the Sections
API.

**What it adopts.** The catalog contract in [skills](../README.md).

**What decides its behavior lives elsewhere.** URL parsing is [url](../../url/README.md); the
registry lookup and the environment precedence are [config](../../config/README.md); creating the
task is [tasks](../../tasks/README.md); searching for the project is
[projects](../../projects/README.md); the lookup is task search and My Tasks in [tasks](../../tasks/README.md); the comment is [stories](../../stories/README.md); the scan is [tasks](../../tasks/README.md) and
its output format is [axi](../../axi/README.md). This skill
is the composition, and none of those contracts is re-frozen here. Whether an agent engages it,
routes correctly, splits and finds the right units, follows the precedence, and filters and deduplicates the right rows is ACED's
measurement.
