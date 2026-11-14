# Sprint review

Write the sprint review from computed data: what the sprint committed to, what it delivered, and what
changed on the way. The CLI computes; you present it and add judgment.

## 1. Load the references

Load these with the `reference` skill of `cyber-agentkit`, never by reading tier folders:

1. `cyber-asana.scrum`: follow its `## Review` section.
2. `cyber-asana.sprint-model.<key>`: `<key>` is the `sprint_model` the scope uses. Find it with `cyber-asana scrum scope resolve --scope <name> --json` (the `sprint.sprint_model` field), or `sections` when no scope is named.
3. `cyber-asana.report.sprint`: its `## Layout`, `## Judgment`, and `## Follow-up` shape the answer.

If a name is ambiguous (two plugins ship it), the `reference` skill lists the options with `default`. Ask which to build on and whether that is for the repository or only the user, then save the pick with `reference customize <name> --extends <pick>`.

## 2. Run the report

```bash
cyber-asana report sprint --json                    # the current sprint
cyber-asana report sprint --sprint previous --json  # the one that just ended
```

Add `--scope <name>` when the user names a scope. A review is usually of the sprint that just ended, so ask which sprint when the user does not say and the current one has not ended.

If the command fails, read `error.code`:

- `scope-missing` or `scope-unknown`: run `cyber-asana config scope list` and ask which scope, or offer `init-asana-scrum`.
- `sprint-none`: the sprint has no section. Offer `cyber-asana sprint start --sprint <ref>` only if the user wants to plan it; otherwise ask which sprint they meant.
- `model-unsupported`: the scope's sprint model is not built into the CLI; follow its reference's primitive commands instead.
- `reference-ambiguous` (exit 8): settle it as in step 1, then run again.

## 3. Write the review

Fill `cyber-asana.report.sprint`'s `## Layout` from the JSON. Do not recount tasks or add points: use `count`, `points`, and `completion_rate` as given, and keep story points and task points apart.

- Say where the commitment came from: `committed.source` is `snapshot`, `rebuilt`, or `unavailable`. When it is not `snapshot`, say what that costs (`notes`): removed tasks cannot be named, points are as they are now.
- List the `demo` tasks first: the review's purpose is to show them.
- Name the carry-over candidates and where each goes, as the policy's `carry_over` says.
- Say the burndown trend in a sentence; do not predict anything.

## 4. Follow up

Offer what `cyber-asana.report.sprint`'s `## Follow-up` lists:

- feedback from the review recorded as backlog tasks, through the `asana` skill's create-task procedure, after the user agrees to each one;
- the retro, as `retro.md` describes;
- closing the sprint, which `retro.md` offers at its end.

Change nothing in Asana without the user's yes.
