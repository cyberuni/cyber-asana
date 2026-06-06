# Turborepo Monorepo Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the `cyber-asana` repo from a single-package layout into a turborepo monorepo with the package at `packages/cyber-asana/` and an Astro + Starlight doc site at `apps/web/`.

**Architecture:** The repo root becomes a private workspace root that delegates all builds through `turbo.json`. The publishable `cyber-asana` npm package lives in `packages/cyber-asana/`. The doc site lives in `apps/web/` and is private/never published. Turbo orchestrates build, lint, typecheck, and test across both packages with caching.

**Tech Stack:** pnpm workspaces, Turbo 2.x, Astro 5.x, Starlight, Biome, tsdown, Vitest

---

## File Map

### Created
- `packages/cyber-asana/` — publishable package (source moved here from root)
- `packages/cyber-asana/package.json` — package manifest (derived from root package.json)
- `apps/web/package.json` — Astro site manifest
- `apps/web/astro.config.mjs` — Astro + Starlight config
- `apps/web/tsconfig.json` — TypeScript config for Astro
- `apps/web/src/env.d.ts` — Astro client types
- `apps/web/src/content/config.ts` — content collection schema
- `apps/web/src/content/docs/index.mdx` — landing page
- `apps/web/src/content/docs/getting-started.md` — install + quick start
- `apps/web/src/content/docs/cli/index.md` — CLI reference
- `apps/web/src/content/docs/mcp/index.md` — MCP server reference
- `apps/web/src/content/docs/skills/index.md` — Skills reference
- `turbo.json` — turbo task pipeline

### Modified
- `pnpm-workspace.yaml` — add `packages: ["apps/*", "packages/*"]`
- `package.json` (root) — transform to private workspace root
- `biome.json` — update `includes` and `overrides` paths for monorepo layout
- `knip.json` — add `workspaces` config for monorepo
- `.gitignore` — add `apps/web/.astro` to ignored dirs
- `.github/workflows/pull-request.yml` — update `check:mcp-gap` command

### Moved (git mv — preserves history)
- `src/` → `packages/cyber-asana/src/`
- `tsconfig.json` → `packages/cyber-asana/tsconfig.json`
- `tsdown.config.ts` → `packages/cyber-asana/tsdown.config.ts`
- `vitest.config.ts` → `packages/cyber-asana/vitest.config.ts`
- `vitest.system.config.ts` → `packages/cyber-asana/vitest.system.config.ts`
- `data/` → `packages/cyber-asana/data/`
- `CHANGELOG.md` → `packages/cyber-asana/CHANGELOG.md`

---

## Task 1: Declare pnpm workspaces + add turbo.json + transform root package.json

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `turbo.json`

- [ ] **Step 1: Update `pnpm-workspace.yaml`**

Replace the entire file with:

```yaml
packages:
  - "apps/*"
  - "packages/*"
allowBuilds:
  esbuild: true
onlyBuiltDependencies:
  - "@biomejs/biome"
  - esbuild
```

- [ ] **Step 2: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".astro/**"]
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

- [ ] **Step 3: Transform root `package.json` into private workspace root**

Replace the entire file with:

```json
{
  "name": "cyber-asana-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --filter=@cyberuni/web",
    "lint": "turbo run lint",
    "prepare": "husky",
    "release": "changeset publish",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "version": "changeset version"
  },
  "devDependencies": {
    "@changesets/cli": "^2.29.4",
    "@commitlint/cli": "^21.0.1",
    "@commitlint/config-conventional": "^21.0.1",
    "husky": "^9.1.7",
    "knip": "^6.14.1",
    "turbo": "latest"
  },
  "packageManager": "pnpm@11.2.2+sha512.36e6621fad506178936455e70247b8808ef4ec25797a9f437a93281a020484e2607f6a469a22e982987c3dbb8866e3071514ab10a4a1749e06edcd1ec118436f",
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 4: Run install — should succeed with zero workspace packages yet**

```bash
cd /home/unional/code/cyberuni/cyber-asana
pnpm install
```

Expected: install completes, `node_modules/.pnpm` is populated. No errors.

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml
git commit -m "chore: set up turborepo monorepo workspace root"
```

---

## Task 2: Move cyber-asana source into packages/cyber-asana/

**Files:**
- Create: `packages/cyber-asana/package.json`
- Move: `src/`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `vitest.system.config.ts`, `data/`, `CHANGELOG.md`

