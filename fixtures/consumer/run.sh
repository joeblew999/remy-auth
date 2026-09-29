#!/usr/bin/env bash
# The consumer fixture (README.md): run by mise run template:test from remy-auth's root.
set -euo pipefail
root=$(pwd)
out=$(mktemp -d); trap 'rm -rf "$out"' EXIT
sha=$(git rev-parse --short HEAD)

# 1. The package as npm serves it, with a version no registry has, so npm can never substitute a published
#    copy for it (it did once: the scratch tarball was 0.13.0, the published version).
mise run project:generate > /dev/null
rsync -a --exclude node_modules packages/ui/ "$out/ui/"
version="$(node -p "require('./packages/ui/package.json').version")-dev.$sha"
(cd "$out/ui" && npm pkg set version="$version" && npm pack --silent --pack-destination "$out" > /dev/null)
ui="$out/joeblew999-remy-ui-$version.tgz"

# 2. The tasks where no node_modules is above them, as in mise's cache of a git include.
cp -R tasks "$out/tasks"

# 3. The blank app, the fixture's own files, then only what differs from a new repository: the tarball, the
#    tasks' path, the contract workspace and the docs' API reference.
cp -R template "$out/app" && cp -R fixtures/consumer/files/. "$out/app/"
cd "$out/app"
# remy-auth's own [env] (from the mise run that started this) is not the app's: without this the app's tasks
# would read remy-auth's inlang project and release settings.
unset I18N_INLANG RELEASE_PACKAGE RELEASE_TITLE
npm pkg set "dependencies.@joeblew999/remy-ui=file:$ui" "dependencies.@joeblew999/remy-fixture-contract=*" "workspaces[1]=packages/*"
sed -i.bak "s#git::https://github.com/joeblew999/remy-auth.git//tasks?ref=v[0-9.]*#$out/tasks#" mise.toml
sed -i.bak "s#export default remyDocs(docsConfig);#export default remyDocs(docsConfig, { contract: '@joeblew999/remy-fixture-contract' });#" docs/vite.config.ts
rm -f mise.toml.bak docs/vite.config.ts.bak
grep -q "$out/tasks" mise.toml && grep -q "remy-fixture-contract" docs/vite.config.ts
git init -q && git add -A && git -c user.name=remy -c user.email=remy@localhost commit -qm fixture && git branch -M main
mise trust -q .

# 4. What a new repository runs: install, the skills and the tooling invariants, tier 0 (types, tests
#    included), tier 3, the docs, and the
#    package-owner path up to the registry (dry run: nothing is published).
export GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
npm install --no-audit --no-fund --loglevel=error
# The pinned skills are the same download for every repository, not part of what the fixture is for: install
# them once per version of the pinned list and reuse them (~2 min of GitHub clones otherwise).
# The key covers the pinned list and the package's own remy skill, so a changed skill is installed again.
key=$( (cat "$root/tasks/skills.toml"; find "$out/ui/skills" -type f -exec cat {} +) | shasum | cut -c1-12)
skills="${TMPDIR:-/tmp}/remy-fixture-skills/$key"
if [ -f "$skills/skills-lock.json" ]; then
  cp -R "$skills/." .
else
  mise run skills:install > /dev/null
  # Written aside, then moved into place: an interrupted or concurrent run never leaves half a cache.
  mkdir -p "$skills.$$" && cp -R skills-lock.json .agents .claude "$skills.$$/"
  # Another run may have written it meanwhile: mv would then move this copy inside that one.
  if [ -e "$skills" ]; then rm -rf "$skills.$$"; else mv "$skills.$$" "$skills"; fi
fi
mise run project:verify-tooling
mise run project:check
PREVIEW_PORT=$((${PREVIEW_PORT:-4173} + 100)) mise run project:test:quick
DOCS_PREVIEW_PORT=$((${DOCS_PREVIEW_PORT:-4174} + 100)) mise run docs:test
# As a release runs it: no GITHUB_TOKEN in the environment (the task finds its own token).
# In CI the release job hands the token over as NODE_AUTH_TOKEN (google.yml); on a machine, gh's login.
if [ -n "${CI:-}" ]; then
  env -u GITHUB_TOKEN NODE_AUTH_TOKEN="$GITHUB_TOKEN" mise run packages:publish -- --dry-run
else
  env -u GITHUB_TOKEN mise run packages:publish -- --dry-run
fi
echo "template:test: the blank app and a package it owns install, build and pass on this commit's platform ($version)."
