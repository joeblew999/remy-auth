#!/usr/bin/env bash
# The new-app test (README.md): ci's new-app part (npm run ci -- new-app) runs it from remy-auth's root.
set -euo pipefail
root=$(pwd)
out=$(mktemp -d); trap 'rm -rf "$out"' EXIT
sha=$(git rev-parse --short HEAD)
# Each step says what it took, in the same words wherever `npm run ci` runs it (a Mac, a cloud agent, GitHub),
# so where the time goes is read from the run itself, never remembered (owner, 2026-10-17).
started=$(date +%s); mark=$started; took=""
step() { local now; now=$(date +%s); took="$took, $1 $((now - mark)) s"; mark=$now; }

# 1. The platform and the showcase as npm serves them, each with a version no registry has (build metadata, so
#    the showcase's peer range still holds), so npm can never substitute a published copy (it did once: the
#    scratch tarball was 0.13.0, the published version).
npm run --silent generate > /dev/null
# What the package ships that is made from the docs (the remy skill), as every pack and publish makes it.
node packages/ui/src/cli/remy.ts skills build
step skill
pack() { # <folder> <name> -> the tarball's path
  local v; v="$(node -p "require('./packages/$1/package.json').version")+dev.$sha"
  # tar, not rsync: every machine that runs ci has it (a cloud agent's container had no rsync, 2026-10-17).
  mkdir -p "$out/$1" && tar -C "packages/$1" --exclude=node_modules -cf - . | tar -C "$out/$1" -xf -
  (cd "$out/$1" && npm pkg set version="$v" && npm pack --silent --pack-destination "$out" > /dev/null)
  echo "$out/$2-$v.tgz"
}
ui=$(pack ui joeblew999-remy-ui)
showcase=$(pack showcase joeblew999-remy-showcase)
version=$(basename "$ui" .tgz); version=${version#joeblew999-remy-ui-}
step pack


# 2. The blank app, the fixture's own files, then only what differs from a new repository: the tarball, the
#    contract workspace and the docs' API reference.
cp -R template "$out/app" && cp -R fixtures/consumer/files/. "$out/app/"
cd "$out/app"
# remy-auth's own environment (from the run that started this) is not the app's: without this the app's tools
# would read remy-auth's inlang project and release settings.
unset I18N_INLANG RELEASE_PACKAGE RELEASE_TITLE
npm pkg set "dependencies.@joeblew999/remy-ui=file:$ui" "dependencies.@joeblew999/remy-showcase=file:$showcase" "dependencies.@joeblew999/remy-fixture-contract=*" "workspaces[1]=packages/*"
# A part another package offers, listed by its package (its routes, modules and checks come from the tarball).
node -e "const f='src/parts.json',p=require('./'+f);p.push('@joeblew999/remy-showcase/time-zones');require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
sed -i.bak "s#export default remyDocs(docsConfig, { root: import.meta.dirname });#export default remyDocs(docsConfig, { root: import.meta.dirname, contract: '@joeblew999/remy-fixture-contract' });#" docs/vite.config.ts
rm -f docs/vite.config.ts.bak
grep -q "remy-fixture-contract" docs/vite.config.ts
git init -q && git add -A && git -c user.name=remy -c user.email=remy@localhost commit -qm fixture && git branch -M main

# 3. What a new repository runs: install, the skills and the tooling invariants, the check (types, tests
#    included), the quick browser checks, the docs, and the package-owner path up to the registry (dry
#    run: nothing is published).
export GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
npm install --prefer-offline --no-audit --no-fund --loglevel=error
step install
# The pinned skills are the same download for every repository, not part of what the fixture is for: install
# them once per version of the pinned list and reuse them (~2 min of GitHub clones otherwise).
# The key covers the pinned list and the package's own remy skill, so a changed skill is installed again.
key=$( (cat "$root/packages/ui/src/cli/skills.ts"; find "$out/ui/skills" -type f -exec cat {} +) | shasum | cut -c1-12)
skills="${TMPDIR:-/tmp}/remy-fixture-skills/$key"
if [ -f "$skills/skills-lock.json" ]; then
  cp -R "$skills/." .
else
  npx remy skills install > /dev/null
  # Written aside, then moved into place: an interrupted or concurrent run never leaves half a cache.
  mkdir -p "$skills.$$" && cp -R skills-lock.json .agents .claude "$skills.$$/"
  # Another run may have written it meanwhile: mv would then move this copy inside that one.
  if [ -e "$skills" ]; then rm -rf "$skills.$$"; else mv "$skills.$$" "$skills"; fi
fi
npx remy verify tooling
step 'skills and tooling'
npm run dev:change
step dev:change
# The new app's browser checks in the quick languages, through its own npm run ci (this run is inside ci's new-app part).
REMY_FLOW="${REMY_FLOW:-land}" CHECK_LOCALES=quick PREVIEW_PORT=$((${PREVIEW_PORT:-4173} + 100)) npm run ci -- browser
step 'browser checks'
DOCS_PREVIEW_PORT=$((${DOCS_PREVIEW_PORT:-4174} + 100)) npm run docs -- test
step 'docs checks'
# The package-owner path up to the registry (dry run: nothing is published), only when a release asks
# (REMY_REHEARSE_PUBLISH, which dev:release sets): it needs a token the registry accepts, which only a release
# has, so everywhere else (a Mac, a cloud agent, GitHub after merge) the fixture stops before it (2026-10-17).
if [ -n "${REMY_REHEARSE_PUBLISH:-}" ]; then
  # As a release runs it: no GITHUB_TOKEN in the environment (the tool finds its own token).
  # In CI the release job hands the token over as NODE_AUTH_TOKEN (ci.yml); on a machine, gh's login.
  if [ -n "${CI:-}" ] && [ -n "${GITHUB_ACTIONS:-}" ]; then
    env -u GITHUB_TOKEN NODE_AUTH_TOKEN="$GITHUB_TOKEN" npm run packages -- publish --dry-run
  else
    env -u GITHUB_TOKEN npm run packages -- publish --dry-run
  fi
fi
summary="new-app: the blank app and a package it owns install, build and pass on this commit's platform ($version) in $(( $(date +%s) - started )) s: ${took#, }."
echo "$summary"
# Into the record of the remy run that started this script (timing.ts), at its depth.
if [ -n "${REMY_RECORD:-}" ]; then printf '%*s%s\n' "$(( ${REMY_RECORD_DEPTH:-0} * 2 ))" '' "$summary" >> "$REMY_RECORD"; fi