**Why git mv:** Preserves file history so `git log -- packages/cyber-asana/src/cli.ts` still shows the full commit history.

- [ ] **Step 1: Create the packages/cyber-asana directory and git mv source files**

```bash
cd /home/unional/code/cyberuni/cyber-asana
mkdir -p packages/cyber-asana
git mv src packages/cyber-asana/src
git mv tsconfig.json packages/cyber-asana/tsconfig.json
git mv tsdown.config.ts packages/cyber-asana/tsdown.config.ts
git mv vitest.config.ts packages/cyber-asana/vitest.config.ts
git mv vitest.system.config.ts packages/cyber-asana/vitest.system.config.ts
git mv data packages/cyber-asana/data
git mv CHANGELOG.md packages/cyber-asana/CHANGELOG.md
```

- [ ] **Step 2: Create `packages/cyber-asana/package.json`**

This is the publishable package manifest. It contains the source-level scripts, deps, and publish config — not husky/changesets/commitlint (those are root concerns).

```json
{
  "name": "cyber-asana",
  "version": "0.4.1",
  "description": "Asana CLI and MCP server for AI agents",
  "repository": {
    "type": "git",
    "url": "https://github.com/cyberuni/cyber-asana.git"
  },
  "author": "unional <homawong@gmail.com>",
  "license": "MIT",
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.system.*"
  ],
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./mcp": {
      "import": "./dist/mcp.js",
      "types": "./dist/mcp.d.ts"
    }
  },
  "bin": {
    "cyber-asana": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsdown",
    "check": "biome check --write .",
    "cyber-asana": "tsx src/cli.ts",
    "dev": "tsx src/cli.ts",
    "check:mcp-gap": "tsx src/gap-analysis/catalog.ts --check",
    "format": "biome format --write .",
    "gap:catalog": "tsx src/gap-analysis/catalog.ts",
    "gap:diff-official": "tsx src/gap-analysis/diff-official.ts",
    "gap:fetch-official": "tsx src/gap-analysis/fetch-official.ts",
    "gap:report": "tsx src/gap-analysis/report.ts",
    "lint": "biome check .",
    "test": "vitest run src",
    "test:system": "vitest run --config vitest.system.config.ts",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "verify": "pnpm typecheck && pnpm lint && pnpm test && pnpm build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "asana": "^3.0.12",
    "commander": "^14.0.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.15",
    "@repobuddy/biome": "^2.3.1",
    "@types/node": "^25.9.1",
    "tsdown": "^0.16.6",
    "tsx": "^4.19.4",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 3: Remove the stale root-level dist/ (it's gitignored but leaves clutter)**

```bash
cd /home/unional/code/cyberuni/cyber-asana
rm -rf dist
```

Expected: `dist/` at repo root is gone. `packages/cyber-asana/dist/` does not yet exist (will be created by the next build).

- [ ] **Step 4: Run install to link the workspace package**

```bash
cd /home/unional/code/cyberuni/cyber-asana
pnpm install
```

Expected: pnpm resolves `packages/cyber-asana` as a workspace package. No errors.

- [ ] **Step 5: Verify the build works from the workspace root**

```bash
cd /home/unional/code/cyberuni/cyber-asana
pnpm turbo run build
```

Expected: turbo runs `build` in `packages/cyber-asana`, tsdown compiles to `packages/cyber-asana/dist/`. Output ends with something like `Tasks: 1 successful, 1 total`.

If turbo is not yet on PATH, use `./node_modules/.bin/turbo run build`.

- [ ] **Step 6: Verify tests pass**

```bash
pnpm turbo run test
```

Expected: 65 test files pass (320 tests). If a test fails with a path error, check that `packages/cyber-asana/data/` exists and the files moved correctly.

- [ ] **Step 7: Commit**

```bash
git add packages/ pnpm-lock.yaml
git commit -m "chore: move cyber-asana source into packages/cyber-asana"
```

---

## Task 3: Update root configs for monorepo layout

**Files:**
- Modify: `biome.json`
- Modify: `knip.json`
- Modify: `.gitignore`

- [ ] **Step 1: Update `biome.json`**

The `files.includes` exclusions must use `**/dist` (recursive) now that dist lives inside a subdirectory. The `overrides` path must point into the package.

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.15/schema.json",
  "extends": ["@repobuddy/biome/recommended"],
  "files": {
    "includes": ["!**/dist", "!**/node_modules", "!skills-lock.json", "!.agents"]
  },
  "overrides": [
    {
      "includes": ["packages/cyber-asana/src/**/*.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsole": {
              "level": "error",
              "options": {
                "allow": ["log", "info", "warn", "error"]
              }
            }
          }
        }
      }
    }
  ]
}
```

