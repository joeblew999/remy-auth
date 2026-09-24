# Skills namespace plan

Status: question from the owner, 2026-09-24; answered below. No change is authorised yet.

## Question

The skills extracted and stored in this repository are messy in terms of folder structure
and knowing what relates to what. The extraction is pure, so would placing the skills by
their source name make sense, without breaking the AI coders using them?

## Assessment

Nesting the installed skills by source (`.agents/skills/cloudflare/wrangler/…`) would break
two things, so it is not recommended:

- **Discovery.** Codex reads `.agents/skills/<name>/SKILL.md` and Claude Code reads
  `.claude/skills/<name>/SKILL.md`, one level deep. A skill under a source directory is
  invisible to both.
- **The installer.** The pinned `skills` CLI has no layout option (`skills add --help`
  offers `--agent`, `--skill`, `--copy`, `--full-depth`, nothing for a target directory).
  `skills:install`, `skills:remove` and the lockfile verification all assume its flat
  layout; a hand-moved tree would be rewritten on the next install and fail verification.

The "what relates to what" already exists, machine-readable, in `skills-lock.json`: every
skill records its source repository, commit, path and content hash. Today's inventory:

| Source | Skills |
| --- | --- |
| cloudflare/skills | 14 |
| ChromeDevTools/chrome-devtools-mcp | 7 |
| better-auth/skills | 6 |
| github/awesome-copilot | 2 |
| GoogleChrome/modern-web-guidance, remix-run/react-router, shadcn-ui/ui, microsoft/playwright-cli | 1 each |

## Proposal

Keep the flat, pure layout and make the grouping visible instead: a `skills:index` task
(shared, in `tasks/skills.toml`) that generates `.agents/skills/README.md` from
`skills-lock.json`, grouped by source with each skill's name, one-line description from its
`SKILL.md`, commit and path. `skills:install` runs it last, and verification checks the file
is current. Agents keep finding skills exactly as now; humans get the map.

Owner decision: approve the generated index, or state a different grouping need.
