---
"cyber-asana": minor
---

Rename and broaden the `pin-asana-projects` skill to `manage-asana-registry`. It now covers adding, removing, and refreshing both projects and users, in either the committed repo config or the personal global registry, rather than only seeding projects into the repo config. Anyone installing the old skill by name (`npx skills add cyberuni/cyber-asana --skill pin-asana-projects`) should switch to `manage-asana-registry`.
