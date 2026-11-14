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

A team patches this section to change what a posted status update says. Placeholders in angle brackets are filled from the dashboard JSON; leave out any line whose data the dashboard did not compute.

Title: `<sprint name> — <status label>`

Body, in Asana's HTML subset (the `tidy-description` reference of the `asana` skill lists what it allows: no `<p>`, `<br>`, or `<th>`, and real newlines between blocks):

```html
<body><h2>Health</h2>
<ul>
<li><strong><error count> errors</strong>, <warning count> warnings</li>
<li><finding line: check ID, task name, message></li>
</ul>
<h2>Sprint</h2>
<ul>
<li>Committed <n> tasks, completed <n> (<rate> by count)</li>
<li>Story points: <completed> of <committed>; task points: <completed> of <committed></li>
</ul>
<h2>Workload</h2>
<ul>
<li><person>: <load> h of <capacity> h (<flag>)</li>
</ul>
<h2>Velocity</h2>
<ul>
<li>Mean of the last <window> sprints: <story> story points, <task> task points</li>
</ul>
</body>
```

Keep story points and task points apart. Never turn a missing figure into zero: write "unknown" and the reason.

## Page

A team patches this section to change the generated page. Sections, in order:

- **Header**: the scope, the sprint name and dates, and the status type with the findings behind it.
- **Burndown**: a line chart of tasks remaining per day, from the sprint report's burndown.
- **Health**: the findings grouped by level, each with its fix command.
- **Workload**: a bar per person, load against capacity, with a mark for the flag.
- **Velocity**: a bar per closed sprint, story and task points apart, with the mean.
- **Notes**: every note the reports carried, and every report the dashboard could not compute.
