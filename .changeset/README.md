# Changesets

Each change to a published package (`@joeblew999/remy-ui` and `@joeblew999/remy-cli`, released together under one
version; `@joeblew999/remy-showcase`; `@joeblew999/remy-auth-contract`) carries a changeset: `pnpm changeset`, which
asks which packages changed and how, and writes a file here. `vp run release` turns them into versions and
changelogs (`changeset version`); GitHub's release job publishes from the tag (`changeset publish`).
