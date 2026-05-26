# Azure Pipelines release template

Config file: `azure-pipelines.yml`

See [\_common.md](./_common.md) for the shared version/commit/publish pattern.

```yaml
trigger:
  branches:
    include: [main]

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '22'
  - script: <install-command>
    displayName: Install dependencies
  - script: <build-command>
    displayName: Build           # remove if no build
  - script: |
      <pm> run version
      git config user.email "ci@bot"
      git config user.name "CI Bot"
      git add . && git commit -m "chore: version packages" || true
      git push || true
      <pm> run release
    displayName: Version and publish
    env:
      NPM_TOKEN: $(NPM_TOKEN)
```

Secrets: `NPM_TOKEN` as a secret pipeline variable in **Azure DevOps → Pipelines → Edit → Variables**.
