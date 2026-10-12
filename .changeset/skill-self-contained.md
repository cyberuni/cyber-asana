---
"cyber-asana": minor
---

Make the skills self-contained. `init-asana` no longer ships `scripts/cyber-asana.mjs`, which reached out of the skill folder to `dist/cli.js`. It resolves the CLI as `pnpm exec cyber-asana` where `cyber-asana` is a direct dependency, then a global install, then a pinned `npx cyber-asana@<exact>`. Skill README links to sibling skills are now GitHub URLs, and the `repobuddy` call in `link-pr` is pinned to an exact version.
