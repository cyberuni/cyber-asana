---
"cyber-asana": minor
---

Add `cyber-asana html check | fix | rules` and the `asana_html_check`, `asana_html_fix` and `asana_html_rules` MCP tools. They read one rule table of the rich text Asana accepts per surface (`task-notes`, `status-update`), with the live probe behind each rule and the tags not yet verified on a surface. `fix` normalizes a body for a surface, for example writing a status-update heading as a `<strong>` line, because Asana escapes the whole body of a status update that holds `<h1>`-`<h3>`. No API call.
