# init-asana-scrum

Set up scrum on Asana for a repo or team: scope, sprint model, fields, backlog, current sprint, and policy.

## When to use

Use this skill when setting up scrum on Asana, or when re-running that setup to review or change it.

Good triggers include:

- "Set up scrum for this repo in Asana"
- "Configure sprints for these projects"
- "Create the backlog and start the first sprint"

## What it does

The skill guides, asking before it creates or writes anything:

- Checking `init-asana` prerequisites
- Adding a `project` or `projects` scope with `config scope add`
- Choosing the `sections` sprint model and showing its requirements
- Reporting the points, `sprint`, and `status` fields `config discover-fields` finds (creating them is a later unit)
- Creating the backlog section and starting the current sprint
- Writing only non-default policy keys into `.agents/references/cyber-asana.scrum.md`
- Verifying with `report health`

Re-running it shows the setup and changes only what you pick.
