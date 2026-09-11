---
"cyber-asana": patch
---

Bundle the CLI's dependencies into `dist/cli.js`, and let the skills invoke it directly.

An installed agent plugin is a copy of a source checkout, not an npm install, so its directory has
no reliable `node_modules`. That is why every skill had to shell out through a pinned `npx` — the
fetch was the only thing supplying the dependency tree. The published `dist/cli.js` now inlines each
runtime dependency and runs with no `node_modules` present at all.

`skills/init-asana/scripts/cyber-asana.mjs` launches that shipped CLI, and the **Ensure cyber-asana
CLI** section now prefers it, falling back to a global install and then to pinned `npx` exactly as
before. The fallback is deliberate: resolving the launcher path is model behaviour, not a guarantee.

The library entries (`.` and `./mcp`) are unchanged. Their dependencies stay external so a consumer
that also uses zod or the MCP SDK shares one copy instead of getting a private inlined duplicate.
