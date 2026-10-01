---
"cyber-asana": minor
---

The `asana` skill now plans the work before it creates a task. For a task request and for session tracking alike, it splits the request or the session (its conversation, commits, and diff) into units of work, looks each one up among the project's tasks, your incomplete tasks, and recently completed ones, and reuses a match instead of filing it twice. Two or more units that serve one outcome become subtasks of a parent task; a unit that waits on another gets a dependency. It shows the plan first and asks before creating more than one task or changing an existing one, and it marks a task complete only when you say so. The procedure lives in the skill's `references/plan-work.md`; the grouping rules live in a new **Grouping** section of the `cyber-asana.task-conventions` reference.
