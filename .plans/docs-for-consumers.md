# How apps on the package get the docs and rules

Status: analysed 2026-09-26; recommendation below. Owner: "how are the other consumers going to get the docs?
There are many different ways they can. I was always wondering if our stack can support llms etc or if it
should be a skill from the docs? It's a whole research area in itself?"

## Today

remy-auth-app's `AGENTS.md` links to remy-auth's docs on GitHub `main`
(`https://github.com/joeblew999/remy-auth/blob/main/docs/content/dev/how-we-work.md`, development, tooling). Two
faults: **unpinned** (the app runs remy-ui 0.11.0 and tasks `ref=v0.11.0`, but its agents read today's
`main`, so the rules can run ahead of its code) and **web-only** (an agent must fetch the pages; nothing
checks it did).

## Options (not exclusive)

| Way | How | Strength | Open questions |
| --- | --- | --- | --- |
| Agent skill | remy-auth publishes a `remy` skill made from its docs; apps pin it in `skills.toml` like the Cloudflare, shadcn and TanStack skills; `skills:install` puts it in every agent | existing mechanism, pinned by commit, loaded by every agent | generated from the docs or written; size; skills format for Codex and Claude |
| In the npm package | the docs ship in `@joeblew999/remy-ui`; `AGENTS.md` points at `node_modules/@joeblew999/remy-ui/docs` | versioned with the package the app uses; offline | which docs (rules vs remy-auth's own); package size |
| `llms.txt` | Fumadocs generates `llms.txt` / `llms-full.txt` from the docs site | any LLM or tool reads them from the web | unpinned like today; which pages |
| MCP server | search and ask the docs as tools, over the AI Search we already run | agents query instead of reading everything | hosting, auth, cost; one more thing to run |
| GitHub links (today) | a URL per doc | simplest | unpinned, web-only |

## Questions for the research

Owner: "Are you asking the right questions?" The first framing (which channel carries the docs) was too
narrow. In order:

0. **What does our stack already offer?** (Owner: "did you also ask about checking what our stack offers
   too? Maybe fuma, and other parts of our current stack so we don't reinvent.") Check each, from its
   current docs, before anything new; none of this is verified yet:

   | In our stack | Might offer |
   | --- | --- |
   | Fumadocs | `llms.txt` / `llms-full.txt` generation, raw Markdown per page for LLMs, its AI integrations |
   | mise | `mise generate task-docs` (Markdown from our tasks and usage specs), `mise tasks --json` |
   | the `skills` installer (`skills:install`) | pinning our own repo as a skill source, as for Cloudflare, shadcn, TanStack |
   | Cloudflare AI Search (runs our docs index) | a public endpoint, possibly an MCP endpoint, to ask the docs |
   | shadcn | its registry distributing code and docs to other projects; its MCP server pattern |
   | TanStack Start | server routes to serve `llms.txt` or raw docs from the site we run |
   | oRPC | the API reference, already generated (`/api/doc`, `openapi.json`) |
   | npm, GitHub, Claude Code | the package's `files` (docs in the package), releases, plugin/marketplace formats |

   Whatever these cover is used as is; only the gaps are designed.

1. **Should it be docs at all?** For every rule: can a tool enforce it (the layout contract, `plans:check`,
   `i18n:check`, the test tiers)? Rules that can be checked become checks and stop needing to travel;
   only what cannot be checked stays prose.
2. **Can the tools describe themselves?** Task help is `mise tasks ls` and usage specs (they travel with
   the include and are always current); package reference comes from typed exports. Prose that repeats
   them is drift.
3. **Who reads, for what?** Agents working in an app, developers building one, people evaluating the
   project, outside LLMs answering about it. Each channel is judged by whom it serves.
4. **One home per fact:** one source, every channel (skill, package, llms.txt, site) generated from it by a
   tool through a shared mise task, never copied.
5. **Composition:** an app has its own rules and plans on top of the shared ones; what overrides what,
   and how an agent sees both.
6. **Pinning:** what an app's agents read matches the version it runs (skill pinned by commit, docs in
   the package, or both).
7. **Changes travelling:** when a shared rule changes in a release, how an app learns it on upgrade
   (`project:upgrade-ui` pointing at the changed rules, the changelog).
8. **Proof it worked:** how we know an agent in an app followed the rules (checks that fail, evals), not
   hope that it read them.
9. **Languages:** whether the translated docs travel, or English only for agents
   ([translations](translation-pipeline.md)).
10. **What each agent loads reliably, and when:** skills, `AGENTS.md` links, local files (Claude Code, Codex).

## Analysis (2026-09-26)

Four research passes: Fumadocs and TanStack Start; mise and the skills installer; AI Search, the shadcn
registry and npm; an audit of our rules against the checks that exist today. Sources were current
official docs, npm pages and repos, `--help` of the pinned CLIs, and the pinned code in `node_modules`.
Experiments ran in scratch folders outside the repo. Anything not proven is marked **assumed**.

### 0. What our stack already offers

| Need | In our stack | Verdict | What it takes here |
| --- | --- | --- | --- |
| `llms.txt`, `llms-full.txt` | Fumadocs `llms(source)`, `index(lang)`/`full(lang)` | **covers** | A Fumadocs `loader()` built from `docsTable`; we read the `docs` collection directly and have no loader today |
| Markdown per page | fumadocs-mdx `postprocess.includeProcessedMarkdown`, `getText('processed')` | **covers** | One option in `defineCollections`; on the Worker use `'processed'`, never `'raw'` (no filesystem) |
| `/docs/<slug>.md`, `Accept: text/markdown` | TanStack Start server routes and `fumadocs-core/negotiation` `isMarkdownPreferred` | **covers** | Routes `llms[.]txt.ts`, `llms-full[.]txt.ts`, `docs/{$}[.]md.ts`, with `Vary: Accept` |
| The same files at build time | fumadocs-mdx Node loader (`register()` from `fumadocs-mdx/node`) | **covers** (proven in scratch) | Fix `source.config.ts`: `import.meta.dirname` breaks once bundled into `.source/`; set link, order, title and locale options (below) |
| Static copies through prerender | TanStack Start prerender | partial, **assumed** | Saves non-HTML under its path, but requests with a trailing slash and skips routes without components; each path listed in `pages` |
| Copy-as-Markdown button | fumadocs-ui `MarkdownCopyButton` | **no** for us (we do not use fumadocs-ui) | A stock shadcn button that fetches the `.md` URL, if wanted |
| Docs MCP from our site | `fumadocs-core/mcp`: `list_pages`, `get_page`, `search` over our existing search | **covers**; Workers transport **assumed** | New dependency `@modelcontextprotocol/server` 2.1.0 and zod; route `api/mcp.ts` |
| Docs MCP with no code | AI Search public endpoint: `/search`, `/chat/completions`, `/mcp` | partial | A dashboard toggle; no auth (Access needed to restrict), 120 requests a minute, always latest, no version filter over MCP (**assumed**) |
| Ask AI | Fumadocs presets (OpenRouter, Inkeep, ...) | not needed | Duplicates the AI Search answers we already run |
| Task reference | `mise generate task-docs`, `mise tasks --json` | partial | Generates the per-task reference, included tasks too (46 in remy-auth-app); cannot give our grouping and tiers. `--inject` between `<!-- mise-tasks -->` markers, checked by `git diff` |
| API reference | oRPC `/api/doc`, `openapi.json` | **covers** | Already generated; the skill links to it. Shipping `openapi.json` in the package not examined (**assumed** unnecessary) |
| Pin our repo as a skill source | `skills` installer 1.7.0 (`skills add <repo>/tree/<sha>`) | **covers** | A `skills/remy-*/` folder here and a pin in apps; a second pin beside the package version |
| Skills shipped inside an npm package | `skills experimental_sync` (scans `node_modules/<pkg>/skills/*/SKILL.md`) | **covers**, experimental (proven in scratch) | Ship `skills/` in the package's `files`; add the sync to `skills:install`. Reinstalls on hash change; the lock stores `sourceType: node_modules`. Removal of a dropped skill **assumed** not handled |
| Same, TanStack's tool | TanStack Intent (`intent install`, `validate`, `stale`, hooks for Claude and Codex) | covers, alpha | Same folder layout (`skills/<name>/SKILL.md`), so it stays open as the runner-up; with a GitHub Packages scope **assumed** |
| Docs in the npm package | package `files`; the Next.js 16.2 pattern (`node_modules/next/dist/docs` plus an `AGENTS.md` pointer) | **covers** | `files` cannot reach `docs/` at the repo root: generate into `packages/ui` at pack time. Size is small (docs 204 KB against 1.49 MB unpacked; the limit is 256 MB) |
| Claude `@import` from `node_modules` | `CLAUDE.md`/`AGENTS.md` `@path` imports | Claude **covers** (proven with 2.1.278 `-p`), Codex **no** | Loaded in full every session, so import one short file, not the four docs |
| Claude plugins and marketplaces | `.claude-plugin/marketplace.json`, sources `github`/`npm`/`git-subdir` | partial | Claude only, and a second pin; the skills installer reads the same manifests, so nothing is lost by not using it |
| shadcn registry | `registry:file` items, `shadcn build`/`add`, the shadcn MCP | partial (proven in scratch) | Copies docs into each app: checked in, drifting, unversioned. Wrong fit for docs |

Sources: [Fumadocs AI & LLMs](https://www.fumadocs.dev/docs/integrations/llms),
[MCP helpers](https://www.fumadocs.dev/docs/headless/utils/mcp),
[Node loader](https://www.fumadocs.dev/docs/mdx/loader/node),
[Fumadocs i18n on TanStack Start](https://www.fumadocs.dev/docs/internationalization/tanstack-start),
[TanStack prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering),
[mise generate task-docs](https://mise.jdx.dev/cli/generate/task-docs.html),
[skills installer](https://github.com/vercel-labs/skills),
[Agent Skills spec](https://agentskills.io/specification),
[TanStack Intent](https://tanstack.com/intent/latest/docs/overview),
[Next.js AI agents guide](https://nextjs.org/docs/app/guides/ai-agents),
[AI Search public endpoint](https://developers.cloudflare.com/ai-search/configuration/retrieval/public-endpoint/),
[AI Search MCP](https://developers.cloudflare.com/ai-search/api/search/mcp/),
[AI Search limits](https://developers.cloudflare.com/ai-search/platform/limits-pricing/),
[shadcn registry items](https://ui.shadcn.com/docs/registry/registry-item-json),
[shadcn MCP](https://ui.shadcn.com/docs/mcp),
[npm `files`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#files),
[GitHub Packages npm](https://docs.github.com/en/enterprise-server@3.20/packages/working-with-a-github-packages-registry/working-with-the-npm-registry),
[Claude memory and imports](https://code.claude.com/docs/en/memory),
[Claude skills](https://code.claude.com/docs/en/skills),
[Claude plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces),
[Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Codex skills](https://learn.chatgpt.com/docs/build-skills).

The Fumadocs build-time run wrote `en/` and `es/` folders with `llms.txt`, `llms-full.txt` (151 KB
English, 169 KB Spanish) and one `.md` per page. What the output needs:
- Links are site-relative (`/docs/...`) because our link plugin runs first, so package copies need
  relative or tag-pinned links.
- Headings end with `[#id]`.
- Order is alphabetical without `meta.json`, so pass `docsTable` order.
- Set `renderName`/`renderDescription`; `defineI18n({ hideLocale: 'default-locale' })` drops the `/en/`
  prefix.
- The loader must reuse `docsTable` slugs, or URLs become `/docs/docs/development`.

### 1. Should it be docs at all? The rules audit

89 distinct rules in how-we-work, development, tooling and `docs/content/dev/tasks.md`:
**22 enforced, 31 checkable, 36 prose only.**

- **Enforced, but not in apps.** `ui:verify` and `ui:release` are in the root `mise.toml`, and
  `scripts/verify-tooling.mjs` (lockfile, skill pins) is not shared. Apps get `plans:*`, `i18n:*`,
  `project:*`, `cf:*` and the package's `checks.js`; CI reaches them only because the template copies it.
- **Checkable: two shared tasks cover about 13.**
  - The planned `project:layout`: scripts beside their task, no retired `.github` include, tasks `ref`
    equal to the package version, no SHA or `main` ref at release, Node pin equal to `engines`,
    `web:guidance` rather than `npx ...@latest`.
  - One lint over `mise tasks --json`: `namespace:action` names, LOCAL/REMOTE in `cf:*`/`docs:*`
    descriptions, durations stated, no gate piped through `grep`/`tail`, `task.timings`, `min_version`.
  - Plus `forbidOnly` in the shared `playwrightConfig`.
  - `project:layout` and `git:tidy` do not exist yet; they are lines in `now.md`.
- **Checkable with new tools**, each through a survey first: ESLint rules for "compose, do not restyle",
  TanStack Form/Pacer/data table and "no language code outside Paraglide"; gitleaks or GitHub push
  protection; branch protection with a required check; a counting lock for three test runs; guards
  refusing the main checkout and port 4190; a branch diff check on `docs/i18n/` and non-base catalogs;
  `plans:status` STALE as a failure. Auth-related rules wait for the auth work.
- **Prose only (36): what must travel as text.**
  1. Rules live in the repo, not in agent memory.
  2. Start with `project:setup`; use mise tasks, the browser tools and the installed skills before reading
     upstream code or writing scripts.
  3. Look at the real page before writing a test.
  4. Stop researching once the tools can answer.
  5. Say how long a slow step takes; run post-deploy checks in the background.
  6. Choose tools by survey: candidates, weighted scores with sources, the runner-up, two scratch builds,
     unchecked items marked assumed.
  7. Look for a shadcn block before building a layout; keep its structure; add no constraints it lacks.
  8. Adopt the TanStack library instead of own code, then delete what it replaces.
  9. Ask whether shadcn, TanStack or Paraglide already does it before writing UI.
  10. Screenshot changed pages with `browser:shots` and look at them.
  11. For beta and alpha libraries, read the current docs, not memory.
  12. A library moves from "Not yet" to in use only through a survey.
  13. Translation: one agent at a time, on main, after the merges.
  14. New work is one line in `now.md`; a plan file only for big work; research goes in the plan it serves.
  15. Closing a plan needs no deploy or test run of its own.
  16. Delegated decisions: decide, and record the reasons in the plan.
  17. Delegated decisions: leave a full report.
  18. Pick the test tier by judgement; code freely with tier 0.
  19. Pick `GATE` by the kind of change, and say which tier ran.
  20. Report what was and was not tested; never call untested work verified.
  21. Every check runs through a mise task over the real tool; no curl loops or ad-hoc greps.
  22. The second time something is done by hand, it becomes a shared task.
  23. No tool found: add a survey line to `now.md` or write a plan.
  24. Reports give URLs for the live site, the preview and each page.
  25. Multi-agent: spike first.
  26. Multi-agent: each part ships with its own shared check.
  27. Multi-agent: a hands-on pass in throttled Chrome, with a trace, writing down how it feels.
  28. Prefer upstream tools; keep wrappers thin; record the gap.
  29. Behaviour stays local to its owner and visible at the entry point.
  30. Decisions a plan leaves open belong to the owner, unless delegated.
  31. Deploying, provisioning and filing upstream issues wait for the owner's explicit request.
  32. Plans: read the covering plan first; Executor and Reviewer roles; report the exact checks run; done
      only after Reviewer acceptance.
  33. Skill sources only from the library's own maintainers.
  34. After changing skills or MCP, reload the agent and prove the tools are callable.
  35. The package's behaviour is proven once in remy-auth; apps run a contract set.
  36. Keep checks cheap (Playwright's clock, one page per check, parallel workers); never drop them.

  That is about a third of the four documents' text: small enough for one short list an agent always loads.

### 2. Can the tools describe themselves?

Yes, for tasks and the API. `mise generate task-docs` renders every task's description, dependencies,
arguments and flags, included tasks too. The per-task "Does" rows in `docs/content/dev/tasks.md` become a
generated block; the hand-written part keeps only grouping, tiers and cross-links. Two gaps: it does not
say which include a task came from, and `--style detailed` equals `simple` in 2026.9.12.
`mise tasks --json` is the data for the lint. The API reference is already oRPC's `/api/doc`. Package
components are shadcn's own, documented upstream.

### 3. Who reads, for what

| Reader | Needs | Channel |
| --- | --- | --- |
| An agent working in an app | the prose-only rules, always; the reference, on demand; at the app's version | a short rules block in `AGENTS.md` plus a skill with references, both from the installed package |
| A developer building an app | the same, readable | the docs site; the package copy offline |
| Someone evaluating the project | overview, latest | the docs site |
| An outside LLM or tool | text it can fetch | `llms.txt`, `llms-full.txt`, `/docs/<slug>.md` on the site (latest by nature) |

### 4. One home per fact

The Markdown in `docs/` stays the only source. Every channel is generated by an upstream tool through a
shared mise task:
- the site: Fumadocs
- `llms*.txt` and `.md`: Fumadocs `llms()` at request time
- the package skill's `references/`: the same `llms()` output via the Node loader, at pack time
- the task reference: `mise generate task-docs`

The prose-only list needs one home too: a "Rules" section in `docs/content/dev/how-we-work.md` whose items link to
the section that explains each. The skill's `SKILL.md` body and the app's `AGENTS.md` block are
generated from that section. Nothing is hand-copied.

### 5. Composition

- **Checks:** mise already lets a local task override an included one. An app can add tasks, and
  `project:layout` makes sure it has not dropped the shared gates.
- **Prose:** the app's `AGENTS.md` keeps its own index and plans. A marked block
  (`<!-- remy-rules -->` ... `<!-- /remy-rules -->`) holds the shared rules, written by a shared task,
  never by hand. The app's own rules sit outside the block; where they narrow a shared rule they say so.
  An enforced shared rule cannot be loosened locally, because the check still runs.
- Agents see both in one file, which Codex and Claude both always load.

### 6. Pinning

The package version is the only pin. The skill and its references ship inside `@joeblew999/remy-ui`,
so what an app's agents read matches the code it runs. `project:upgrade-ui` already moves the package and
the tasks `ref` together; `project:layout` adds the check that they match. No skill pin by commit is
needed, and the `AGENTS.md` links to GitHub `main` go away. Only `llms.txt` and the site stay latest,
which suits their readers.

### 7. Changes travelling

`project:upgrade-ui` bumps the version. `skills:install` re-syncs, and the sync reinstalls any skill
whose hash changed. The rules task rewrites the `AGENTS.md` block, so the rule changes show in the
upgrade's git diff. The package's release notes name changed rules. `npm diff` between two versions,
limited to `skills/`, would print exactly what changed (**assumed** to work against GitHub Packages).

### 8. Proof it worked

- Enforced rules prove themselves: the check fails. So the biggest lever is moving the 31 checkable
  rules into shared checks.
- Loading is checked: the rules block and the installed skill must match the installed package
  (hash in `skills-lock.json`, `--inject` plus `git diff`), in tier 0.
- For the 36 prose rules, the honest answer is evals: a shared task that runs a headless agent
  (`claude -p`, `codex exec`) on small fixed tasks in a scratch copy of the app and checks the outcome
  (it used a mise task, it reported what it tested). That is ours to build, optional, and last.

### 9. Languages

English only for agents: the skill, the references and the `AGENTS.md` block. The translated docs stay
on the site, and `llms.txt` per language comes free from `index(lang)`/`full(lang)`
(see [translations](translation-pipeline.md)).

### 10. What each agent loads reliably

| | Always loaded | Loaded on demand |
| --- | --- | --- |
| Codex | `AGENTS.md` from the git root down, capped at 32 KiB; the skills list (name and description, capped at 2% of context or 8000 characters) | a skill's body and references when it chooses; no `@imports` |
| Claude Code | `CLAUDE.md`, or `AGENTS.md` when there is none (2.1.277+), with `@imports` expanded in full | a skill's body and references when it chooses |

So what must always be read goes in the `AGENTS.md` text itself, kept short; the reference goes in a
skill whose description tells the agent when to open it. `@import` from `node_modules` works for Claude
only, so it is not the main route.

### Recommendation

1. **Checks first.** Build `project:layout` and the task-metadata lint as shared tier-0 tasks; add
   `forbidOnly` to the shared `playwrightConfig`; move the skill-pin and lockfile parts of
   `verify-tooling.mjs` and a "regenerate, then `git diff --exit-code`" task into `tasks/`. About 13
   rules stop needing to travel; the other checkable ones go through surveys one by one.
2. **What travels to apps, and how:**
   - The 36 prose-only rules, as a generated block in the app's `AGENTS.md`, which both agents always
     load.
   - A `remy` skill inside `@joeblew999/remy-ui` at `skills/remy/`: a short `SKILL.md` (the rules list
     and when to read what, under 500 lines) and `references/*.md` for how-we-work, development, tooling
     and the task reference. `skills experimental_sync`, from the installer we already pin, installs it
     into `.agents/skills` (Codex) and `.claude/skills` (Claude). TanStack Intent reads the same layout
     and is the runner-up if the experimental command changes.
   - Not travelling: the site and `llms.txt` serve people and outside LLMs, not app agents.
3. **Single source and generator per channel:**

   | Channel | Source | Generated by | Shared task |
   | --- | --- | --- | --- |
   | Site pages | `docs/*.md` | Fumadocs | (exists) |
   | `llms.txt`, `llms-full.txt`, `/docs/<slug>.md` | `docs/*.md` | Fumadocs `llms()` in server routes, over a loader from `docsTable` | none; runtime |
   | Skill references | `docs/*.md` | Fumadocs `llms()` via the Node loader, links made relative | `docs:skill`, run by `ui:pack`/`ui:release` |
   | `SKILL.md` body, `AGENTS.md` block | the "Rules" section of `docs/content/dev/how-we-work.md` | the same script | `docs:skill` (publisher); `agents:rules` (apps, `--check` in tier 0) |
   | Task reference | task descriptions and usage specs | `mise generate task-docs --inject` | `docs:tasks` (`--check` in tier 0) |
   | API reference | oRPC router | oRPC | (exists) |

   The task names are proposals; they follow `namespace:action`.
4. **Pinning** is the package version alone (section 6). **Composition** is the marked block plus local
   task overrides (section 5). **Upgrades** carry the new skill and block through `project:upgrade-ui`
   and `skills:install` (section 7). **Proof** is checks first, a loaded-and-current check second, evals
   later (section 8).
5. **Not now:**
   - The Fumadocs MCP route and the AI Search public MCP: both unpinned. AI Search would be a public,
     unauthenticated URL, and turning it on is provisioning, so the owner decides.
   - Claude plugins: Claude only, and a second pin.
   - The shadcn registry: it copies docs into apps.
   - WebMCP (experimental), Ask AI (duplicates AI Search), the copy-as-Markdown button (later, if wanted).
6. **Ours to build:** the loader from `docsTable` (small); the `docs:skill` script (Node loader plus
   `llms()`, a link rewrite, the rules extraction); the `agents:rules` inject-and-check task; the check
   tasks in step 1; a "Rules" section written once in how-we-work. Everything else is upstream.
7. **Costs:** no new service or bill. The package grows by roughly 200 KB unpacked. Claude and Codex load
   the rules block every session (about 36 lines). The loader and generator are a few hundred lines
   across routes and one script.
8. **Risks:**
   - `skills experimental_sync` is experimental and may not remove a skill the package drops; Intent is
     the fallback on the same layout.
   - An agent may still not open the skill; the always-loaded block and the checks carry what matters.
   - The Node loader prints a `module.register()` deprecation warning, and `source.config.ts` needs the
     root fix before it runs.
   - `docs/` sits outside `packages/ui`, so pack time must generate into the package. A skipped
     `docs:skill` would ship stale rules, so `ui:release` runs it and checks the result.
   - Serving `.md` and MCP on the Worker is only partly proven; the build-time and package paths were
     proven in scratch.

## Plan of work

1. **Checks:** `project:layout` and the `mise tasks --json` lint as shared tier-0 tasks; `forbidOnly` in
   the shared `playwrightConfig`; move the skill-pin, lockfile and regenerate-then-diff checks into
   `tasks/`. Prove in remy-auth-app.
2. **Rules section:** write the 36 prose-only rules once as a "Rules" section in `docs/content/dev/how-we-work.md`,
   each linking to its explanation; drop repeats elsewhere.
3. **Loader:** a Fumadocs loader from `docsTable` (its slugs, order and translation rules), the
   `source.config.ts` root fix, `includeProcessedMarkdown`.
4. **Site channels:** `llms[.]txt`, `llms-full[.]txt` and `docs/{$}[.]md` server routes with
   `Vary: Accept`; a Playwright check for each; list them in prerender `pages` if prerendered.
5. **Skill in the package:** `docs:skill` generates `packages/ui/skills/remy/` (`SKILL.md`,
   `references/`) with relative links, English only; add `skills` to `files`; `ui:release` runs and
   checks it; `SKILL.md` validated against the Agent Skills spec.
6. **Apps:** `skills:install` adds `experimental_sync`; `agents:rules` writes and checks the `AGENTS.md`
   block; remy-auth-app's `AGENTS.md` loses its GitHub `main` links. Prove with Codex and Claude that
   the skill is listed and the block loads, then that an upgrade from one release to the next shows the
   rule change in the diff.
7. **Task reference:** `docs:tasks` injects `mise generate task-docs` into `docs/content/dev/tasks.md`; the
   hand-written tables keep the grouping only.
8. **Later, the owner's call:** the AI Search public MCP or the Fumadocs MCP route; agent evals.

## How shadcn does it (apps/v4 at 98a1fe6, 2026-09-26)

Owner: "Fumadocs. Did you see how shadcn does it? ... you're likely missing a few tricks!" shadcn's docs
are headless Fumadocs + shadcn, as ours. What they do, and what it means here:

| Trick | Theirs | For us |
| --- | --- | --- |
| `loader()` is the single source | `lib/source.ts`: `loader({ baseUrl, source: docs.toFumadocsSource() })`; nav, search, sitemap, prev/next all read it | **Adopt.** A loader built from `docsTable` (virtual source, `defineI18n` over `docs/i18n`) replaces `docsNav`, the hand-built search indexes, sitemap/paths lists |
| Frontmatter `title` + `description` on every page | description is required (no description → 404); feeds meta, OG, LLM lists | **The conformance gap.** Add a YAML block to each docs file (repo Markdown stays the source); replaces `firstHeading()`, `describe()`; a check that every page has one |
| `meta.json` navigation | per folder, `root`, groups, external links (`[llms.txt](/llms.txt)`) | `docsTable` stays our meta, emitted as virtual meta entries (our files span the repo) |
| Per-page `.md` | `/docs/*.md` served as `text/markdown`, pre-rendered, `.mdx` redirects, redirects mirrored | **Adopt** with `postprocess.includeProcessedMarkdown` + `getText('processed')` (a Worker cannot read files): our link rewriting and provenance stripping apply first |
| Components swapped for real code in the Markdown | `lib/llm.ts`: previews → real `tsx` source with user import paths; lists → linked bullets | Not needed today (our docs have no JSX); copy it if we ever embed previews |
| `llms.txt` | hand-curated, grouped, one-line description per link; listed in the sidebar | **Generate** with Fumadocs `llms(source).index()` once loader + descriptions exist; `llms-full.txt` optional (they have none) |
| Copy page / View as Markdown / Open in ChatGPT, Claude | `docs-copy-page.tsx`, stock shadcn DropdownMenu + Popover; open-in links are `?q=` prompts with the URL | **Adopt**, fetching `<url>.md` on click instead of shipping the text in every page |
| Search | `createFromSource(source)` (Orama, server) in a shadcn Command menu | `createFromSource` replaces our `createI18nSearchAPI` code once the loader exists |
| Skill with rules, evals, live context | `skills/shadcn/SKILL.md`: rules digest → `rules/*.md` (Incorrect/Correct pairs), `evals/evals.json`, `` !`npx shadcn info --json` `` live context | **Adopt** as the `remy` skill in the package: prose-only rules as a digest + rule files, evals, `` !`mise run …` `` context |
| AGENTS.md block → docs in `node_modules` | Next's template: `<!-- BEGIN:nextjs-agent-rules -->` pointing to `node_modules/next/dist/docs/` (version-pinned) | **Adopt**: settles pinning; replaces the GitHub `main` links |
| Registry `meta.links`, `/code/*` → raw GitHub, `shadcn docs <name>` | links per item to docs, examples, upstream `.md` | Only if we publish a registry; a `/code/:path` redirect is cheap |
| MCP server | serves their registry | Not now |
| Docs checks | none (prettier, eslint, tsc) | We are ahead: link, translation and layout checks |

The repo Markdown stays the source; the one change to the files is the frontmatter. The rest is a loader,
`includeProcessedMarkdown`, three routes (`.md`, `llms.txt`, search via `createFromSource`) and the copy menu.

Early lean, to test not assume (after question 0 has found what the stack gives and questions 1 and 2 have shrunk what must travel): a skill for how agents work plus the docs in the package for the
version-matched reference, and `llms.txt` because Fumadocs makes it cheap.

## Tool-up trial (2026-09-26)

Owner: "convert 1 doc and then tool up to see what works and does not work well ... don't miss any
aspects". Two trials: `docs/content/dev/gui.md` converted on the local branch `fumadocs-trial` (worktree
`.claude/worktrees/fumadocs-trial`); a scratch app from `create-fumadocs-app` 16.2.9 `--template
tanstack-start --search orama`, then every `@fumadocs/cli` 1.7.0 feature, one commit each, built and
each route requested.

| Aspect | Result | For us |
| --- | --- | --- |
| Frontmatter `title` in our pipeline | works: page title, nav | take |
| The page's heading | lost: Fumadocs pages render `title` and `description` themselves, the body has no `#` | done on the branch: `view.tsx` renders both when a file has frontmatter |
| Frontmatter `description` | ignored: our `describe()` guessed from the first paragraph | done on the branch: frontmatter first, guess as fallback |
| On GitHub | the file opens with a metadata table instead of a heading (**assumed**, GitHub's rendering of YAML; not looked at) | accept; the site is where docs are read |
| Declaring the docs | the template has **no `source.config.ts`**: `defineDocs` from `fumadocs-mdx/macro` in `src/lib/source.ts`, with `includeProcessedMarkdown` | take; the root-path bug goes with the file. The macro takes `files` patterns (types checked); our remark plugins on it **assumed** until tried |
| Languages | `feature docs --i18n` uses the dot parser (`index.cn.mdx`), a `{-$lang}` route and `hideLocale` | take `defineI18n` with `parser: 'dir'` only; language routing stays Paraglide's (owner rule) |
| Search | `createFromSource(source)` answers per locale (`?locale=cn`) | take; replaces our search API code |
| `llms.txt`, `llms-full.txt` | work; **one file mixes every language** (a `# Docs` block each) | take; one file per language or English only is ours to set |
| `.md` per page | works per language (`/cn/docs/index.md`); keeps `[#id]` and any JSX | take (our docs have no JSX) |
| MCP (`feature mcp`) | works on Node: `list_pages`, `get_page`, `search` | later, owner's call; Workers **assumed** |
| WebMCP | writes a 97-line component | later (experimental) |
| OG images (`feature og`, takumi) | works: a 12 KB WebP per page | maybe later; Workers **assumed** |
| Feedback | 520 lines of Fumadocs UI (base-ui) plus GitHub Discussions | no: not shadcn |
| AI chat (`feature ai`) | 765 lines, OpenRouter | no: duplicates AI Search |
| EPUB export | works behind a secret | no need seen |
| `feature lint` | an oxlint/Biome/ESLint config for code, not docs | not a docs tool; a linter is its own survey |
| `add`, `customise` | Fumadocs UI components | no: shadcn |
| CLI composition | `feature docs --i18n` after the template leaves the old routes, so the **build breaks** (missing `gitConfig`); `feedback` and `ai` then patch the stale routes; **prerender fails** on `/en` | use the CLI in a scratch app as the reference and copy its files; never run it on our repo |
| Hosting | the template builds with Nitro (Vercel preset); the routes are plain TanStack Start server routes | carry over to our Cloudflare Vite plugin; Nitro not needed |
| Versions | the template pins `fumadocs-core` 16.15.14 and `fumadocs-mdx` 15.4.5, as we do | none |

## Decision: Fumadocs fully (2026-09-26)

Owner: "fuma docs is good and you can probably use it fully if you are more flexible about changing our
system and what our system docs provide to the gui." So the docs take Fumadocs' shape (the
`tanstack-start` template and `@fumadocs/cli` 1.7.0 output) and the GUI takes what the loader gives.
Only two things stay ours, both owner rules: Paraglide owns the URLs (`/<locale>/docs/...`), and the
UI is stock shadcn (no fumadocs-ui).

| Today (ours) | Becomes (Fumadocs) |
| --- | --- |
| Docs read in place across the repo; `src/docs/table.js` lists them | `content/docs/*.md` plus `meta.json` (order, titles, groups); READMEs become short pointers to the site (GitHub and npm still need a README) |
| `docs/i18n/<locale>/<path>` | the CLI's default `dot` layout: `gui.es.md` beside `gui.md` (a translation sits next to its English) |
| `source.config.ts` and three plugins | `src/lib/source.ts` with `fumadocs-mdx/macro`, `src/lib/i18n.ts`, `src/lib/shared.ts`, `cli.json`: the CLI's own files |
| Links rewritten by `remarkRepositoryLinks` | relative links between docs through `source.resolveHref`; links to other repo files written as full GitHub URLs |
| The page as a data tree (`rehypeExportTree`) | the page's compiled Markdown, loaded per page, rendered with our shadcn components; the Core Web Vitals gate guards the cost |
| First-heading titles, `describe()` | frontmatter `title` and `description`, required by the schema |
| `docsNav`, `docsLangs`, English fallback by hand | `source.getPageTree(lang)`, `defineI18n({ fallbackLanguage: 'en' })`, the page's languages from the loader |
| Our search API and hit shape | `createFromSource(source)` on the server (highlights built in); our TanStack Query box calls it |
| `docs:publish` keys from the table | each page's `.md` (the `llms` output) keyed by its URL; citations resolve through `source.getPage` |
| Nothing | `llms.txt` per language, `.md` per page, later MCP, from the CLI's routes |
| `CHANGELOG.md` as a docs page | stays at the root for release tooling; `meta.json` links to it |

Also moves: `AGENTS.md` links (to `content/docs/...`), the links check (Fumadocs' `next-validate-link` for
internal links, ours kept for GitHub file links), the i18n tasks' paths (replaced in step 3 anyway).

Small steps, one at a time with the owner, each ending with a build and `browser:shots` of one page:
1. `src/lib/source.ts` (macro), `i18n.ts`, `shared.ts`, `cli.json` beside today's code; one page
   (`gui`) served through the loader.
2. Stock rendering for that page (compiled Markdown, shadcn components); measure its JavaScript.
3. Move every doc into `content/docs` with frontmatter and `meta.json`; READMEs become pointers; the
   Spanish files to the `dot` layout (a structural move, not translation: the freeze holds).
4. Navigation, table of contents, languages and fallback from the loader; delete `table.js`,
   `source.config.ts`, `source.server.ts` code it replaces.
5. Search through `createFromSource`; delete our search API.
6. The CLI's `llms.txt`, `.md` routes; `docs:publish` from them; link checks.

## Branch `fumadocs-trial`: all in (2026-09-26)

Owner: "Go all in on fuma docs and cli ... the system can be adapted so you can get the mise and cli
aligned", "get as much out of it as you can", "once we are we can review". Preview (throwaway Worker,
answers paused): https://remy-auth-check-fumadocs.gedw99.workers.dev/en/docs

What it gives, each requested on the preview:

| What | Where | How |
| --- | --- | --- |
| Docs from the loader | `/en/docs`, `/es/docs/how-we-work` | `content/docs` + `meta.json`, frontmatter, `fumadocs-mdx/macro`, one splat route |
| Previous / next, last updated | every docs page | `findNeighbour`, `lastModified` (git) |
| Page actions | every docs page | copy Markdown, view it, open in ChatGPT or Claude (shadcn dropdown) |
| Social images | `/en/og/docs/gui/image.webp`, `og:image` on each page | `docs:cli feature og` (takumi) |
| `llms.txt`, `llms-full.txt` per language | `/llms.txt`, `/es/llms.txt`, `/en/llms-full.txt` | `docs:cli feature llms` |
| Markdown per page per language | `/en/docs/gui.md`, `/es/docs/tooling.md` | same |
| Search API | `/api/search?query=mise&locale=es` | the template's route, one shared server |
| MCP server | `POST /api/mcp`: `list_pages`, `get_page`, `search` | `docs:cli feature mcp` |
| WebMCP (experimental) | docs pages, Chrome's `#enable-webmcp-testing` | `docs:cli feature webmcp`, adapted |
| Callouts, code tabs, steps | `:::note` in `gui` | Fumadocs plugins, rendered as shadcn Alert and Tabs |
| `docs:publish` from the site | R2 gets each page's `.md` | fetched from the live site after deploy |
| i18n tasks on Fumadocs' layout | `mise run i18n:status` | `<name>.<locale>.md` beside `<name>.md` |
| The CLI in mise | `mise run docs:cli -- feature ...` | pinned `@fumadocs/cli` 1.7.0 |

For the review:
1. **Worker size:** 2.71 MB gzip of which the OG renderer's WebAssembly is 1.6 MB (free plan limit 3 MB,
   paid 10 MB). Option: prerender the images at build, keeping them out of the Worker.
2. **Tests:** `tests/docs.spec.ts` and `tests/gui.spec.ts` still import the old table exports; level 1
   stops at load. Next after the review.
3. **Stock rendering** ships each page's compiled Markdown (gui: 142.5 KB, 23.6 KB gzip) where the old
   page sent data; the Core Web Vitals gate will say whether it matters.
4. **EPUB** cannot run in the Worker (`ejs` uses `new Function`); a build-time mise task or drop it.
5. **Not wired yet:** Mermaid; the OpenAPI reference (`fumadocs-openapi`) and TypeScript type tables
   (`fumadocs-typescript`) render with Fumadocs UI components, so they need shadcn mappings first.
6. **`fumadocs-ui`** is installed only for the OG renderer (`fumadocs-ui/og/takumi`), no UI from it.
7. **Frozen translation work** this creates: Spanish descriptions, the "Changelog" link title
   (`meta.es.json`), seven new UI strings in twelve catalogs, and the provenance comment still showing in
   Spanish `.md` output (removed in step 4).
8. **Consumers:** the shared i18n tasks changed layout (`I18N_DOCS_TABLE` gone, `I18N_DOCS_DIR`
   optional); remy-auth-app gets it on its next tasks ref.
9. `llms.txt` links are site-relative (`/docs/gui`); outside tools may want absolute, localized URLs.
10. Fixed on the way: the Look item "Docs pages open with repository links meant for GitHub".

## Round 2: Fumadocs UI, two audiences, every feature (2026-09-26)

Owner: "you can change our system to suit fumadocs too ... until you have adopted all features you will
not really know ... it may reduce any custom code ... help me to decide with recommendations ... product
docs read by users ... images or videos". Previews side by side (answers paused on both):
- ours, shadcn-built docs UI: https://remy-auth-check-fumadocs.gedw99.workers.dev/en/docs/developers
  (before the split into tabs: /en/docs/gui there)
- Fumadocs UI in shadcn's colours: https://remy-auth-check-fumadocs-ui.gedw99.workers.dev/en/docs

Adopted and seen working: Fumadocs UI (DocsLayout, DocsPage, search dialog, table of contents with
scroll-spy, code copy, image zoom, page actions, edit on GitHub, last update); root folders as tabs
(Guide, Developers) with Lucide icons and sections; a product guide with real screenshots, a recorded
video (`browser:shots --video`), tabs, steps, cards, accordions; a Writing docs page with Files, Mermaid
and a type table from our TypeScript; the changelog through `<include>`; everything from round 1.

Custom code, lines without comments: stock from the CLI and template 270; the docs page on Fumadocs UI
195 (our own shadcn docs UI was ~420); the old docs UI now left only for the search and answer pages
103; search and Ask AI 386; `table.js` 38.

Recommendations, each the owner's call where it touches a rule:
1. **Fumadocs UI for the docs area, shadcn stays for the site and app.** Amend the rule to "shadcn for
   the site and app; Fumadocs UI with its shadcn preset for docs". It halves our docs UI and every later
   Fumadocs feature arrives by upgrade.
2. **One docs layout for every repo:** `content/docs/guide` (product docs for the app's users) and
   `content/docs/developers`, each a root folder; media in `media/` beside the pages.
3. **Move the docs system into the shared package** as a part (source, routes, view), so a consumer adds
   `content/docs` and gets the same docs. Next plan after this one.
4. **Search:** Fumadocs UI's dialog replaces our live search box; keep `/docs/search` as the no-JavaScript
   page inside DocsLayout; delete the old nav, content and page-action files.
5. **Ask AI:** try `docs:cli feature ai` (Fumadocs' Ask AI panel) with its `/api/chat` backed by our AI
   Search answers, instead of our own ask form and answer UI. A trial first.
6. **Social images:** prerender them at build, or keep them dynamic only on the paid Workers plan: they
   are 1.6 of the Worker's 3.1 MB gzip (limits: 3 MB free, 10 MB paid).
7. **OpenAPI reference** (`fumadocs-openapi`, `openapi.staticSource()` in the loader): split the loader
   into a server copy and a browser copy first, or the whole spec ships to every docs page.
8. **`remark-llms`** for the `.md` and `llms.txt` output of `.mdx` pages, which now carry JSX and image
   placeholders.
9. **Drop EPUB** (cannot run in a Worker) and the CLI's `tree` (needs `tree`, not in the mise registry).
10. **Then:** rewrite `tests/docs.spec.ts` and `tests/gui.spec.ts` for the new layout, run the full tier,
    merge; the frozen translation work grows by the guide pages and the new strings.

## Round 3: two sites, then their own Worker (2026-09-26)

Owner: split docs into users (product) and dev, each with its own languages; docs leave Paraglide; OpenAPI;
llms for both, so Google and Gemini get every language; "we could run docs on a different worker ...
not so bound by the workers AI size limits". Decided and built on the branch:

- **`docs/` is its own app and Worker (`remy-auth-docs`)**, Fumadocs' TanStack Start template on
  Cloudflare's Vite plugin. The app Worker went from 5.2 to 0.6 MB gzip; the docs Worker is 4.9 of its own
  10 MB. The app keeps a Docs link (VITE_DOCS_ORIGIN) and 301s its old /<locale>/docs/* to the docs Worker.
- **Two sites:** users' docs at `/docs` (`docs/content/users`), developer docs at `/dev`
  (`docs/content/dev`), each with its own `i18n.json` (languages), `meta.json` (navigation), loader,
  search (`/api/search/<site>`), `llms.txt`/`llms-full.txt`/`.md` per language, MCP (`/api/mcp/<site>`) and
  social images (`/og/<site>/...`). URLs: `/docs/es/formats`. No Paraglide in the docs Worker.
- **For search engines and their AI answers:** `<html lang>` per page, canonical, hreflang for every
  language a page has, `/sitemap.xml` with alternates, `/robots.txt`, descriptions (a translation without
  one borrows the English until step 4), social images.
- **API reference:** `/dev/api/...` from the oRPC contract alone (fumadocs-openapi): playground, examples in
  seven languages, schemas.
- **Shared, not copied:** the Start middleware (request ID, nonce CSP, server function log) and the CSP report
  handler moved into `@joeblew999/remy-ui` (`./start`, `./csp-report`); both Workers use them.
- **Tasks** (consolidated in round 4 to 14, shared in `tasks/`): `docs:dev`, `docs:build`, `docs:check`,
  `docs:test`, `docs:test:remote`, `docs:preview`, `docs:deploy`, `docs:cli`, `docs:init`, `docs:publish` (both
  sites, keys `<site>/<lang>/<page>.md`), `docs:answers:*` on the docs Worker.

Next, in order:
1. **Ask AI in the docs Worker** as Fumadocs' AI panel (`docs:cli feature ai`) backed by our AI Search
   answers (`ask.server.ts` is already here), one per site; the app's old search and ask pages are gone.
2. **Caching:** docs HTML changes only with a deploy, so cache it at the edge (or prerender it); the Worker
   then answers search, MCP, social images and Ask AI only.
3. **Tests:** move the docs checks into the docs app (its own Playwright project), drop the app's docs
   tests, run the full tier on both Workers.
4. **Merge and first deploy** of `remy-auth-docs` (a new production Worker), then `docs:publish` and Ask AI on.
5. **The shared docs part:** the docs app's code into the package, so a consumer adds `docs/content` only.

## Round 4: cleanup on the branch (2026-09-26)

Owner: "you have shitloads to clean up. don't merge to main yet"; "I don't want a ton of complex scripts ...
mise tasks one line calling tools"; "you hardly need any docs tests, that's why we embraced fuma". Done on
the branch: build output untracked; unused dependencies removed; the app without AI Search or docs routes
(old addresses 301 to the docs Worker); the docs Worker's few tests (SEO head, Ask AI's route, hydration);
the shared smoke tier fixed; `docs:*` tasks one tool call each (MCP Inspector, wrangler, playwright, vite);
observability through fnox with one API token; the API reference on its own URL; absolute URLs from the
request (Lighthouse SEO 100); media by URL; Ask AI's no-answer marker; `docs.config.ts` for the product's
specifics; Fumadocs UI text files per language. Production docs deployed from the branch.

Next: **the shared docs part** (its own step): the `docs:*` tasks into `tasks/` so any app has them (the
observability ones must read the docs app's Wrangler configuration wherever they are included from), and a
`docs:init` that brings the docs app into an app at its pinned tag (content, `docs.config.ts`,
`wrangler.jsonc` names and the contract import are the app's). Then remy-auth-app adopts it.
