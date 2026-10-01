---
description: Scan the codebase for TODO and FIXME comments and create Asana tasks for the ones you approve.
argument-hint: '<directory to scan, a target project, file extensions>'
---

Import TODO and FIXME comments as Asana tasks for this request:

$ARGUMENTS

Load the `asana` skill from the cyber-asana plugin and follow its **Import TODOs** route, which
reads the TODO-import procedure in the skill's `references/import-todos.md`. Pass the request above
as its input. When the request is empty, scan the current working directory.
