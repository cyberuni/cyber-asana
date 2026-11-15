---
'cyber-asana': minor
---

`html check`, `html fix` and `html rules` now cover comments (`--surface comment`) and project briefs (`--surface project-brief`), and the status-update rules are fully probed. A live probe on 2026-11-15 found that a status update also escapes `<table>`, `<tr>`, `<td>` and `<hr>`, which task notes keep; `html check` now flags them there. No tag is left `unverified`.
