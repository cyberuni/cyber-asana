# Migrate from changelogen

1. Remove packages: `<pm> remove changelogen`
2. Delete config: no dedicated config file; remove any `"changelogen"` key from `package.json` if present
3. Remove any `"changelogen"` calls from scripts in `package.json`
4. In CI config, find and remove any `changelogen` step
5. Secrets: `GITHUB_TOKEN` reusable if GitHub releases were used
