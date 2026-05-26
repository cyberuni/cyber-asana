# Migrate from bumpp

1. Remove packages: `<pm> remove bumpp`
2. Delete config: no dedicated config file; remove any `"bumpp"` key from `package.json` if present
3. Remove any `"bumpp"` calls from scripts in `package.json`
4. In CI config, find and remove any `bumpp` step
5. Secrets: `NPM_TOKEN` reusable if publishing was wired up
