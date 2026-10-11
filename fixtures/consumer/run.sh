#!/usr/bin/env bash
# The consumer fixture (README.md): run by npm run test -- consumers (remy test consumers) from remy-auth's root.
set -euo pipefail
root=$(pwd)
out=$(mktemp -d); trap 'rm -rf "$out"' EXIT
sha=$(git rev-parse --short HEAD)

# 1. The platform and the showcase as npm serves them, each with a version no registry has (build metadata, so
#    the showcase's peer range still holds), so npm can never substitute a published copy (it did once: the
#    scratch tarball was 0.13.0, the published version).
npm run --silent generate > /dev/null
pack() { # <folder> <name> -> the tarball's path
  local v; v="$(node -p "require('./packages/$1/package.json').version")+dev.$sha"
  rsync -a --exclude node_modules "packages/$1/" "$out/$1/"
  (cd "$out/$1" && npm pkg set version="$v" && npm pack --silent --pack-destination "$out" > /dev/null)
  echo "$out/$2-$v.tgz"
}
ui=$(pack ui joeblew999-remy-ui)
showcase=$(pack showcase joeblew999-remy-showcase)
version=$(basename "$ui" .tgz); version=${version#joeblew999-remy-ui-}


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
sed -i.bak "s#export default remyDocs(docsConfig);#export default remyDocs(docsConfig, { contract: '@joeblew999/remy-fixture-contract' });#" docs/vite.config.ts
rm -f docs/vite.config.ts.bak
grep -q "remy-fixture-contract" docs/vite.config.ts
git init -q && git add -A && git -c user.name=remy -c user.email=remy@localhost commit -qm fixture && git branch -M main

# 3. What a new repository runs: install, the skills and the tooling invariants, the check (types, tests
#    included), the quick browser checks, the docs, and the package-owner path up to the registry (dry
#    run: nothing is published).
export GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
npm install --no-audit --no-fund --loglevel=error
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
npm run dev:change
# The quick browser checks, as the flow would run them for the new app: this run is inside remy test consumers, which the flow authorised.
REMY_FLOW="${REMY_FLOW:-land}" PREVIEW_PORT=$((${PREVIEW_PORT:-4173} + 100)) npm run test -- quick
DOCS_PREVIEW_PORT=$((${DOCS_PREVIEW_PORT:-4174} + 100)) npm run docs -- test
# As a release runs it: no GITHUB_TOKEN in the environment (the tool finds its own token).
# In CI the release job hands the token over as NODE_AUTH_TOKEN (google.yml); on a machine, gh's login.
if [ -n "${CI:-}" ]; then
  env -u GITHUB_TOKEN NODE_AUTH_TOKEN="$GITHUB_TOKEN" npm run packages -- publish --dry-run
else
  env -u GITHUB_TOKEN npm run packages -- publish --dry-run
fi
echo "consumers: the blank app and a package it owns install, build and pass on this commit's platform ($version)."
