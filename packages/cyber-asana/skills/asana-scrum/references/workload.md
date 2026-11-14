# Workload

Report who is loaded and who has room, from computed numbers. The CLI sums the load, reads capacity
from Asana Allocations, and decides every flag; you present it and help act on it.

## 1. Load the references

Load these with the `reference` skill of `cyber-agentkit`, never by reading tier folders:

1. `cyber-asana.scrum`: the policy the numbers use (`hours_per_point`, `working_hours_per_day`, `working_days`).
2. `cyber-asana.sprint-model.<key>`: `<key>` is the `sprint_model` the scope uses. Find it with `cyber-asana scrum scope resolve --scope <name> --json` (the `sprint.sprint_model` field), or `sections` when no scope is named.
3. `cyber-asana.report.workload`: its `## Layout`, `## Judgment`, and `## Follow-up` shape the answer. Its frontmatter sets the over and under thresholds; the CLI reads them, so do not apply them yourself.

If a name is ambiguous (two plugins ship it), the `reference` skill lists the options with `default`. Ask which to build on and whether that is for the repository or only the user, then save the pick with `reference customize <name> --extends <pick>`.

## 2. Run the report

```bash
cyber-asana report workload --json
```

Add `--scope <name>` when the user names a scope, and `--sprint <ref>` for a sprint other than the current one. For a date window instead of a sprint, pass both `--from <date> --to <date>` (`YYYY-MM-DD`); they cannot be combined with `--sprint`.

If the command fails, read `error.code`:

- `scope-missing` or `scope-unknown`: run `cyber-asana config scope list` and ask which scope, or offer `init-asana-scrum`.
- `sprint-none`: no sprint to measure (today is before `sprint_anchor_date`, or the sprint has no section). Offer `cyber-asana sprint start --scope <name>`, or a `--from`/`--to` window.
- `window-invalid`: only one of `--from` and `--to`, a malformed date, or `from` after `to`; ask for the dates again.
- `policy-incomplete`: the policy has no `sprint_anchor_date` (a `--from`/`--to` window needs none); offer `init-asana-scrum`.
- `model-unsupported`: the scope's sprint model is not built into the CLI; follow its reference's primitive commands instead.
- `reference-ambiguous` (exit 8): settle it as in step 1, then run again.

## 3. Write the report

Fill `cyber-asana.report.workload`'s `## Layout` from the JSON. Use `people`, `team`, and each `flag` as given; do not recompute hours, utilization, or flags.

- Keep story points and task points apart, and show effort hours with both parts.
- For each person whose `capacity.status` is `unknown`, say why: `plan` means the workspace plan has no allocations (Asana answered 402), `no-allocation` means none overlaps the window. Say the load is still right and that no flag was drawn. Never guess a capacity.
- Show a person's `ooo` ranges as a note beside their capacity. Capacity is never reduced for them (D9); say so when someone is away for part of the window.
- Say when `team.capacity_unknown` is above zero: the team capacity and utilization cover only the people whose capacity is known.
- Mention `unassigned_tasks` when it is above zero, and any `notes` entry that changes how to read the numbers.

## 4. Follow up

Present the report, then offer what `cyber-asana.report.workload`'s `## Follow-up` lists: look at a person's allocations, move a task from an over person to an under one, or run `cyber-asana report health` (its H8 flags the sprint over capacity). Change nothing in Asana without the user's yes to that exact command.
