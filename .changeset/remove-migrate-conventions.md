---
'cyber-asana': minor
---

Remove `config migrate-conventions`. A repo config that still has a `conventions` block is still rejected; the error now says to move its keys into the frontmatter of `.agents/references/cyber-asana.task-conventions.md` and delete the block.
