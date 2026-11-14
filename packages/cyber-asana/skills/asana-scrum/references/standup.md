# Standup

Write a team member's standup from computed data. The CLI decides what is done, planned, and
blocked; you present it.

## 1. Load the references

Load these with the `reference` skill of `cyber-agentkit`, never by reading tier folders:

1. `cyber-asana.scrum`: follow its `## Standup` section.
2. `cyber-asana.sprint-model.<key>`: `<key>` is the `sprint_model` the scope uses. Find it with `cyber-asana scrum scope resolve --scope <name> --json` (the `sprint.sprint_model` field), or `sections` when no scope is named.
3. `cyber-asana.report.standup`: its `## Layout`, `## Judgment`, and `## Follow-up` shape the answer.

If a name is ambiguous (two plugins ship it), the `reference` skill lists the options with `default`. Ask which to build on and whether that is for the repository or only the user, then save the pick with `reference customize <name> --extends <pick>`.

## 2. Run the report

```bash
cyber-asana report standup --json                              # the user
cyber-asana report standup --member <gid-or-email> --json      # a teammate
```

Add `--scope <name>` when the user names a scope, and `--sprint <ref>` for a sprint other than the current one. A teammate's standup is for another member; the whole-team form (`--team`) is not built yet, so for "the team's standup" run it once per member the user names.

If the command fails, read `error.code`:

- `scope-missing` or `scope-unknown`: run `cyber-asana config scope list` and ask which scope, or offer `init-asana-scrum`.
- `sprint-none` (for a sprint the user named): offer `cyber-asana sprint start --sprint <ref>`.
- `model-unsupported`: the scope's sprint model is not built into the CLI; follow its reference's primitive commands instead.
- `reference-ambiguous` (exit 8): settle it as in step 1, then run again.

## 3. Write the standup

Fill `cyber-asana.report.standup`'s `## Layout` from the JSON. Do not recount tasks or add points: use `count` and `points` as given, and keep story points and task points apart.

- When `sprint` is null, say there is no current sprint and why (`sprint_note`); the lists then cover every incomplete assigned task.
- When `today_basis` is `incomplete-and-assigned`, say Today lists every open assigned task because no workflow state is tracked.
- Mention a `notes` entry that changes how to read the lists.

## 4. Follow up

Present the standup, then offer what `cyber-asana.report.standup`'s `## Follow-up` lists: another member, another sprint, or a task for a blocker nobody owns (through the `asana` skill's create-task procedure). Change nothing in Asana without the user's yes.
