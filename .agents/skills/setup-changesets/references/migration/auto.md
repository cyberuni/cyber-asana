# Migrate from auto (Intuit)

1. Remove packages: `<pm> remove auto` and any `@auto-it/*` plugins
2. Delete config files (whichever exist): `.autorc`, `.autorc.json`, `.autorc.js`
3. Remove any `"auto release"` or `"auto shipit"` calls from scripts in `package.json`
4. In CI config, find and remove the step running `auto release`; note the filename for reuse
5. Secrets: `GH_TOKEN` can be reused as `GITHUB_TOKEN`; `NPM_TOKEN` reusable
