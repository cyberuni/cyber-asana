# Migrate from standard-version

1. Remove packages: `<pm> remove standard-version`
2. Delete config files (whichever exist): `.versionrc`, `.versionrc.json`, `.versionrc.js`; also remove the `"standard-version"` key from `package.json` if present
3. Remove any `"standard-version"` call from scripts in `package.json`
4. standard-version is often run locally rather than in CI; check for any CI step and remove if found
5. Secrets: usually none; `NPM_TOKEN` reusable if present
