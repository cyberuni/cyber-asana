---
"cyber-asana": minor
---

Add the `asana` skill: the single entry point for Asana work. It routes a request to the skill that owns it (`init-asana`, `config-asana`, `asana-standup`, `asana-sprint-report`, `link-pr-to-task`, `improve-description`, `create-tasks-from-code`, `sync-asana-project`), creates tasks, and tracks session work — reusing an incomplete task of yours that describes the same outcome and commenting the branch and pull request on it, or creating one, per the `cyber-asana.task-conventions` reference.

**Renamed:** the `create-asana-task` skill is replaced by the `/cyber-asana:create-task` command. Its procedure is unchanged and now lives in the `asana` skill's `references/create-task.md`, which both the command and the `asana` skill follow. Codex has no plugin commands; there, and in skills-only installs, ask for a task and the `asana` skill files it. If you installed `create-asana-task` on its own with `npx skills add`, install `asana` instead.
