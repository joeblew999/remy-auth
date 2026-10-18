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
previous=$(curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" "$packages/@joeblew999%2fremy-ui" | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>console.log(JSON.parse(s)['dist-tags'].latest))" 2>/dev/null) ||
  { echo "upgrade-test: GitHub Packages refused this token for @joeblew999/remy-ui (it needs read:packages)"; exit 1; }
# Every pnpm command here (the previous app's install, the upgrade's) reads GitHub Packages with this token, once
# GitHub Packages has taken it (so a bad token never replaces a machine's good one).
vp pm config set --location global //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN" > /dev/null
# What GitHub Packages says about @joeblew999/create at that version, before vp create reads it (issue #44's first
# run on GitHub: vp create found no createConfig there). Printed, never the token.
curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" "$packages/@joeblew999%2fcreate" > "$out/create.json" || true
node -e "
const p = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')), v = p.versions?.[process.argv[2]] ?? {};
console.log('upgrade-test: create', process.argv[2], 'keys:', Object.keys(v).join(' '));
console.log('upgrade-test: createConfig', JSON.stringify(v.createConfig) ?? 'absent', 'tarball', v.dist?.tarball, 'integrity', v.dist?.integrity ? 'yes' : 'no');
" "$out/create.json" "$previous" || true
tarball=$(node -p "JSON.parse(require('fs').readFileSync('$out/create.json','utf8')).versions['$previous']?.dist?.tarball ?? ''" 2>/dev/null || true)
if [ -n "$tarball" ]; then
  echo "upgrade-test: tarball without a token: $(curl -s -o /dev/null -w '%{http_code}' "$tarball"), with: $(curl -s -L -o "$out/create.tgz" -w '%{http_code} %{url_effective}' -H "Authorization: Bearer $GITHUB_TOKEN" "$tarball" | sed -E 's#\?.*##')"
  tar -xzOf "$out/create.tgz" package/package.json 2>/dev/null | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>{try{console.log('upgrade-test: the tarball\'s createConfig', JSON.stringify(JSON.parse(s).createConfig))}catch(e){console.log('upgrade-test: the tarball has no readable package.json')}})"
fi
# How GitHub Packages answers the package list asked both ways: as npm asks (the slash encoded, %2f) and as vp create
# asks (a plain slash). Temporary, issue #44.
echo "upgrade-test: GitHub Packages, @joeblew999%2fcreate: $(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GITHUB_TOKEN" -H 'accept: application/json' "$packages/@joeblew999%2fcreate"), @joeblew999/create: $(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GITHUB_TOKEN" -H 'accept: application/json' "$packages/@joeblew999/create"), without a token: $(curl -s -o /dev/null -w '%{http_code}' -H 'accept: application/json' "$packages/@joeblew999/create")"
# Vite Plus swallows its fallback's error (create/bin.js: readPackageJsonFromTarball(...).catch(() => null)); on
# GitHub's runner only, its throwaway copies print it instead, so the log says why (temporary, issue #44).
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  for bin in $(find "$HOME" "$root/node_modules/.pnpm" -path '*vite-plus*/dist/create/bin.js' 2>/dev/null); do
    sed -i 's#readPackageJsonFromTarball(meta.dist.tarball, meta.dist.integrity).catch(() => null)#readPackageJsonFromTarball(meta.dist.tarball, meta.dist.integrity).catch((error) => (console.error("upgrade-test: vp create fallback failed:", error?.stack ?? error), null))#' "$bin"
    sed -i 's#^\tif (!templates) return null;#\tconsole.error("upgrade-test: readOrgManifest", resolvedVersion, "fields:", Object.keys(meta).join(" "), "createConfig undefined:", meta.createConfig === void 0, "dist:", JSON.stringify(meta.dist), "templates:", JSON.stringify(templates));\n\tif (!templates) return null;#' "$bin"
    echo "upgrade-test: patched $bin: $(grep -c 'vp create fallback failed' "$bin") $(grep -c 'upgrade-test: readOrgManifest' "$bin")"
  done
fi
mkdir -p "$out/make"
(cd "$out/make" && env "npm_config_@joeblew999:registry=$packages" "npm_config_//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" \
  VP_SKIP_INSTALL=1 vp create "@joeblew999:app@$previous" --directory app --no-interactive --no-git --no-agent --no-editor --no-hooks)
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
scope=("npm_config_@joeblew999:registry=http://127.0.0.1:$port/")

# 4. The upgrade, as projects.md says: an app on 0.17.0 or older installs the new command line first (its own cannot
#    hand over); from 0.17.1 on, the upgrade alone.
older=$(node -p "const [a,b,c]=process.argv[1].split('.').map(Number);a*1e6+b*1e3+c<17001" "$previous")
if [ "$older" = true ]; then
  env "${scope[@]}" vp add -E "@joeblew999/remy-ui@$next" "@joeblew999/remy-cli@$next"
fi
env "${scope[@]}" vp run upgrade "$next"
step 'the upgrade'

# 5. What the upgrade promised: the app and its docs on $next, and its own checks pass.
env "${scope[@]}" vp install
for manifest in node_modules/@joeblew999/remy-ui/package.json node_modules/@joeblew999/remy-cli/package.json docs/node_modules/@joeblew999/remy-ui/package.json; do
  got=$(node -p "require('./$manifest').version")
  [ "$got" = "$next" ] || { echo "upgrade-test: $manifest is $got after the upgrade, not $next"; exit 1; }
done
env "${scope[@]}" vp run ready
step 'vp run ready'
echo "upgrade-test: an app made at $previous upgrades to this commit's packages ($next, from $sha) and passes vp run ready in $(( $(date +%s) - started )) s: ${took#, }."
