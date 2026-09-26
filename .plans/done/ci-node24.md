# GitHub Actions: off Node.js 20

Closed 2026-09-26: done (upload-artifact v7.0.1 on Node 24; Dependabot keeps pinned actions current).

Status: done 2026-09-25 (upload-artifact v7.0.1, Dependabot for actions). The runner warns that `actions/upload-artifact@ea165f8…` (v4.6.2), in
`.github/workflows/google.yml`, targets Node.js 20 and is forced onto Node.js 24
([GitHub's notice](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)).
The fix is to pin `actions/upload-artifact` to v7.0.1 (`043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`,
`runs.using: node24`, checked); v5 to v7 add Node 24, direct single-file uploads and no input we
use changes. `actions/checkout` v7.0.1 and `jdx/mise-action` v4.3.0 are already current. Add a
Dependabot `github-actions` entry so SHA pins keep moving, check remy-auth-app's workflows the same
way, and confirm the warning is gone on the next run.
