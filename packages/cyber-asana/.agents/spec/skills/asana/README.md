---
spec-type: reference
concept: [cyber-asana, skills, tasks, resolution]
---

# asana — the routing skill, task filing, and session tracking

A **reference artifact**: the shipped skill at `packages/cyber-asana/skills/asana/`, the single
model-triggered entry for Asana work in the plugin, and the `/cyber-asana:create-task` command at
`packages/cyber-asana/commands/create-task.md` that reaches the same task-filing procedure
explicitly.

## Subject

- **Artifacts** — `skills/asana/SKILL.md` (the router and the session-tracking procedure),
  `skills/asana/references/create-task.md` (the task-filing procedure), and
  `commands/create-task.md` (a thin user-invoked entry into that procedure).
- **Trigger** — the user wants Asana work done. Its front block reads: *"Use this skill when the
  user wants Asana work done — create a task, track session work, report, link a PR, or set up."*
  The command never auto-triggers; a person types `/cyber-asana:create-task`.
- **What it covers** — classifying the request and handing it to the skill that owns it
  (`init-asana`, `config-asana`, `asana-standup`, `asana-sprint-report`, `link-pr-to-task`,
  `improve-description`, `create-tasks-from-code`, `sync-asana-project`), plus two procedures it
  owns itself:
  - **Create a task** — gathering the three required fields, loading the repo's task conventions,
    resolving the project through a fixed precedence (a pasted Asana URL, an explicit GID, the repo
    registry, a workspace search, the registry default, then asking), creating the task, and
    reporting back the new task's URL.
  - **Track session work** — recording the session's work as a task per the
    `cyber-asana.task-conventions` reference's *Tracking session work* section: reuse an incomplete
    task of the user's that describes the same outcome, comment the branch and pull request on it,
    and otherwise create one assigned to the user.

**Its place in the catalog.** It is the front door: a request that names no skill lands here and is
routed, so the other skills keep their own triggers but no longer have to be found on their own.
Task filing is the most-used path and the one that most needs a *stated precedence*: a caller who
pastes a URL, a caller in a repository with a registry, and a caller who knows only a project's
name all arrive at the same operation by different routes, and without a fixed order an agent
would pick differently each time.

**One home for the task-filing procedure.** It lives in the skill's `references/create-task.md`,
not in the command, so it ships with a skills-only install and reaches runtimes that have no plugin
commands (Codex). The command and the router both point at it; neither restates it.

Two of its instructions are corrections of mistakes an agent makes unprompted, which is why they are
written as prohibitions rather than steps: **the workspace GID never comes from the repo registry**
(it is deliberately not stored there), and **`list_view_gid` in a pasted URL is not a section** — it
is browser view metadata, so a URL containing `/list/` is not an instruction to call the Sections
API.

**What it adopts.** The catalog contract in [skills](../README.md).

**What decides its behavior lives elsewhere.** URL parsing is [url](../../url/README.md); the
registry lookup and the environment precedence are [config](../../config/README.md); creating the
task is [tasks](../../tasks/README.md); searching for the project is
[projects](../../projects/README.md); the comment is [stories](../../stories/README.md). This skill
is the composition, and none of those contracts is re-frozen here. Whether an agent engages it,
routes correctly, and follows the precedence is ACED's measurement.
