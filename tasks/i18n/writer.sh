# Sourced by the two translate tasks (not a task: no execute bit). What keeps translating safe while many
# agents code at once (.plans/translation-pipeline.md, "One writer"):
#   - one branch writes translations (I18N_BRANCH, main);
#   - one run at a time in every worktree of the repository: a lock in git's common directory;
#   - the English it translates is committed, so the translation commit is newer than the English it
#     follows (git is what says a translation is current);
#   - the agent has no tools: it returns text, this task writes the files it was asked for, and commits
#     them. Nothing else can change.

# writer_guard <English files...> -- <translation files...>
writer_guard() {
  local branch; branch=$(git branch --show-current)
  [ "$branch" = "${I18N_BRANCH:-main}" ] || { echo "Translations are written on ${I18N_BRANCH:-main} only (this is '$branch'): merge the English there, then translate." >&2; exit 2; }
  local lock; lock="$(git rev-parse --git-common-dir)/remy-i18n.lock"
  mkdir "$lock" 2>/dev/null || { echo "Another translation run holds $lock (remove it if that run died)." >&2; exit 2; }
  trap "rmdir '$lock'" EXIT
  local english=() targets=() side=english
  for f in "$@"; do [ "$f" = -- ] && { side=targets; continue; }; [ "$side" = english ] && english+=("$f") || targets+=("$f"); done
  [ ${#english[@]} -eq 0 ] || git diff --quiet HEAD -- "${english[@]}" || { echo "Commit the English first (uncommitted changes in the English sources)." >&2; exit 2; }
  [ ${#targets[@]} -eq 0 ] || { git diff --quiet HEAD -- "${targets[@]}" && [ -z "$(git ls-files --others --exclude-standard -- "${targets[@]}")" ]; } \
    || { echo "Translations have uncommitted changes: commit or discard them first." >&2; exit 2; }
}

# agent <system prompt file> <JSON schema>: the prompt on stdin, the structured result on stdout. Claude
# Code headless, from a scratch directory (no CLAUDE.md, hooks, settings, MCP servers or skills), no tools.
agent() {
  local dir; dir=$(mktemp -d)
  (cd "$dir" && claude -p --tools "" --strict-mcp-config --disable-slash-commands --setting-sources "" --no-session-persistence \
    --model "${I18N_MODEL:-sonnet}" --system-prompt "$(cat "$1")" --output-format json --json-schema "$2") | jq -e '.structured_output'
  local status=$?; rm -rf "$dir"; return $status
}
