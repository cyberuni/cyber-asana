---
"cyber-asana": minor
---

Treat story points and task points as two field roles. `config discover-fields` now maps "Story Points"/"SP" to `story_points` and "Task Points"/"TP" to `task_points`, so a project with both fields saves both without asking. The task conventions tell agents to classify each task as user-story work or a chore and set only the matching field — never the same value in both, and nothing on a parent task. The sprint report and standup skills total the two separately.
