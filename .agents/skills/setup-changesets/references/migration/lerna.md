# Migrate from lerna

1. Remove packages: `<pm> remove lerna`
2. Delete config files: `lerna.json`
3. Remove any `"lerna publish"` or `"lerna version"` calls from scripts in `package.json`
4. In CI config, find and remove the step running `lerna publish`
5. Secrets: `GH_TOKEN` / `GITHUB_TOKEN` and `NPM_TOKEN` reusable
