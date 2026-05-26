---
name: patch-skill
description: Use this skill when contributing local improvements to an installed skill back to its source repo via PR.
metadata:
  internal: true
---

# Patch Skill

When you have improved a skill you installed from another repo, this skill guides you through contributing that improvement back to the source via a pull request.

## When to use

- You modified a skill (global `~/.agents/skills/<name>/` or repo-internal `.agents/skills/<name>/`) and want to send the improvement upstream
- The skill was installed from a public repo tracked in `skills-lock.json`

Do NOT use for repo-native skills under this repo's `skills/<name>/` — if you're the author here, this repo IS the source.

## Source repository scope (required)

Only update files under the source repo's canonical skills tree:

```text
<repo-root>/skills/<skill-name>/
  SKILL.md
  scripts/          ← include when changed
  …                 ← any other files in that skill folder
```

Rules:

- **Always** map upstream paths to `skills/<skill-name>/…`, even when `skills-lock.json` `skillPath` points at `.agents/skills/…` or another layout in the consumer repo.
- **Never** update `.agents/skills/`, duplicate trees, or paths outside `skills/<skill-name>/` in the source repository.
- Include every changed file under that skill folder (e.g. `scripts/*.mjs`), not only `SKILL.md`.
- Never include `SKILL.local.md` — local augmentations stay local.

Derive paths:

| Input | Upstream path |
| --- | --- |
| Lock key / folder name `audit-skill` | `skills/<skill-name>/` |
| `skillPath`: `.agents/skills/create-skill/SKILL.md` | `skills/<skill-name>/SKILL.md` |
| `skillPath`: `skills/fix-security-pr/SKILL.md` | `skills/fix-security-pr/SKILL.md` |

## Steps

### 1. Identify the skill(s) to patch

From context or ask the user. Look up origin using the `cyber-skills` CLI, which checks the repo-local lock, the global lock, and `npx skills find` in order:

```bash
npx cyber-skills@<version> skill source <skill-name>
```

Output is JSON: `{ name, source, sourceUrl, skillPath, foundIn }`. Extract `source` (`owner/repo`).

If the CLI exits non-zero (`foundIn: null`), fall back to reading the lockfiles directly:

```bash
# Repo-local (committed, version 1 schema):
jq '.skills["<skill-name>"]' skills-lock.json

# Global (version 3 schema, has sourceUrl):
jq '.skills["<skill-name>"]' ~/.agents/.skill-lock.json
```

If there is still no lock entry, ask for `owner/repo` and the skill folder name.

For multiple related skills (user confirms one PR), repeat file discovery for each `skills/<name>/` directory.

### 2. Find the local skill directory

| Kind | Local directory |
| --- | --- |
| Global | `~/.agents/skills/<name>/` |
| Repo internal | `.agents/skills/<name>/` |

Collect files to contribute (exclude `SKILL.local.md`):

```bash
find "<local-dir>" -type f ! -name 'SKILL.local.md' | sort
```

### 3. Diff against source

For each local file, map to `skills/<skill-name>/<relative-path>` and compare to upstream on the default branch.

List upstream skill folder (optional sanity check):

```bash
gh api "repos/<owner>/<repo>/contents/skills/<skill-name>?ref=<default-branch>" \
  --jq '.[] | .path'
# If scripts/ exists, list nested files too:
gh api "repos/<owner>/<repo>/contents/skills/<skill-name>/scripts?ref=<default-branch>" \
  --jq '.[]? | .path' 2>/dev/null
```

Per-file diff:

```bash
UPSTREAM="skills/<skill-name>/SKILL.md"
gh api "repos/<owner>/<repo>/contents/${UPSTREAM}" --jq '.content' | base64 -d > /tmp/upstream.md
diff /tmp/upstream.md "<local-dir>/SKILL.md"
```

- **No diffs** across all mapped files → nothing to contribute; stop
- **Any diff** → show unified diffs and get user confirmation before proceeding

### 4. Check write access

```bash
gh api repos/<owner>/<repo> --jq '{push: .permissions.push, default: .default_branch}'
```

- `push: true` → branch on `owner/repo`
- `push: false` → `gh repo fork <owner>/<repo> --clone=false`, then use `<your-username>/<repo>`

### 5. Create branch and push (single commit — Git Data API)

Use the **Git Data API** so all files land in **one commit**. Do not use `PUT /contents/{path}` per file (that creates one commit per file).

Set variables:

