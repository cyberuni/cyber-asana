---
name: setup-changesets
description: "Use this skill when setting up changesets, release CI, or migrating from another release tool."
metadata:
  internal: true
---

# Setup Changesets

## When to use

- First-time changesets setup in a repo (single package or monorepo)
- Adding or fixing the CI release workflow (`changesets/action` on GitHub, or direct `version`/`publish` elsewhere)
- Migrating from semantic-release, release-it, lerna, release-please, or similar tools

**Not this skill:**

- Adding a changeset to the current PR → use **`add-changeset`**
- GitHub branch protection / Dependabot only → use **`setup-github-repo`** (repobuddy main repo)

Trigger phrases: `'add changesets'`, `'set up releases'`, `'configure versioning'`, shared `<org>/.github` release workflow.

## Instructions

### Step 1 — Detect and gate

**Detect automatically** (do not ask if filesystem answers it):

| Check | How |
|---|---|
| Package manager | `pnpm-lock.yaml`, `bun.lock`/`bun.lockb`, `yarn.lock`, `package-lock.yaml` |
| Monorepo | `pnpm-workspace.yaml`, `workspaces` in root `package.json`, or `bun.workspace.ts` |
| Already initialized | `.changeset/` directory exists |
| CI platform | `.github/workflows/` → GitHub Actions; `.gitlab-ci.yml` → GitLab; `.circleci/config.yml` → CircleCI; `bitbucket-pipelines.yml` → Bitbucket; `azure-pipelines.yml` → Azure; `Jenkinsfile` → Jenkins; `.travis.yml` → Travis; `.drone.yml` → Drone; none → ask |

**Competing release tools** — check `package.json` deps and config files:

| Tool | Detection | Migration reference |
|---|---|---|
| semantic-release | dep or `.releaserc*` / `release.config.*` / `"release"` in `package.json` | `references/migration/semantic-release.md` |
| release-it | dep or `.release-it.*` / `"release-it"` in `package.json` | `references/migration/release-it.md` |
| standard-version | dep or `.versionrc*` / `"standard-version"` in `package.json` | `references/migration/standard-version.md` |
| beachball | dep or `beachball.config.json` | `references/migration/beachball.md` |
| release-please | `release-please-config.json` / `.release-please-manifest.json` | `references/migration/release-please.md` |
| auto (Intuit) | dep or `.autorc*` | `references/migration/auto.md` |
| Nx Release | `nx` in deps and `"release"` in `nx.json` | `references/migration/nx-release.md` |
| lerna | `lerna.json` | `references/migration/lerna.md` |
| bumpp | dep | `references/migration/bumpp.md` |
| changelogen | dep | `references/migration/changelogen.md` |

**Early exits:**

| Condition | Action |
|---|---|
| `.changeset/` already exists | Skip Step 2 init; audit config/scripts/CI only |
| Competing tool detected | Ask: migrate to changesets? **No** → stop. **Yes** → read only the matching `references/migration/<tool>.md` file(s), apply removal, then continue |
| Non-GitHub CI and user expects a Version Packages PR | Explain that pattern is GitHub-only; proceed with `references/ci/_common.md` or stop |

**Ask the user:**

1. Shared workflow in `<org-or-user>/.github`? **Yes** → Option B in Step 5. **No** → inline workflow.
2. Monorepo: any `fixed` groups (same version always)?
3. Any packages to `ignore` (private/internal, not published)?

Read reference files **only when detection matches** — never preload all migration or CI files.

### Step 2 — Initialize

Skip if `.changeset/` already exists.

```bash
# pnpm
pnpm dlx @changesets/cli init

# bun
bunx @changesets/cli init

# npm / yarn
npx @changesets/cli init
```

Creates `.changeset/config.json` and `.changeset/README.md`.

### Step 3 — Configure `.changeset/config.json`

Replace the generated config. Set `baseBranch` to the repo's default branch if not `main`.

**Single package:**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main"
}
```

**Monorepo with grouped packages:**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "fixed": [["package-a", "package-b"]],
  "linked": [],
  "ignore": ["internal-tools"],
  "updateInternalDependencies": "patch"
}
```

Key decisions:

- `"access": "public"` — required for publishing scoped packages (`@scope/name`) publicly
- `"fixed"` — packages that must share the exact same version
- `"linked"` — packages that share the highest bump type but keep independent versions
- `"ignore"` — excluded from changeset versioning (e.g. `examples`, internal CLIs)
- `"commit": false` — recommended; CI/action controls commits

### Step 4 — Add scripts to `package.json`

```json
{
  "scripts": {
    "version": "changeset version",
    "release": "changeset publish",
    "cs": "changeset"
  }
}
```

If a build must run before publish: `"release": "<pm> build && changeset publish"`.

### Step 5 — CI release workflow

#### GitHub Actions — Option A (inline)

Create `.github/workflows/release.yml`:

```yaml
name: release
on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Insert package manager setup here (see below)

      - run: <install-command>
      - run: <build-command>        # remove if no build step

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          version: <pm> run version
          publish: <pm> run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Replace `<pm>` and `<install-command>` from Step 1. **Package manager setup:**

pnpm:

```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm
```

bun:

```yaml
- uses: oven-sh/setup-bun@v2
- uses: actions/setup-node@v4
  with:
    node-version: 22
```

npm/yarn:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm   # or: yarn
```

**Token note:** `GITHUB_TOKEN` is enough for most repos. If branch protection requires CI on the **Version Packages** PR, use a PAT with `repo` scope as `RELEASE_TOKEN` and pass `GITHUB_TOKEN: ${{ secrets.RELEASE_TOKEN }}`.

#### GitHub Actions — Option B (shared workflow)

In `<user-or-org>/.github`, create `.github/workflows/release-changeset.yml`:

```yaml
name: release-changeset
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'
    outputs:
      published:
        description: 'Whether packages were published'
        value: ${{ jobs.release.outputs.published }}

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      published: ${{ steps.changesets.outputs.published }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      # Add package manager setup, install, build
      - name: Create Release PR or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          version: <pm> run version
          publish: <pm> run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

In each consuming repo:

```yaml
name: release
on:
  push:
    branches: [main]

jobs:
  release:
    uses: <user-or-org>/.github/.github/workflows/release-changeset.yml@main
    secrets: inherit
```

#### Other CI platforms

Read `references/ci/_common.md` for the non-GitHub pattern, then the platform file:

| Platform | Reference |
|---|---|
| GitLab | `references/ci/gitlab.md` |
| CircleCI | `references/ci/circleci.md` |
| Bitbucket | `references/ci/bitbucket.md` |
| Azure Pipelines | `references/ci/azure-pipelines.md` |
| Jenkins | `references/ci/jenkins.md` |
| Travis CI | `references/ci/travis.md` |
| Drone | `references/ci/drone.md` |

### Step 6 — Secrets

- `NPM_TOKEN` — npm automation token ([npm access tokens](https://www.npmjs.com/settings/~account/tokens))
- `RELEASE_TOKEN` — optional GitHub PAT if branch protection blocks the Version Packages PR

### Step 7 — Verify

```bash
npx changeset add --empty
ls .changeset/
gh workflow list   # GitHub only
```

## After setup

1. Developers add changeset files via the **`add-changeset`** skill (do not duplicate its bump/summary rules here).
2. PR merges to main → CI opens/updates **Version Packages** PR (GitHub) or version+publishes in one run (other CI).
3. Merge Version Packages PR → publish to npm.

Do not manually edit `CHANGELOG.md` or versions on the Version Packages PR.
