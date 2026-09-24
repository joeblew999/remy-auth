#!/usr/bin/env bash
# Publishes the shared UI from this machine; run through `mise run ui:release`, which runs level 1 first.
set -euo pipefail

version=$(node -p "require('./packages/ui/package.json').version")
[ "$(git branch --show-current)" = main ] || { echo "Release from main."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Commit everything before releasing."; exit 1; }
git fetch --tags -q
if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  echo "v$version is already tagged; bump packages/ui/package.json."; exit 1
fi

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf '//npm.pkg.github.com/:_authToken=%s\n' "$(gh auth token)" > "$tmp/npmrc"
NPM_CONFIG_USERCONFIG="$tmp/npmrc" npm publish --workspace @joeblew999/remy-ui --ignore-scripts

git tag -a "v$version" -m "Shared UI $version"
git push origin main
git push origin "v$version"

awk -v v="$version" 'index($0, "## [" v "]") == 1 {p=1; next} /^## \[/ {p=0} p' CHANGELOG.md > "$tmp/notes.md"
gh release create "v$version" --title "Shared UI $version" --notes-file "$tmp/notes.md"
echo "Published @joeblew999/remy-ui@$version and released v$version."
