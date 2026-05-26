# Migrate from semantic-release

1. Remove packages: `<pm> remove semantic-release` and any `@semantic-release/*` plugins found in `package.json`
2. Delete config files (whichever exist): `.releaserc`, `.releaserc.json`, `.releaserc.js`, `.releaserc.cjs`, `.releaserc.yaml`, `.releaserc.yml`, `release.config.js`, `release.config.cjs`, `release.config.ts`; also remove the `"release"` key if it appears inside `package.json`
3. Remove any `"semantic-release"` call from the `"release"` script in `package.json`
4. In the detected CI config file(s), find the job/step that runs `semantic-release` — delete the step or the entire job; note the filename so the new changeset workflow can reuse it
5. Secrets: `GH_TOKEN` / `GITHUB_TOKEN` and `NPM_TOKEN` can be reused as-is
