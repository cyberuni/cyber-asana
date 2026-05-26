# Non-GitHub CI — common pattern

`changesets/action` is GitHub-only. On other platforms, call `changeset version` then `changeset publish` in CI and commit version bumps yourself.

**Shared steps** (insert between install/build and publish in each platform template):

```sh
<pm> run version
git config user.email "ci@bot" && git config user.name "CI Bot"
git add . && git commit -m "chore: version packages" || true
git push || true   # adapt push URL/auth per platform (see platform file)
<pm> run release
```

There is no **Version Packages** PR on non-GitHub CI — version bump and publish happen in one pipeline run.

Replace `<pm>`, `<install-command>`, and `<build-command>` from Step 1 detection in the main skill.
