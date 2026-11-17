---
title: Project briefs
description: Read and write a project's brief, its charter or sprint goal.
sidebar:
  order: 26
---

A project holds one brief: a title and a body that states the charter or the sprint goal.
Use it to set the goal at sprint planning, read the charter before triaging, or remove a stale
brief.

```sh
cyber-asana project-brief create --project-gid <project-gid> --title "Sprint 13 goal" --html-text '<body><strong>Goal</strong> Ship briefs</body>'
cyber-asana project-brief get <gid>
cyber-asana project-brief update <gid> --text "New goal"
cyber-asana project-brief delete <gid>
```

| Command | Arguments | Options |
| --- | --- | --- |
| `get` | `<gid>` | `--opt-fields <fields>` |
| `create` | — | `--project-gid <gid>` / `--project <gid>` (required), `--title`, `--text`, `--html-text` |
| `update` | `<gid>` | `--title`, `--text`, `--html-text`. Give at least one |
| `delete` | `<gid>` | — (succeeds with `already_absent` when the brief is gone) |

The brief's GID is not the project's. `project-brief create` prints it; to find the brief of an
existing project, read the project with `--opt-fields project_brief` and pass that GID to `get`.

## Rich text

`--html-text` is Asana rich text, so the same subset rules as task notes apply: wrap the text in
`<body>`, use `<h1>`–`<h3>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a>`, `<blockquote>`,
`<code>`, `<pre>`, `<hr/>`, and avoid `<p>`, `<br>` and `<div>`. `create` and `update` check the
text against the `project-brief` surface of `html rules` before calling Asana, because Asana
answers an unparsable body with "XML is invalid" and no detail. `cyber-asana html fix --surface
project-brief` normalizes a draft.

The rules come from a live probe recorded in `src/asana-html/surfaces.ts` (2026-11-15). Asana's
brief endpoints are not covered by a system run on every release, so treat a surprise as a
reason to re-run `pnpm test:system`.
