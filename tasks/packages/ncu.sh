# npm-check-updates over this repository's own dependencies: the root's and, when it owns packages, every
# workspace's. Its own workspaces and the platform package (@joeblew999/remy-ui, which project:upgrade-ui
# moves together with the tasks) are never touched. Extra arguments go to ncu (--upgrade).
here="$(dirname "${BASH_SOURCE[0]}")"
reject="@joeblew999/remy-ui"
workspaces=()
if node "$here/workspaces.mjs" --has-workspaces; then
  reject="$(printf '%s,%s' "$reject" "$(node "$here/workspaces.mjs" --names)" | tr , '\n' | sort -u | paste -sd, -)"
  workspaces=(--workspaces --root)
fi
./node_modules/.bin/ncu --target latest --dep prod,dev,optional ${workspaces[@]+"${workspaces[@]}"} --reject "$reject" --removeRange "$@"