- [ ] **Step 2: Update `knip.json`**

Knip v6 supports monorepos via the `workspaces` field. Each workspace entry maps a glob to its entry/project patterns.

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "workspaces": {
    "packages/cyber-asana": {
      "entry": ["src/index.ts", "src/cli.ts", "src/mcp.ts"],
      "project": ["src/**/*.ts"]
    },
    "apps/web": {
      "entry": ["astro.config.mjs", "src/**/*.{astro,ts}"],
      "project": ["src/**/*.{astro,ts}"]
    }
  }
}
```

- [ ] **Step 3: Add `.astro` to `.gitignore`**

Astro generates a `.astro/` directory during build. Append to `.gitignore`:

```
apps/web/.astro
```

- [ ] **Step 4: Verify lint runs across the monorepo**

```bash
cd /home/unional/code/cyberuni/cyber-asana
pnpm turbo run lint
```

Expected: biome checks files in `packages/cyber-asana/src/` with no errors.

- [ ] **Step 5: Commit**

```bash
git add biome.json knip.json .gitignore
git commit -m "chore: update biome and knip configs for monorepo layout"
```

---

## Task 4: Scaffold apps/web/ with Astro + Starlight

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/astro.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/env.d.ts`
- Create: `apps/web/src/content/config.ts`
- Create: `apps/web/src/content/docs/index.mdx`
- Create: `apps/web/src/content/docs/getting-started.md`
- Create: `apps/web/src/content/docs/cli/index.md`
- Create: `apps/web/src/content/docs/mcp/index.md`
- Create: `apps/web/src/content/docs/skills/index.md`

**Note on versions:** The versions below were stable as of the plan's writing date. Before running `pnpm install`, check https://www.npmjs.com/package/astro and https://www.npmjs.com/package/@astrojs/starlight for the current latest versions and update accordingly.

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@cyberuni/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "astro build",
    "dev": "astro dev",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/starlight": "^0.30.0",
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: Create `apps/web/astro.config.mjs`**

```js
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [
    starlight({
      title: 'cyber-asana',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/cyberuni/cyber-asana',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', link: '/' },
            { label: 'Getting Started', link: '/getting-started/' },
          ],
        },
        { label: 'CLI', autogenerate: { directory: 'cli' } },
        { label: 'MCP', autogenerate: { directory: 'mcp' } },
        { label: 'Skills', autogenerate: { directory: 'skills' } },
      ],
      editLink: {
        baseUrl: 'https://github.com/cyberuni/cyber-asana/edit/main/',
      },
    }),
  ],
})
```

- [ ] **Step 3: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Create `apps/web/src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
```

- [ ] **Step 5: Create `apps/web/src/content/config.ts`**

```ts
import { defineCollection } from 'astro:content'
import { docsSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
}
```

- [ ] **Step 6: Create `apps/web/src/content/docs/index.mdx`**

```mdx
---
title: cyber-asana
description: Asana CLI and MCP server for AI agents
template: splash
hero:
  tagline: Asana CLI and MCP server for AI agents
  actions:
    - text: Getting Started
      link: /getting-started/
      icon: right-arrow
    - text: GitHub
      link: https://github.com/cyberuni/cyber-asana
      icon: external
      variant: minimal
---
```

- [ ] **Step 7: Create `apps/web/src/content/docs/getting-started.md`**

```md
---
title: Getting Started
description: Install and configure cyber-asana
---

## Installation

Install the CLI globally:

```bash
npm install -g cyber-asana
```

Or run directly with npx:

```bash
npx cyber-asana --help
```

## Configuration

Set your Asana personal access token:

```bash
export ASANA_ACCESS_TOKEN=your_token_here
```

Alternatively, create a `.env` file in your project root:

```
ASANA_ACCESS_TOKEN=your_token_here
```

## Quick Start

```bash
# List your tasks
cyber-asana tasks list

# Start the MCP server
cyber-asana mcp
```
```

- [ ] **Step 8: Create `apps/web/src/content/docs/cli/index.md`**

