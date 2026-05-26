# Migrate from beachball

1. Remove packages: `<pm> remove beachball`
2. Delete config files (whichever exist): `beachball.config.json`; remove any `"beachball"` key from root or package-level `package.json` files
3. Remove `change`, `checkchange`, and `release` scripts in `package.json` that call `beachball`
4. In CI config, find and remove the step running `beachball release`
5. Secrets: `NPM_TOKEN` reusable
