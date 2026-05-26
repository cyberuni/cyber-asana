# Drone CI release template

Config file: `.drone.yml`

See [\_common.md](./_common.md) for the shared version/commit/publish pattern.

```yaml
kind: pipeline
type: docker
name: release

trigger:
  branch: [main]
  event: [push]

steps:
  - name: release
    image: node:22
    environment:
      NPM_TOKEN:
        from_secret: npm_token
    commands:
      - <install-command>
      - <build-command>     # remove if no build
      - <pm> run version
      - git config user.email "ci@bot" && git config user.name "CI Bot"
      - git add . && git commit -m "chore: version packages" || true
      - git push || true
      - <pm> run release
```

Secrets: `npm_token` via **Drone → Repository settings → Secrets**.
