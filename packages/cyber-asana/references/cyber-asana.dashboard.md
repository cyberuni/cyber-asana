---
description: The scrum dashboard — which reports it runs and in what order, which forms it takes, where a status update is posted, how health findings set its status, and the templates for the status update and the page.
tags: [asana, scrum, reports, dashboard]
reports: [sprint, health, workload, velocity]
forms: [cli]
status_parent: scope-default
status_rules:
  off_track: error
  at_risk: warning
  otherwise: on_track
---

## Status update

`report dashboard --post-status` fills this section from the dashboard JSON and posts it. A team patches it to change what a posted status update says.

Placeholders are in curly braces and every value is HTML-escaped. A line whose figure the dashboard did not compute is left out, and so is a heading left with no lines. A commitment that could not be rebuilt reads "unknown (no commitment snapshot)", never zero. A line holding `{finding}` is written once per health finding, and a line holding `{person}`, `{load}`, `{capacity}`, or `{flag}` once per person.

Scalars: `{scope}`, `{sprint}`, `{status}` (the label, such as "At risk"), `{status_type}`, `{errors}`, `{warnings}`, `{committed_tasks}`, `{completed_tasks}`, `{completion_rate}`, `{story_completed}`, `{story_committed}`, `{task_completed}`, `{task_committed}`, `{velocity_window}`, `{velocity_story}`, `{velocity_task}`. An unknown placeholder stops the post with `status-template-invalid`.

Title: `{sprint} — {status}`

Body, in Asana's HTML subset (the `tidy-description` reference of the `asana` skill lists what it allows: no `<p>`, `<br>`, or `<th>`, and real newlines between blocks). The post is checked against that subset before it is sent:

```html
<body><h2>Health</h2>
<ul>
<li><strong>{errors} errors</strong>, {warnings} warnings</li>
<li>{finding}</li>
</ul>
<h2>Sprint</h2>
<ul>
<li>Committed {committed_tasks} tasks, completed {completed_tasks} ({completion_rate} by count)</li>
<li>Story points: {story_completed} of {story_committed}</li>
<li>Task points: {task_completed} of {task_committed}</li>
</ul>
<h2>Workload</h2>
<ul>
<li>{person}: {load} of {capacity} ({flag})</li>
</ul>
<h2>Velocity</h2>
<ul>
<li>Mean of the last {velocity_window} sprints: {velocity_story} story points, {velocity_task} task points</li>
</ul>
</body>
```

Keep story points and task points apart.

## Page

A team patches this section to change the generated page. Sections, in order:

- **Header**: the scope, the sprint name and dates, and the status type with the findings behind it.
- **Burndown**: a line chart of tasks remaining per day, from the sprint report's burndown.
- **Health**: the findings grouped by level, each with its fix command.
- **Workload**: a bar per person, load against capacity, with a mark for the flag.
- **Velocity**: a bar per closed sprint, story and task points apart, with the mean.
- **Notes**: every note the reports carried, and every report the dashboard could not compute.
