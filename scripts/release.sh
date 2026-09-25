#!/usr/bin/env bash
# Publishes the shared UI from this machine; run through `mise run ui:release`, which runs level 1,
# ui:verify and level 2 first, then the API contract when its version is new. Bump
# packages/ui/package.json and the root's @joeblew999/remy-ui pin together, and write the CHANGELOG.md section, in a commit before releasing.
set -euo pipefail

version=$(node -p "require('./packages/ui/package.json').version")
[ "$(git branch --show-current)" = main ] || { echo "Release from main."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Commit everything before releasing."; exit 1; }
git fetch -q --tags origin main
git merge-base --is-ancestor origin/main HEAD || { echo "main is behind origin/main; pull and re-run the gates."; exit 1; }
if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  echo "v$version is already tagged; bump packages/ui/package.json."; exit 1
fi

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
bash scripts/release-notes.sh "$version" > "$tmp/notes.md"

# Tag and push before publishing: a failed push then leaves nothing published, and if publishing
# fails after the push, CI's release job publishes from the tag.
git tag -a "v$version" -m "Shared UI $version"
git push origin main
git push origin "v$version"

printf '//npm.pkg.github.com/:_authToken=%s\n' "$(gh auth token)" > "$tmp/npmrc"
NPM_CONFIG_USERCONFIG="$tmp/npmrc" npm publish --workspace @joeblew999/remy-ui --ignore-scripts

# remy-auth's API contract (packages/contract) goes out under the same tag when its version is new;
# an unchanged contract keeps the version already published. Bump packages/contract/package.json
# (and the root's pin) whenever the contract changes.
contract=$(node -p "require('./packages/contract/package.json').version")
if NPM_CONFIG_USERCONFIG="$tmp/npmrc" npm view "@joeblew999/remy-auth-contract@$contract" version --registry https://npm.pkg.github.com >/dev/null 2>&1; then
  echo "@joeblew999/remy-auth-contract@$contract is already published."
else
  NPM_CONFIG_USERCONFIG="$tmp/npmrc" npm publish --workspace @joeblew999/remy-auth-contract --ignore-scripts
fi

gh release create "v$version" --title "Shared UI $version" --notes-file "$tmp/notes.md"
echo "Published @joeblew999/remy-ui@$version and released v$version."
