---
description: Link the current branch's pull or merge request to its Asana task with a comment, on any major git host.
argument-hint: '<a PR or MR URL, an Asana task URL or GID>'
---

Link a pull or merge request to its Asana task for this request:

$ARGUMENTS

Load the `asana` skill from the cyber-asana plugin and follow its **Link a PR** route, which reads
the PR-linking procedure in the skill's `references/link-pr.md`. Pass the request above as its
input. When the request is empty, link the current branch's pull or merge request.