```bash
OWNER=<owner>
REPO=<repo>
REPO_FULL="${OWNER}/${REPO}"
DEFAULT_BRANCH=main   # from step 4
BRANCH="patch/<skill-name>-<short-slug>"   # or shared slug for multi-skill PR
MSG="fix(<skill-name>): <description>"
SKILL_NAME=<skill-name>
LOCAL_DIR="<absolute-local-skill-dir>"
```

#### 5a. Create branch ref from default branch tip

```bash
BASE_SHA=$(gh api "repos/${REPO_FULL}/git/refs/heads/${DEFAULT_BRANCH}" --jq '.object.sha')
BASE_TREE=$(gh api "repos/${REPO_FULL}/git/commits/${BASE_SHA}" --jq '.tree.sha')

gh api "repos/${REPO_FULL}/git/refs" \
  --method POST \
  --field ref="refs/heads/${BRANCH}" \
  --field sha="${BASE_SHA}"
```

If the branch already exists, skip creation and set `BASE_SHA` to the branch tip instead (for amending, prefer a fresh branch).

#### 5b. Create blobs and tree entries for each local file

Build a JSON array of tree items. Each local file maps to `skills/${SKILL_NAME}/<relative-path>`.

**Use temp files for `--input`**, not inline `$(jq …)`. Embedding file content in the shell argument hits `ARG_MAX` and fails with errors like `file name too long` on typical `SKILL.md` sizes.

```bash
TREE_ITEMS='[]'
while IFS= read -r -d '' file; do
  rel="${file#${LOCAL_DIR}/}"
  upstream_path="skills/${SKILL_NAME}/${rel}"

  jq -n --rawfile content "$file" '{content: $content, encoding: "utf-8"}' > /tmp/patch-blob-input.json
  blob_sha=$(gh api "repos/${REPO_FULL}/git/blobs" \
    --method POST \
    --input /tmp/patch-blob-input.json \
    --jq '.sha')

  TREE_ITEMS=$(jq -n \
    --argjson items "$TREE_ITEMS" \
    --arg path "$upstream_path" \
    --arg sha "$blob_sha" \
    '$items + [{path: $path, mode: "100644", type: "blob", sha: $sha}]')
done < <(find "$LOCAL_DIR" -type f ! -name 'SKILL.local.md' -print0)
```

Repeat the loop for additional skills in the same PR (append to `TREE_ITEMS` with each skill's `SKILL_NAME` and `LOCAL_DIR`).

#### 5c. Create tree, commit, update branch ref

Write tree and commit payloads to temp files as well (large multi-skill `TREE_ITEMS` can also exceed shell limits):

```bash
jq -n \
  --arg base "$BASE_TREE" \
  --argjson tree "$TREE_ITEMS" \
  '{base_tree: $base, tree: $tree}' > /tmp/patch-tree-input.json
NEW_TREE=$(gh api "repos/${REPO_FULL}/git/trees" \
  --method POST \
  --input /tmp/patch-tree-input.json \
  --jq '.sha')

jq -n \
  --arg msg "$MSG" \
  --arg tree "$NEW_TREE" \
  --arg parent "$BASE_SHA" \
  '{message: $msg, tree: $tree, parents: [$parent]}' > /tmp/patch-commit-input.json
COMMIT_SHA=$(gh api "repos/${REPO_FULL}/git/commits" \
  --method POST \
  --input /tmp/patch-commit-input.json \
  --jq '.sha')

gh api "repos/${REPO_FULL}/git/refs/heads/${BRANCH}" \
  --method PATCH \
  --field sha="${COMMIT_SHA}"
```

Result: exactly **one commit** on the patch branch containing all updated paths under `skills/<skill-name>/`.

### 6. Open PR

```bash
gh pr create \
  --repo "${REPO_FULL}" \
  --base "${DEFAULT_BRANCH}" \
  --head "${BRANCH}" \
  --title "fix(<skill-name>): <description>" \
  --body "$(cat <<'EOF'
## Summary

<what changed and why — only under `skills/<skill-name>/`>

## Test plan

- [ ] Run audit-skill / `audit validate` against the updated skill(s)
- [ ] Confirm no files outside `skills/` were modified

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 7. Report

Output the PR URL. After merge, run `npx skills update` in the consumer repo to refresh `skills-lock.json` hashes.

## What NOT to do

- Do not include `SKILL.local.md` content in the PR
- Do not push without showing diffs and getting user confirmation
- Do not create a PR if every mapped file is identical to upstream
- Do not update `.agents/skills/` or any path outside `skills/<skill-name>/` in the source repo
- Do not use Contents API `PUT` per file (multi-commit noise); use Git Data API (section 5)
