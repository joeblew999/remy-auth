#!/usr/bin/env bash
# The new-app test (README.md): the new-app task (vp run new-app; vp run ci's last part) runs it from remy-auth's
# root, after remy-ui's catalogs, remy-cli's build and the remy skill (the task's dependsOn).
set -euo pipefail
root=$(pwd)
out=$(mktemp -d); trap 'rm -rf "$out"' EXIT
sha=$(git rev-parse --short HEAD)
# The new app's ports: 100 above this checkout's (PREVIEW_PORT, DOCS_PREVIEW_PORT: 4173, 4174), so they never meet.
preview=${PREVIEW_PORT:-4173}; docs=${DOCS_PREVIEW_PORT:-4174}
# Each step says what it took, in the same words wherever `vp run ci` runs it (a Mac, a cloud agent, GitHub),
# so where the time goes is read from the run itself, never remembered (owner, 2026-10-17).
started=$(date +%s); mark=$started; took=""
step() { local now; now=$(date +%s); took="$took, $1 $((now - mark)) s"; mark=$now; }

# 1. The blank app with the fixture's own files over it: its finished package.json, docs, workspace and parts list (the
#    blank app's, with a package it owns, its API and a part from the showcase; a unit check holds them to the blank
#    app's), its contract package, its API and its checks. Nothing is edited here.
cp -R template "$out/app" && cp -R fixtures/consumer/files/. "$out/app/"

# 2. The platform, its command line and the showcase in the app's vendor/, packed by pnpm in the workspace (which
#    writes each catalog: and workspace: version in), each with a version no registry has (build metadata, so the
#    showcase's peer range still holds), so the install can never take a published copy. The version is set for the
#    pack and put back after, whatever happens.
mkdir -p "$out/app/vendor"
set_version() { node -e "const f=process.argv[1],p=require(f);p.version=process.argv[2];require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')" "$1" "$2"; }
pack() { # <folder>: packed to vendor/<folder>.tgz
  local dir="$root/packages/$1" was file
  was="$(node -p "require('$dir/package.json').version")"
  set_version "$dir/package.json" "$was+dev.$sha"
  file=$(cd "$dir" && pnpm pack --pack-destination "$out" --json | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>console.log(JSON.parse(s).filename))") || { set_version "$dir/package.json" "$was"; exit 1; }
  set_version "$dir/package.json" "$was"
  mv "$file" "$out/app/vendor/$1.tgz"
}
pack remy-ui
pack remy-cli
pack remy-showcase
version="$(node -p "require('./packages/remy-ui/package.json').version")+dev.$sha"
step pack

cd "$out/app"
git init -q && git add -A && git -c user.name=remy -c user.email=remy@localhost commit -qm fixture && git branch -M main

# 3. What a new repository runs: install, the check (types, tests
#    included), the quick browser checks and the docs.
export GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
vp install
step install
# No agent skills: they are a developer's (vp run setup installs them), not part of what a new app is.
vp run ready
step 'vp run ready'
# The new app's browser checks in the quick languages, as its own vp run ci runs them.
CHECK_LOCALES=quick PREVIEW_PORT=$((preview + 100)) vp run test:browser
step 'browser checks'
DOCS_PREVIEW_PORT=$((docs + 100)) pnpm remy docs test
step 'docs checks'
summary="new-app: the blank app and a package it owns install, build and pass on this commit's platform ($version) in $(( $(date +%s) - started )) s: ${took#, }."
echo "$summary"
