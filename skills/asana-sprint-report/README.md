# asana-sprint-report

Produce a sprint summary — completed vs incomplete tasks — for retrospectives or stakeholder updates.

## When to use

Use this skill when the user asks for a sprint summary, retrospective data, or completion stats for a project or section.

Good triggers include:

- "Sprint report for this project"
- "What did we complete this sprint?"
- "Retro data from Asana"
- Completion rate for a section or sprint

## What it does

The skill guides:

- Identifying project and section scope (and sprint start date)
- Fetching completed tasks since the sprint start
- Fetching incomplete tasks (optionally filtered by section)
- Computing completion rate and writing a narrative summary
- Offering to move incomplete tasks to the next sprint section

## Install

```bash
npx skills add cyberuni/cyber-asana --skill asana-sprint-report
```

Requires `ASANA_TOKEN`, `ASANA_WORKSPACE`, and a target project. See [`init-asana`](../init-asana/README.md) for setup.
