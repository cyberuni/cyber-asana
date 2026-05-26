# Migrate from release-it

1. Remove packages: `<pm> remove release-it` and any `@release-it/*` plugins
2. Delete config files (whichever exist): `.release-it.json`, `.release-it.js`, `.release-it.ts`, `.release-it.yaml`, `.release-it.yml`, `release-it.config.js`, `release-it.config.ts`; also remove the `"release-it"` key from `package.json` if present
3. Remove any `"release-it"` call from the `"release"` script in `package.json`
4. In the detected CI config file(s), find and remove the step running `release-it`; note the filename for reuse
5. Secrets: `GITHUB_TOKEN` and `NPM_TOKEN` can be reused as-is