```md
---
title: CLI Reference
description: cyber-asana command-line interface reference
---

The `cyber-asana` CLI provides commands to interact with Asana from your terminal.

## Usage

```bash
cyber-asana [command] [options]
```

## Commands

| Command | Description |
|---------|-------------|
| `tasks` | Manage Asana tasks |
| `projects` | Manage Asana projects |
| `mcp` | Start the MCP server |

Run `cyber-asana --help` for the full command list.
```

- [ ] **Step 9: Create `apps/web/src/content/docs/mcp/index.md`**

```md
---
title: MCP Server
description: cyber-asana Model Context Protocol server reference
---

The `cyber-asana` MCP server exposes Asana operations as tools for AI agents.

## Starting the Server

```bash
cyber-asana mcp
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cyber-asana": {
      "command": "npx",
      "args": ["-y", "cyber-asana", "mcp"],
      "env": {
        "ASANA_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Available Tools

See the [MCP catalog](https://github.com/cyberuni/cyber-asana/blob/main/data/cyber-asana-mcp-catalog.json) for the full list of exposed tools.
```

- [ ] **Step 10: Create `apps/web/src/content/docs/skills/index.md`**

```md
---
title: Skills
description: AI agent skills powered by cyber-asana
---

cyber-asana ships a set of AI agent skills that wrap common Asana workflows.

## Available Skills

| Skill | Description |
|-------|-------------|
| `asana-standup` | Generate a standup report from your Asana tasks |
| `asana-sprint-report` | Summarize a sprint's completed and in-progress work |
| `create-tasks-from-code` | Create Asana tasks from code annotations |
| `init-asana` | Initialize Asana configuration for a project |
| `link-pr-to-task` | Link a pull request to an Asana task |
| `sync-asana-project` | Sync Asana project state to a local file |

## Installing Skills

Skills are installed via the `skills` directory. See the [CONTRIBUTING guide](/contributing/) for how to author new skills.
```

- [ ] **Step 11: Install Astro dependencies**

```bash
cd /home/unional/code/cyberuni/cyber-asana
pnpm install
```

Expected: `apps/web/node_modules/@astrojs/starlight` and `apps/web/node_modules/astro` appear. No errors.

- [ ] **Step 12: Verify the doc site builds**

```bash
pnpm turbo run build --filter=@cyberuni/web
```

Expected: Astro builds static HTML to `apps/web/dist/`. Output contains `✓ Completed in`.

If the build fails with a version mismatch between `astro` and `@astrojs/starlight`, update the versions in `apps/web/package.json` to the latest compatible pair (check https://www.npmjs.com/package/@astrojs/starlight for the peer dependency requirements).

- [ ] **Step 13: Commit**

```bash
git add apps/ pnpm-lock.yaml
git commit -m "feat: scaffold Astro + Starlight doc site at apps/web"
```

---

## Task 5: Update CI workflow + final verification

**Files:**
- Modify: `.github/workflows/pull-request.yml`

- [ ] **Step 1: Update `check:mcp-gap` command in the PR workflow**

The `pnpm check:mcp-gap` command now lives in `packages/cyber-asana`. Update `.github/workflows/pull-request.yml`:

Change:
```yaml
      - run: pnpm check:mcp-gap
```

To:
```yaml
      - run: pnpm --filter cyber-asana check:mcp-gap
```

- [ ] **Step 2: Run the full turbo pipeline from root**

```bash
cd /home/unional/code/cyberuni/cyber-asana
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

Expected: all tasks complete successfully. Turbo shows cache hits for unchanged tasks on subsequent runs.

- [ ] **Step 3: Verify turbo caching works**

```bash
pnpm build
```

Expected: second run shows `FULL TURBO` cache hits (no re-execution).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pull-request.yml
git commit -m "chore: update CI to use pnpm --filter for monorepo commands"
```

---

## Completion Checklist

- [ ] `pnpm install` succeeds from root
- [ ] `turbo run build` compiles `packages/cyber-asana/dist/` and `apps/web/dist/`
- [ ] `turbo run test` passes all 65 test files (320 tests) in `packages/cyber-asana`
- [ ] `turbo run lint` runs biome with no errors
- [ ] `turbo run typecheck` passes
- [ ] `apps/web` Starlight site has 5 doc pages (index, getting-started, cli, mcp, skills)
- [ ] `pnpm --filter cyber-asana check:mcp-gap` succeeds
- [ ] Second `turbo run build` shows cache hits
