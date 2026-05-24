---
"cyber-asana": minor
---

Add `create*Api` factory functions and `*Gateway` types for all remaining domains (workspaces, sections, users, teams, attachments, portfolios, goals, tasks, projects).

Each domain now exposes a `create*Api(gateway)` factory that accepts an injected gateway, enabling use without the Asana SDK or real API calls. The Asana-backed `createAsana*Gateway(client)` factory is also exported for runtime composition.
