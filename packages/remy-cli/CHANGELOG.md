# @joeblew999/remy-cli

## 0.17.1

### Patch Changes

- 3e4986e: `remy upgrade` now hands over to the release it moves to: the installed command line installs that release's remy-ui
  and remy-cli, then the new one does the rest. It takes GitHub Packages' token from `GITHUB_TOKEN` (or gh, when
  installed), cleans up after itself however it ends, and no longer installs a scratch copy of the blank app.
  remy-ui ships its shared docs words (`messages/`), which installed apps' docs silently went without.
  
  **Upgrading from 0.17.0 or older** (0.16.0's upgrade stops halfway on 0.17.0): install the new command line first,
  then upgrade.
  
  ```bash
  vp add -E @joeblew999/remy-ui@0.17.1 @joeblew999/remy-cli@0.17.1
  vp run upgrade 0.17.1
  ```
  
  An app an older upgrade already left halfway does the same two steps. The upgrade refuses versions older than 0.17.1.
- Updated dependencies [3e4986e]
  - @joeblew999/remy-ui@0.17.1

## 0.17.0

### Minor Changes

- b2b5326: The packages Node loads are built with vp pack (dist/, publishConfig's exports) instead of hand-kept .js and .d.ts
  files; new apps come from `vp create @joeblew999:app` (the new @joeblew999/create), and `remy upgrade` takes the
  release's blank app the same way.

### Patch Changes

- Updated dependencies [b2b5326]
  - @joeblew999/remy-ui@0.17.0
