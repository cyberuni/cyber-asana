---
'cyber-asana': patch
---

Fix `report dashboard --post-status` posting an escaped body. Asana escapes a whole status update when it holds a heading (`<h1>`-`<h3>`), so the shipped `cyber-asana.dashboard` template marks its headings with `<strong>`, and a template that still uses a heading is refused with `status-body-invalid` before anything is posted.
