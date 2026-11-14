---
"cyber-asana": minor
---

Add `cyber-asana report dashboard --page <path>`. It writes the dashboard as one self-contained HTML file with a burndown, the health findings, a workload bar per person, and a velocity bar per closed sprint, and publishes nothing. The page has no script and fetches nothing, escapes every task name and text, follows light and dark mode, and fits a phone. A report that is missing, failed, or unsupported is named in its section. It prints the path, or with `--json` returns `{ path, bytes, sections }`. It overwrites a page it wrote before and refuses any other existing file with `page-path-refused` (exit `2`).

The `asana-scrum` skill's dashboard route now offers to write the page and tells you where it is.
