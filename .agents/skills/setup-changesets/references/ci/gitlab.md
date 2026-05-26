# GitLab CI release template

Config file: `.gitlab-ci.yml`

See [\_common.md](./_common.md) for the shared version/commit/publish pattern.

```yaml
release:
  stage: release
  image: node:22
  only:
    - main
  script:
    - <install-command>
    - <build-command>     # remove if no build
    - <pm> run version
    - git config user.email "ci@bot" && git config user.name "CI Bot"
    - git add . && git commit -m "chore: version packages" || true
    - git push "https://oauth2:${GITLAB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git" HEAD:main || true
    - <pm> run release
  variables:
    NPM_TOKEN: $NPM_TOKEN
```

Secrets: `NPM_TOKEN` and `GITLAB_TOKEN` (project access token with `write_repository` scope) in **Settings → CI/CD → Variables**.
