# Travis CI release template

Config file: `.travis.yml`

See [\_common.md](./_common.md) for the shared version/commit/publish pattern.

```yaml
language: node_js
node_js: '22'
branches:
  only: [main]
install:
  - <install-command>
script:
  - <build-command>     # remove if no build
deploy:
  provider: script
  script: >-
    <pm> run version &&
    git config user.email "ci@bot" && git config user.name "CI Bot" &&
    (git add . && git commit -m "chore: version packages" || true) &&
    (git push || true) &&
    <pm> run release
  on:
    branch: main
```

Secrets: `NPM_TOKEN` via **Travis CI → Repository settings → Environment Variables**.
