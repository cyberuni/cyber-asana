# Retro

Facilitate a retrospective on a finished sprint: bring the computed facts, hold the discussion, file
the agreed actions as tasks, and offer to close the sprint. The CLI computes the facts; the
discussion and the actions are the team's.

## 1. Load the references

Load these with the `reference` skill of `cyber-agentkit`, never by reading tier folders:

1. `cyber-asana.scrum`: follow its `## Retro` section, which says how to open and how many actions to agree.
2. `cyber-asana.sprint-model.<key>`: `<key>` is the `sprint_model` the scope uses (see the review procedure for how to find it).
3. `cyber-asana.report.retro`: its `## Layout`, `## Judgment`, and `## Follow-up`.

If a name is ambiguous, settle it as the review procedure's step 1 says.

## 2. Run the report

```bash
cyber-asana report retro --json                    # the current sprint
cyber-asana report retro --sprint previous --json  # the one that just ended
```

Add `--scope <name>` when the user names a scope. Failures are handled as in the review procedure (`scope-missing`, `scope-unknown`, `sprint-none`, `model-unsupported`, `reference-ambiguous`).

## 3. Facilitate

1. Open with the previous retro's actions, as `## Retro` says: ask whether each was done. Look them up as tasks the previous retro filed; do not guess.
2. Present the facts from the JSON as `cyber-asana.report.retro`'s `## Layout` shows: carry-over, scope change, blocked tasks and hours, cycle time, estimate against actual. Use `count`, `points`, and `hours` as given, story and task points apart.
3. State the limits in `notes`: blocked time is best effort from task history, cycle time starts at creation, the estimate comparison needs the commitment snapshot.
4. Ask what went well, what did not, and what to try. Use the facts to ask questions. Do not invent a cause.
5. Agree on at most three actions, each with an owner.

## 4. File the actions

For each agreed action, once the user says yes, create a task through the `asana` skill's [create-task procedure](../../asana/references/create-task.md), with the owner as assignee. Do not file an action nobody agreed to.

## 5. Offer to close the sprint

End by offering `cyber-asana sprint close --sprint <ref>`. The policy's `carry_over` decides what it does (`move` puts the open tasks in the next sprint's section, creating it when missing; `leave` keeps them). Say which it is and how many tasks it affects (`carry_over` in the report), and run it only on the user's yes.
