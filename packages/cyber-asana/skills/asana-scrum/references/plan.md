# Sprint planning

Plan the next sprint: propose a commitment that fits the team's recent velocity and capacity, let the
user edit it, then make it real in Asana. The CLI computes every total; you judge which tasks are
ready and write the goal. Never add points or hours yourself.

## 1. Load the references

Load these with the `reference` skill of `cyber-agentkit`, never by reading tier folders:

1. `cyber-asana.scrum`: follow its `## Planning` section, and read `## Definition of ready` to judge the tasks you propose.
2. `cyber-asana.sprint-model.<key>`: `<key>` is the `sprint_model` the scope uses. Find it with `cyber-asana scrum scope resolve --scope <name> --json` (the `sprint.sprint_model` field), or `sections` when no scope is named.
3. `cyber-asana.report.velocity`: its `## Layout` and `## Judgment` shape how you say the velocity.

If a name is ambiguous (two plugins ship it), the `reference` skill lists the options with `default`. Ask which to build on and whether that is for the repository or only the user, then save the pick with `reference customize <name> --extends <pick>`.

## 2. Get the numbers

```bash
cyber-asana sprint plan --json
```

It plans the next sprint. Add `--sprint current` when the sprint has begun and is still being filled, and `--scope <name>` when the user names a scope. It reads and writes nothing. The JSON holds:

- `velocity`: `mean` over `sprints` closed sprints (`null` with none), story and task points apart.
- `capacity`: `status` `known` with `hours`, or `unknown` with a `reason` (`plan`: the workspace has no Allocations; `no-allocation`: none overlaps the dates).
- `limits`: what the proposal was fitted against. A `null` limit was not applied.
- `backlog`: the backlog in priority order, each task with its points, effort hours, running totals, and `within_limits`.
- `proposal`: `tasks` (GIDs), `totals`, `stopped_before` (the first task that overruns, and which limit), and `unestimated` (proposed tasks with no points).
- `notes`: what it could not use, such as fewer closed sprints than `velocity_window`.

If the command fails, read `error.code`:

- `scope-missing` or `scope-unknown`: run `cyber-asana config scope list` and ask which scope, or offer `init-asana-scrum`.
- `policy-incomplete`: the policy has no `sprint_anchor_date`; offer `init-asana-scrum`.
- `model-unsupported`: the scope's sprint model is not built into the CLI; follow its reference's primitive commands instead.
- `reference-ambiguous` (exit 8): settle it as in step 1, then run again.

## 3. Propose the commitment

Present, from the JSON as given:

1. The limits: the velocity mean (say how many sprints it covers when fewer than `velocity_window`) and the capacity hours. When capacity is `unknown`, say why and that the proposal fits velocity alone. When there is no limit at all (`notes` says so), say there is nothing to fit against, show the backlog top, and ask the user how much to take.
2. The proposed tasks with their points and the totals, story and task points apart.
3. Why it stopped (`stopped_before`), and any proposed task with no estimate (`unestimated`): offer to estimate it per `cyber-asana.task-conventions` before it goes in.
4. Judgment from `## Definition of ready`: name any proposed task that is plainly not ready (no description, an open blocker) and suggest the next one down instead. Do not drop a task silently; the user decides.
5. A sprint goal in one sentence, the outcome the committed tasks serve, as `## Planning` asks. Offer it as a draft.

## 4. Let the user edit

The user adds, removes, or swaps tasks. After each change, total the picked tasks with the CLI, not by hand:

```bash
cyber-asana sprint plan --tasks <gid>,<gid>,<gid> --json
```

Read `selection`: `totals`, `against` each limit, `fits`, and `not_in_backlog` (a GID that is not in the backlog). Say plainly when the pick is over a limit and by how much; the user may commit to it anyway, so do not refuse. Repeat until the user agrees.

## 5. Make it real, each step with the user's yes

Ask before each of these, and say what it does. Each is safe to repeat.

1. `cyber-asana sprint start --sprint <n>`: creates the sprint's section (or option) where it is missing. Nothing changes when it exists.
2. `cyber-asana sprint add <gid> <gid> --sprint <n>`: puts the agreed tasks in the sprint. A task already there is left alone; read `outside_scope` and `missing` in the result and tell the user.
3. `cyber-asana sprint start --sprint <n> --snapshot`: records the commitment as a status update on each project in the scope. Tell the user it cannot be edited and is posted once per sprint. Run it only once the sprint holds the agreed tasks.

If the user stops after any step, say what is done and what is not.

## 6. Follow up

Offer to open the board for the sprint with `cyber-asana report health --sprint <n>`, which catches unestimated or unassigned committed tasks, and to run the standup route once the sprint is under way.
