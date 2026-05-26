# Migrate from release-please

1. Remove packages: `<pm> remove release-please` (if installed as a CLI dep); the GitHub Action needs no package removal
2. Delete config files: `release-please-config.json`, `.release-please-manifest.json`
3. No `package.json` scripts to remove (release-please is entirely CI-driven)
4. In `.github/workflows/`, find and delete the workflow using `googleapis/release-please-action`
5. Secrets: `GITHUB_TOKEN` and `NPM_TOKEN` reusable
