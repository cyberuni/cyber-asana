# CircleCI release template

Config file: `.circleci/config.yml`

See [\_common.md](./_common.md) for the shared version/commit/publish pattern.

```yaml
version: 2.1

jobs:
  release:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - run: <install-command>
      - run: <build-command>     # remove if no build
      - run: <pm> run version
      - run: git config user.email "ci@bot" && git config user.name "CI Bot"
      - run: git add . && git commit -m "chore: version packages" || true
      - run: git push || true
      - run: <pm> run release

workflows:
  release:
    jobs:
      - release:
          filters:
            branches:
              only: main
```

Secrets: `NPM_TOKEN` in **Project Settings → Environment Variables**.
