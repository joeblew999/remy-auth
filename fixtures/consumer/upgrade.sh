#!/usr/bin/env bash
# The upgrade test (issue #44): an app made from the latest published release, exactly as a user makes one, upgraded to
# this commit's packages the way the docs say (projects.md), then its own checks. What it guards: an upgrade that works
# only on a new app (0.17.0 moved the blank app, and 0.16.0's upgrade stopped halfway; nothing noticed).
# Run by the upgrade-test task (vp run upgrade-test) from remy-auth's root, after the packages' vp pack. It reads the
# previous release from GitHub Packages, so it needs a token that reads packages: GitHub's (its upgrade job) or gh's.
set -euo pipefail
root=$(pwd)
out=$(mktemp -d)
sha=$(git rev-parse --short HEAD)
current="$(node -p "require('$root/packages/remy-ui/package.json').version")"
set_version() { node -e "const f=process.argv[1],p=require(f);p.version=process.argv[2];require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')" "$1" "$2"; }
# Whatever happens: the three packages' versions put back, the stand-in registry stopped, the scratch folder removed.
trap 'for p in remy-ui remy-cli create; do set_version "$root/packages/$p/package.json" "$current"; done; if [ -n "${registry:-}" ]; then kill "$registry" 2>/dev/null; fi; rm -rf "$out"' EXIT
started=$(date +%s); mark=$started; took=""
step() { local now; now=$(date +%s); took="$took, $1 $((now - mark)) s"; mark=$now; }

export GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token 2>/dev/null || true)}"
[ -n "$GITHUB_TOKEN" ] || { echo "upgrade-test: GitHub Packages holds the previous release: set GITHUB_TOKEN to a token with read:packages, or install gh and run gh auth login"; exit 1; }
packages=https://npm.pkg.github.com

# 1. The previous release: the latest remy-ui on GitHub Packages, and its app, made by vp create from its own
#    @joeblew999/create and installed, as on any machine.
# UPGRADE_FROM (the repository variable of that name, on GitHub) names it instead, for while the latest is known
# broken: otherwise a broken release's upgrade would block every release after it, its fix included (projects.md).
if [ -n "${UPGRADE_FROM:-}" ]; then previous="$UPGRADE_FROM"; else
previous=$(curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" "$packages/@joeblew999%2fremy-ui" | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>console.log(JSON.parse(s)['dist-tags'].latest))" 2>/dev/null) ||
  { echo "upgrade-test: GitHub Packages refused this token for @joeblew999/remy-ui (it needs read:packages)"; exit 1; }
fi
# Every pnpm command here (the previous app's install, the upgrade's) reads GitHub Packages with this token, once
# GitHub Packages has taken it (so a bad token never replaces a machine's good one).
vp pm config set --location global //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN" > /dev/null
# vp create reads the scope's registry and token from .npmrc files (not npm_config_ variables, which did not reach it
# on GitHub's runner; issue #44), so the folder it runs in has one, as a user's ~/.npmrc would.
mkdir -p "$out/make"
printf '@joeblew999:registry=%s/\n//npm.pkg.github.com/:_authToken=%s\n' "$packages" "$GITHUB_TOKEN" > "$out/make/.npmrc"
(cd "$out/make" && VP_SKIP_INSTALL=1 vp create "@joeblew999:app@$previous" --directory app --no-interactive --no-git --no-agent --no-editor --no-hooks)
app="$out/make/app"
cd "$app"
git init -q && git add -A && git -c user.name=remy -c user.email=remy@localhost commit -qm "app at $previous" && git branch -M main
vp install
step "the app at $previous"

# 2. This commit's packages, as the release after it: the current version with 1000 added to its patch (0.17.0 becomes
#    0.17.1000), a plain release number no registry will hold, so the upgrade's own version check and every peer range
#    take it as they take a real one. All three are set before any is packed, so remy-cli names that remy-ui; they are
#    put back whatever happens.
next="$(node -p "const [a,b,c]=process.argv[1].split('.').map(Number);[a,b,c+1000].join('.')" "$current")"
for p in remy-ui remy-cli create; do set_version "$root/packages/$p/package.json" "$next"; done
pairs=()
for p in remy-ui remy-cli create; do
  file=$(cd "$root/packages/$p" && pnpm pack --pack-destination "$out" --json | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>console.log(JSON.parse(s).filename))")
  mkdir -p "$out/$p" && tar -xzf "$file" -C "$out/$p" package/package.json
  pairs+=("$out/$p/package/package.json=$file")
done
for p in remy-ui remy-cli create; do set_version "$root/packages/$p/package.json" "$current"; done
step pack

# 3. The stand-in registry: these three at $next, every other version of the scope passed through from GitHub Packages.
port=$(( ${PREVIEW_PORT:-4173} + 400 ))
node "$root/fixtures/consumer/registry.mjs" "$port" "$packages" "${pairs[@]}" &
registry=$!
for _ in $(seq 50); do curl -fs "http://127.0.0.1:$port/@joeblew999%2fremy-ui" > /dev/null && break; sleep 0.1; done
# The app's own .npmrc names the stand-in for the scope (where a real app's names GitHub Packages): pnpm, and the
# upgrade's vp create of the blank app, read it there.
sed -i "s#^@joeblew999:registry=.*#@joeblew999:registry=http://127.0.0.1:$port/#" .npmrc

# 4. The upgrade, as projects.md says: an app on 0.17.0 or older installs the new command line first (its own cannot
#    hand over); from 0.17.1 on, the upgrade alone.
older=$(node -p "const [a,b,c]=process.argv[1].split('.').map(Number);a*1e6+b*1e3+c<17001" "$previous")
if [ "$older" = true ]; then
  vp add -E "@joeblew999/remy-ui@$next" "@joeblew999/remy-cli@$next"
fi
vp run upgrade "$next"
step 'the upgrade'

# 5. What the upgrade promised: the app and its docs on $next, and its own checks pass.
vp install
for manifest in node_modules/@joeblew999/remy-ui/package.json node_modules/@joeblew999/remy-cli/package.json docs/node_modules/@joeblew999/remy-ui/package.json; do
  got=$(node -p "require('./$manifest').version")
  [ "$got" = "$next" ] || { echo "upgrade-test: $manifest is $got after the upgrade, not $next"; exit 1; }
done
vp run ready
step 'vp run ready'
echo "upgrade-test: an app made at $previous upgrades to this commit's packages ($next, from $sha) and passes vp run ready in $(( $(date +%s) - started )) s: ${took#, }."
