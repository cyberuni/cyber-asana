# Health check

Report the sprint's health from computed findings. The CLI runs the checks and decides every
finding and its fix; you present them and help act on them.

## 1. Load the references

Load these with the `reference` skill of `cyber-agentkit`, never by reading tier folders:

1. `cyber-asana.scrum`: the policy the checks read (`state_carrier`, `workflow_states`, `blocked_signals`).
2. `cyber-asana.sprint-model.<key>`: `<key>` is the `sprint_model` the scope uses. Find it with `cyber-asana scrum scope resolve --scope <name> --json` (the `sprint.sprint_model` field), or `sections` when no scope is named.
3. `cyber-asana.report.health`: its `## Layout`, `## Judgment`, and `## Follow-up` shape the answer. Its frontmatter sets which checks run and the thresholds; the CLI reads them, so do not apply them yourself.

If a name is ambiguous (two plugins ship it), the `reference` skill lists the options with `default`. Ask which to build on and whether that is for the repository or only the user, then save the pick with `reference customize <name> --extends <pick>`.

## 2. Run the report

```bash
cyber-asana report health --json
```

Add `--scope <name>` when the user names a scope, and `--sprint <ref>` for a sprint other than the current one.

If the command fails, read `error.code`:

- `scope-missing` or `scope-unknown`: run `cyber-asana config scope list` and ask which scope, or offer `init-asana-scrum`.
- `sprint-none`: no sprint to check (today is before `sprint_anchor_date`, or the sprint has no section and H9 is turned off). Offer `cyber-asana sprint start --scope <name>` (add `--sprint <n>` for a later sprint); for a date before the anchor, say sprint 1 begins on the anchor date.
- `policy-incomplete`: the policy has no `sprint_anchor_date`; offer `init-asana-scrum`.
- `model-unsupported`: the scope's sprint model is not built into the CLI; follow its reference's primitive commands instead.
- `reference-ambiguous` (exit 8): settle it as in step 1, then run again.

## 3. Write the report

Fill `cyber-asana.report.health`'s `## Layout` from the JSON. Use `counts` and `findings` as given; do not add, drop, or re-grade a finding.

- When `sprint_started` is false, H9 reports it and the task checks are skipped: say the sprint has no section and lead with its fix (`sprint start`).
- When `in_progress_basis` is `incomplete-and-assigned`, say H5 and H6 count every open assigned task because no workflow state is tracked.
- List each skipped check with its `reason` under Not checked. H8 is skipped until allocations are wired: never call it passed.
- Mention a `notes` entry that changes how to read the findings.

## 4. Follow up

Present the report, then offer what `cyber-asana.report.health`'s `## Follow-up` lists: run a finding's `fix` command, start or close a sprint, or file a task for a blocker nobody owns (through the `asana` skill's create-task procedure). Run a fix only after the user says yes to that command, and run `cyber-asana report health` again afterwards.
