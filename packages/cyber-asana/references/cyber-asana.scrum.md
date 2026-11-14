---
description: How a team runs scrum on Asana — sprint length and anchor, workflow states, what counts as blocked, carry-over, velocity, working time, and the procedure for refinement, planning, standup, review, and retro.
tags: [asana, scrum, sprints, ceremonies, policy]
# Scrum policy the cyber-asana CLI and MCP read from this frontmatter. Override a key in a repo
# copy at .agents/references/cyber-asana.scrum.md (no `merge` key needed), not here. Policy only:
# project, portfolio, team, and field GIDs belong in .agents/cyber-asana.json.
sprint_model: sections
sprint_length_days: 14
# sprint_anchor_date: 2026-01-05   # the first day of sprint 1; setup asks for it
sprint_name_format: "Sprint {n}"
backlog_section: Backlog
state_carrier: none
workflow_states:
  backlog: Backlog
  ready: Ready
  in_progress: In Progress
  review: Review
  done: Done
blocked_signals: [dependency]
carry_over: move
velocity_window: 3
hours_per_point: 1
working_hours_per_day: 8
working_days: [mon, tue, wed, thu, fri]
standup_window: previous_working_day
---

## Definition of ready

A task can enter a sprint when:

- its name states the outcome and its `## Done when` says how anyone can tell it is finished;
- it is estimated in points, as the `cyber-asana.task-conventions` reference says;
- it has no open dependency on a task outside the sprint;
- it is small enough to finish inside one sprint. Split it when it is not.

## Definition of done

A task is done when:

- everything its `## Done when` names is true;
- its change is merged, or released when the team ships on release;
- its actual points are recorded, as the `cyber-asana.task-conventions` reference says;
- it is marked complete in Asana.

## Refinement

- Work the top of the backlog, in its order, until the next sprint's likely load is ready.
- Bring each task up to the **Definition of ready**: sharpen the outcome, add `## Done when`, estimate it, and split what is too large.
- Record each decision as a comment on the task, not as a rewrite of its description.
- Leave a task in the backlog, and say why, when nobody can say what done means yet.

## Planning

- Start from the velocity: the average completed points over the last `velocity_window` sprints. With fewer sprints, use what exists and say so.
- Compare it with the team's capacity for the sprint when Asana Allocations has it. When it does not, say capacity is unknown and plan from velocity alone.
- Pull ready tasks from the top of the backlog until the commitment reaches the velocity. Never pull a task that is not ready.
- Name a sprint goal in one sentence: the outcome the committed tasks serve.
- Confirm the commitment with the team before the sprint starts.

## Standup

For each person, from the `standup_window`:

- **Done:** tasks completed in the window.
- **Today:** incomplete tasks in the current sprint assigned to them.
- **Blocked:** tasks in the current sprint that a `blocked_signals` entry marks, with what blocks each.

Keep it to facts from Asana. Raise a blocker as a question for the person who can clear it.

## Review

- Show what the sprint completed against what it committed, in tasks and in points.
- Name each committed task not done and where it goes: carried to the next sprint or back to the backlog, as `carry_over` says.
- List the work added after the sprint started.
- Ask for feedback on the completed work and record it as backlog tasks.

## Retro

- Gather what went well, what did not, and what to try, from the team and from the sprint's facts: carry-over, scope added, time blocked.
- Agree on at most three actions, each with an owner, and record each one as a task.
- Open with the previous retro's actions and whether each was done.
