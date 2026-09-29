# The consumer fixture

What `mise run template:test` builds on every tier 3 and CI run (.plans/platform-structure.md, fix 1): the
blank app (`template/`) exactly as a new repository gets it, plus `files/` (new files only: a contract package
it owns and an API over it), set up the way another repository sees the platform: the package from a tarball
with a version of its own, the tasks from a copy outside any `node_modules`, the template's `.npmrc`. `run.sh`
does it; see its steps.
