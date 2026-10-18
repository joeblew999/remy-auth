# Changesets

Each change to a published package (`@joeblew999/remy-ui`, `@joeblew999/remy-cli` and `@joeblew999/create`, released
together under one version; `@joeblew999/remy-showcase`; `@joeblew999/remy-auth-contract`) carries a changeset:
`pnpm changeset`, which asks which packages changed and how, and writes a file here. `vp run release` turns them into
versions and changelogs (`changeset version`) and pushes to main; GitHub's release job publishes on that push, once its
checks pass (`changeset publish`), then tags the version.
