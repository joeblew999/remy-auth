#!/usr/bin/env bash
# Prints CHANGELOG.md's section for a version and fails when it is missing or empty.
# The single notes check for both releases: scripts/release.sh locally and the CI release job.
set -euo pipefail
version="${1:?usage: scripts/release-notes.sh <version>}"
notes="$(awk -v v="$version" 'index($0, "## [" v "]") == 1 {p=1; next} /^## \[/ {p=0} p' CHANGELOG.md)"
if [ -z "$(printf '%s' "$notes" | tr -d '[:space:]')" ]; then
  echo "CHANGELOG.md has no notes under \"## [$version]\"; write them before releasing." >&2
  exit 1
fi
printf '%s\n' "$notes"
