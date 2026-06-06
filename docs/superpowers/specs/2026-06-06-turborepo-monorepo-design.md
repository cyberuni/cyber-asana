# Turborepo Monorepo Conversion + Starlight Doc Site

**Date:** 2026-06-06
**Status:** Approved

## Goal

Convert `cyber-asana` from a single-package repo into a turborepo monorepo. Add an Astro + Starlight GitHub doc site at `apps/web`.

## Repo Layout

```
cyber-asana/                    ← repo root (git stays here)
  apps/
    web/                        ← Astro + Starlight doc site
      src/
        assets/
        content/
          docs/
            index.mdx           ← landing page
            getting-started.md
            cli/
              index.md          ← CLI reference
            mcp/
              index.md          ← MCP server reference
            skills/
              index.md          ← Skills reference
          config.ts
        env.d.ts
      public/
      astro.config.mjs
      package.json              ← name: "@cyberuni/web", private: true
      tsconfig.json
  packages/
    cyber-asana/                ← current root package moved here
      src/
      dist/
      package.json              ← name: "cyber-asana" (unchanged, public)
      tsconfig.json
      tsdown.config.ts
      vitest.config.ts
      vitest.system.config.ts
      knip.json
      ...
  .changeset/                   ← stays at root
  .github/                      ← stays at root
  biome.json                    ← root-level, shared across packages
  package.json                  ← workspace root (private: true, no source)
  pnpm-workspace.yaml           ← packages: ["apps/*", "packages/*"]
  turbo.json
```

## Turbo Pipeline

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    }
  }
}
```

- `apps/web` build depends on `packages/cyber-asana` build via `^build`
- `typecheck` and `test` wait for upstream build so type-gen is ready
- `lint` is independent — runs in parallel
- `dev` is persistent for the Astro dev server

Root `package.json` scripts:

```json
{
  "build": "turbo run build",
  "dev": "turbo run dev --filter=@cyberuni/web",
  "lint": "turbo run lint",
  "test": "turbo run test",
  "typecheck": "turbo run typecheck"
}
```

## Astro + Starlight Site (`apps/web`)

- Framework: Astro with `@astrojs/starlight`
- Site title: `cyber-asana`
- Sidebar sections: Getting Started → CLI → MCP → Skills
- GitHub edit links pointing to the monorepo
- `package.json` name: `@cyberuni/web`, `private: true`

Doc pages (initial):

| Path | Content |
|------|---------|
| `docs/index.mdx` | Landing page |
| `docs/getting-started.md` | Install + quick start |
| `docs/cli/index.md` | CLI reference |
| `docs/mcp/index.md` | MCP server reference |
| `docs/skills/index.md` | Skills reference |

## Migration Steps (high level)

1. Update root `pnpm-workspace.yaml` — add `packages: ["apps/*", "packages/*"]`, keep existing `allowBuilds` and `onlyBuiltDependencies` entries
2. Create `packages/cyber-asana/` and move all source files there
3. Update root `package.json` to workspace root (private, add turbo devDep)
4. Add `turbo.json` at root
5. Scaffold `apps/web/` with Astro + Starlight
6. Update `.changeset/config.json` to point to `packages/cyber-asana`
7. Update `biome.json` paths if needed
8. Verify `pnpm install` and `turbo run build` succeed
