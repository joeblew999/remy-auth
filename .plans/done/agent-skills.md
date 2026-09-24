# Agent skill coverage

Status: done 2026-09-24; the Better Auth on D1 row continues in the auth plan. Pinned official sources are installed through
`mise run skills:install` and checked by `mise run project:verify`.
This plan is for an agent that finds, vets and adds skills for the remaining gaps
before the Better Auth + D1 slice starts. It does not authorise writing auth code.

## Current coverage

Installed sources are the `*_skills_source` vars of `skills:install` in `tasks/skills.toml`; `mise run skills:list`
shows the installed skills and `package.json` the dependency versions to compare against.

Probed on 2026-09-24 with `skills add <repo> --list --full-depth` and found **no
skills**: opral/paraglide-js, opral/monorepo, tailwindlabs/tailwindcss,
drizzle-team/drizzle-orm. microsoft/playwright holds only contributor skills
(`playwright-dev`, `-devops`, `-test-results`, `-triage`), not test authoring.

Probed on 2026-09-24 for package publishing and releases: `npm/cli` and
`changesets/changesets` ship **no skills**; the skills.sh registry's npm-publish and
changesets skills are all third-party (b-open-io, oakoss, mblode, vercel-labs
`autoship`) and were not installed. GitHub's own `github/awesome-copilot` (MIT, 441
skills) has no GitHub Packages skill but ships `github-release` (SemVer, changelog,
release PR with `gh` and `git`) and `github-actions-hardening` (removed later the same day with the
workflow it reviewed; the workflow returned for level 2 without it) (workflow review:
permissions, SHA pinning, injection, OIDC). Both were read in full, contain no remote
fetches, telemetry or global configuration, and were **added**, pinned to
`1f5644080a525d26a2e24f61a7609fb9b261c21a` as `github_skills_source`.

## Gaps to resolve

Ordered by risk to the next slice:

1. **Better Auth on D1**: adapter choice (Kysely D1 dialect vs Drizzle), schema
   generation with `auth generate`, and numbered D1 migrations via Wrangler.
   Check whether the Better Auth and Cloudflare skills already cover it
   (`create-auth`, `better-auth-best-practices`, `wrangler`, `workers-best-practices`)
   before adding anything.
2. **Paraglide JS 2.x**: SSR locale strategy, message compilation, the
   `packages/ui` export of generated messages.
3. **Playwright Test authoring** (`@playwright/test` 1.63): fixtures, projects,
   `webServer`, remote targets. Decide whether `playwright-cli` is sufficient.
4. **Tailwind CSS 4**: CSS-first config and the `@tailwindcss/vite` plugin.
5. **Base UI** (`@base-ui/react` 1.8): check whether the `shadcn` skill covers
   Base UI primitives well enough.
6. **Lower priority**: TypeScript 7 (native compiler), Vite 8 / Rolldown, mise.

## Method

For each gap, in order:

1. **Search primary sources first**: the vendor's GitHub org (`.agents/skills`,
   `.claude/skills`, `skills/` directories), their docs site for an `llms.txt` or
   agent page, and https://skills.sh. Use
   `mise exec -- npx --yes skills@<pinned> add <url> --list --full-depth` to inspect
   without installing.
2. **Accept only official sources**: the repo must be owned by the library's
   maintainers. Record any third-party candidate, but do not install it; list it
   for a human decision.
3. **Read every file of a candidate skill before adding it.** Reject content that
   instructs the agent to fetch and run remote code, send telemetry, change
   global configuration or override project rules. Note the licence.
4. **Check version fit**: the skill must describe the major version pinned in
   `package.json`. A skill written for an older major is worse than none.
5. **Avoid overlap**: do not add a skill whose triggers duplicate an installed one
   without adding version-specific content.
6. **When no official skill exists**, do not write one from memory. Record the
   canonical docs URL (and `llms.txt` if present) in the table below, so agents
   fetch current docs. Propose a project-local skill only when there are
   repo-specific rules that docs cannot supply (for example, how locale flows
   from the Worker to Paraglide here), and draft it from the code, not from general
   knowledge.

## Adding an accepted skill

Follow [the steps in the tooling reference](../docs/tooling.md#agent-skills). Afterwards
`git status` must show only the intended additions.

## Deliverable

Update this file with a completed table, then open one commit per accepted source:

| Gap | Decision (added / docs only / rejected) | Source + commit or docs URL | Reason |
| --- | --- | --- | --- |
| Better Auth on D1 | moved to the [auth plan](../auth-service.md) | installed: `create-auth`, `better-auth-best-practices`, `wrangler`, `workers-best-practices`; docs https://www.better-auth.com/llms.txt | Only testable against the real adapter and D1 when the auth slice starts |
| Paraglide JS 2.x | docs only | https://paraglidejs.com/llms.txt | opral repos ship no skills; the strategies, middleware and runtime were built from the docs and the generated runtime's README |
| Playwright Test | `playwright-cli` sufficient | microsoft/playwright-cli (installed) plus `node_modules/@playwright/test` types | Projects, `webServer`, remote targets and the shared checks were written without gaps; microsoft/playwright has only contributor skills; no llms.txt |
| Tailwind CSS 4 | docs only | https://tailwindcss.com/docs | No skills and no llms.txt; the shadcn skill covers the CSS-first setup the package uses |
| Base UI | covered by `shadcn` | shadcn-ui/ui (installed); docs https://base-ui.com/llms.txt | The shadcn CLI generates the base-nova components on Base UI; mui/base-ui ships only `base-ui-review`, a contributor skill, rejected |
| TypeScript 7 / Vite 8 / mise | docs only | https://vite.dev/llms.txt, https://mise.jdx.dev/llms.txt | No official skills; nothing today needed more than their docs |
| Package publishing and releases | added | github/awesome-copilot @ 1f5644080a525d26a2e24f61a7609fb9b261c21a: `github-release` (`github-actions-hardening` added, then removed) | GitHub maintains GitHub Packages and Actions; npm and changesets ship no skills; registry alternatives are third-party |

Escalate instead of guessing when a needed skill exists only from a third party,
contradicts the pinned version, or would require upgrading a dependency.
