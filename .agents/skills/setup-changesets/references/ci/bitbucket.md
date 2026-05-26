# Bitbucket Pipelines release template

Config file: `bitbucket-pipelines.yml`

See [\_common.md](./_common.md) for the shared version/commit/publish pattern.

```yaml
pipelines:
  branches:
    main:
      - step:
          name: Release
          image: node:22
          script:
            - <install-command>
            - <build-command>     # remove if no build
            - <pm> run version
            - git config user.email "ci@bot" && git config user.name "CI Bot"
            - git add . && git commit -m "chore: version packages" || true
            - git push || true
            - <pm> run release
          deployment: production
```

Secrets: `NPM_TOKEN` in **Repository settings → Repository variables**.
