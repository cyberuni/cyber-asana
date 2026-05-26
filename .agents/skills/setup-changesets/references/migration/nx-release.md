# Migrate from Nx Release

1. No separate package to remove — `nx` itself provides the release functionality and stays installed
2. Remove the `"release"` key from `nx.json`; remove any `nx release` targets from `project.json` files
3. Remove any `"nx release"` calls from scripts in `package.json`
4. In CI config, find and remove the `nx release` step
5. Secrets: `GITHUB_TOKEN` and `NPM_TOKEN` reusable
