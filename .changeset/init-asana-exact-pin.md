---
"cyber-asana": patch
---

`init-asana` again pins `npx cyber-asana@<exact>` to the version it resolves with `npm view`, instead of carrying a literal version that contradicted that step. The skill is now exempt from the release step's pin stamping, which had overwritten the placeholder. It also drops two dated size figures and keeps the reasons.
