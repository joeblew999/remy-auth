# Docs on the site, with AI answers that cite the page

Status: approved by the owner 2026-09-25 ("I approve all your recommendations", Workers AI ceiling
$10 a month); D1 to D7 built on branch `docs-site` (see [Implementation](#implementation-2026-09-25));
waiting for the Reviewer, then deploy, `docs:index` and the remote answer check.
Owner: remy-auth. Executor/Reviewer roles as in [plans and roles](../docs/development.md#plans-and-roles).
Owner, 2026-09-25: "The site needs docs? What shadcn way is easy? Markdown based or something or
tanstack. The docs are going to need AI answers in Cloudflare, so a person hitting the site can
easily ask questions and get taken to the page with the answers. The docs are different from
product pages. Product pages will be more visual of course. [...] The docs we have in the repo are
fine to be the docs for the site."

Checked 2026-09-25 against npm, the upstream repositories, Cloudflare's docs and a scratch build
(TanStack Start 1.168.58, Router 1.170.39, Vite 8.3.0, Wrangler 4.137.0, React 19.3.0). Anything
else is marked **assumed**.

## Goal

- The repo's Markdown is the docs, read in place: no copies, one home per fact.
- Docs pages are **site pages**: complete in the server's HTML without JavaScript, indexed, in the
  sitemap, in the site header, looking like the rest of the site (stock shadcn).
- A visitor can ask a question and get a short answer whose citations link to the exact page and
  heading. The docs stay readable and findable without the answer box.

## Survey 1: Markdown docs in this TanStack Start site

Weights: works without JavaScript and for Google (SSR, headings, canonical, sitemap) 25; repo
Markdown in place 15; shadcn consistency 15; TanStack Start on Workers with our versions 15; code
blocks and tables 10; build and bundle cost 10; maintenance 5; fits the header and two kinds 5.
Scores 1 to 5, total out of 100.

| Candidate | NoJS | Repo | shadcn | TSS/CF | Code | Cost | Maint | Fit | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **fumadocs-core + fumadocs-mdx, headless, in our `SiteShell`** (shadcn's own docs stack) | 5 | 5 | 5 | 5 | 5 | 3 | 4 | 5 | **95** |
| Content Collections + remark/rehype (tanstack.com's stack) | 5 | 5 | 3 | 5 | 5 | 4 | 4 | 5 | **91** |
| `@mdx-js/rollup` directly, our own glob, TOC and slugs | 5 | 3 | 5 | 5 | 4 | 4 | 3 | 5 | 88 |
| `@tanstack/markdown` 0.0.15 | 5 | 3 | 4 | 4 | 3 | 5 | 1 | 5 | 80 |
| Fumadocs UI (`DocsLayout`, its own theme and components) | 4 | 5 | 3 | 4 | 5 | 2 | 4 | 2 | 76 |
| A separate docs site (Starlight, VitePress, Docusaurus) | 5 | 4 | 1 | 1 | 5 | 3 | 5 | 1 | 65 |
| shadcn registry block for docs | none exists: `shadcn search @shadcn` for "docs" and "toc" finds only sidebar-01/02/07 and dashboard-01 | | | | | | | | n/a |

Sources per score:
- shadcn's own site (`shadcn-ui/ui` `apps/v4/package.json`, `source.config.ts`) uses
  `fumadocs-core` 16.10.5 and `fumadocs-mdx` 15.0.12 headless with its own components and
  `rehype-pretty-code`, not `fumadocs-ui`: that is "the shadcn way".
- tanstack.com (`TanStack/tanstack.com` `package.json`, `content-collections.ts`) uses
  `@content-collections/core` 0.14 and `@tanstack/markdown`; TanStack has no docs framework of its own.
- Fumadocs ships TanStack Start examples (`fuma-nama/fumadocs` `examples/tanstack-start`,
  `tanstack-start-local-md`), pinned to Start 1.168.56 and Router 1.170.38, with `prerender`;
  its example hosts on Nitro, not Cloudflare. Its Cloudflare issues (#1950, #2508, #2800, #2875)
  are all closed. `fumadocs-ui` needs its own CSS preset (`fumadocs-ui/css/neutral.css`) and
  `RootProvider`, and its `DocsLayout` brings its own header: two headers, two sets of
  components beside the ones shadcn's CLI writes (breaks [UI: shadcn and TanStack all the way](../docs/how-we-work.md#ui-shadcn-and-tanstack-all-the-way)).
- NoJS, Repo, Code, TSS/CF and Cost for the top two: the spike below. Maintenance: npm
  (`fumadocs-core` 16.15.14 and `fumadocs-mdx` 15.4.5 published 2026-09-24/25, frequent
  releases: pin exactly; `@content-collections/core` 0.15.3, 2026-09-21; `@tanstack/markdown`
  0.0.15, pre-release). `@mdx-js/rollup` 3.1.1 is stable but leaves loading, slugs, titles and the
  TOC to us (**assumed** from its README; not built).

**Choice: fumadocs-core + fumadocs-mdx, headless.** It is what shadcn's own docs use, it reads the
repo files in place (`defineDocs({ dir: '.', docs: { files: [...] } })`), gives heading ids, the
TOC, GFM tables, Shiki code blocks, structured data for search and `llms.txt` without our code, and
we render it with our shell and shadcn components. **Runner-up: Content Collections.** Switch if
Fumadocs' release churn breaks our pinned TanStack versions twice, or if MDX compilation of plain
Markdown becomes a bundle problem; its HTML-string output then costs us the component mapping
(links become full navigations, styling by descendant selectors).

## Survey 2: AI answers on Cloudflare with citations

Weights: citations deep-link to the exact page and heading 25; cost 15; fresh on every deploy 15;
abuse and rate limits 15; languages 10; what works without JavaScript 10; upstream-owned, little
code of ours 10. "Gives an answer" is a must; keyword search alone does not qualify.

| Candidate | Cite | Cost | Fresh | Abuse | Lang | NoJS | Upstream | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **AI Search, built-in storage, one item per heading uploaded at deploy, called from our Worker** | 5 | 4 | 5 | 4 | 3 | 5 | 4 | **88** |
| Vectorize + Workers AI embeddings + a model, our own chunking and retrieval | 5 | 4 | 4 | 4 | 3 | 5 | 1 | **79** |
| AI Search website crawler + public endpoint + `@cloudflare/ai-search-snippet` 0.0.43 | 3 | 4 | 1 | 2 | 3 | 1 | 5 | 54 |

Sources: [AI Search limits and pricing](https://developers.cloudflare.com/ai-search/platform/limits-pricing/)
(free in open beta; Workers AI billed separately; Workers Free 20,000 queries a month, 4 MB a
file); [built-in storage](https://developers.cloudflare.com/ai-search/configuration/data-source/built-in-storage/)
(uploads are indexed immediately); [chunk citations](https://developers.cloudflare.com/ai-search/how-to/chunk-citations/)
(`chunks[].item.key` and custom `metadata`); [website data source](https://developers.cloudflare.com/ai-search/configuration/data-source/website/)
("only crawl domains that you have onboarded": workers.dev is not, so the crawler waits for a
custom domain; crawls follow a sync schedule, not our deploys); [public endpoint](https://developers.cloudflare.com/ai-search/configuration/retrieval/public-endpoint/)
(unauthenticated by design, one shared limit of 120 requests a minute by default, "allowed
origins are not authentication"); the snippets are web components that need JavaScript and bring
their own look. The Cite and Fresh scores of the choice are proven by the spike; the cost of the
default model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` per answer is **assumed** small (Workers AI
pricing, not measured). Languages: the model answered in English; answering in the question's
language is **assumed**, and the docs are English only.

**Choice: AI Search with built-in storage behind our own Worker route.** Citations are exact
because we upload one item per heading with its URL in metadata; the index is replaced on each
deploy; nothing is public except our own rate-limited route. **Runner-up: Vectorize + Workers AI.**
Switch if AI Search's beta terms change (billing is announced 30 days ahead) or its retrieval
cannot be tuned enough; it costs us chunking, embedding and retrieval code.

## Spike (scratch copy, 2026-09-25; nothing in the repo changed)

- **fumadocs** (`fumadocs-core` 16.15.14, `fumadocs-mdx` 15.4.5, Vite plugin before Start's):
  seven repo files served at `/en/docs/...` inside `SiteShell`, a docs nav and an "On this page"
  list as plain links. With scripts stripped, `docs/gui.md`, `docs/development.md` and
  `tasks/README.md` (and README, tooling) have every heading with its id (7 of 7, 3 of 3, 2 of 2,
  6 of 6, 12 of 12), every table (2, 0, 2, 3, 2) and every code block, highlighted by Shiki; title
  from the file's first heading, self-canonical, no Suspense left pending. A screenshot shows the
  stock look. Relative links became `/docs/<slug>#hash` or GitHub links by a 20-line remark
  plugin. Build passes on workerd; client adds 2.5 to 11 kB gzip per page, loaded only on docs;
  server bundle 2.8 to 3.2 MB (uncompressed).
- Findings: without `applyMdxPreset` the page threw on render (no TOC); the plain-Markdown
  schema needs a default title; a Node import in the remark plugin leaks into the client graph
  unless it lives in `source.config.ts`; `/es/docs/gui` rendered with hreflang alternates, which
  must go (below).
- **Content Collections** 0.15.3 built the same pages as HTML strings (2.4 s content build);
  complete without JavaScript too.
- **AI Search**: a disposable instance `remy-docs-spike` (deleted afterwards) with custom
  metadata `url` and `title`; five sections of `docs/how-we-work.md` and `docs/development.md`
  uploaded, one item per `##` heading. A local Worker with a remote `ai_search` binding asked
  "What must I run before pushing or releasing, and why not pipe it through grep?" and got a
  correct two-sentence answer citing `/en/docs/how-we-work#gates-before-anything-leaves-the-machine`
  first (score 1.0); all five cited anchors exist in the built pages.

## Decisions (delegated, with reasons)

1. **Docs are site pages** at `/docs` and `/docs/<slug>`, listed in `paths.js` from one docs table,
   framed by `SiteShell` with a "Docs" link in its header. Reason: they are for Google and for
   anyone arriving from a search; the site header already exists.
2. **Content:** `README.md`, `docs/*.md`, `packages/ui/README.md`, `tasks/README.md` and
   `CHANGELOG.md`. Not `.plans/` (working notes that change hourly and hold open owner decisions),
   not `AGENTS.md` or `CLAUDE.md` (agent indexes). One table (file to slug) is the only list.
3. **English only, canonical to `/en`.** Every locale has the page (the frame is localized by
   Paraglide), but the article carries `lang="en"`, the canonical is `/en/docs/<slug>`, there are no
   hreflang alternates, and only the `/en` URLs are in the sitemap. Reason: one text, one indexed
   URL; no duplicate content.
4. **Docs pages differ from product pages:** text first, a docs nav and "On this page", no hero,
   no cards; product pages stay visual. Both use `SiteShell` and stock shadcn only.
5. **Answers live in an app page, `/app/ask?q=`.** The docs pages hold a plain `<form method="get"
   action="/app/ask">` (works without JavaScript); the app page renders the answer on the server
   with numbered citations as links to `/<locale>/docs/<slug>#<heading>`, carries `noindex`, is
   `private, no-store`, and needs no JavaScript to read. A dialog on the docs page may enhance it
   later. Reason: an answer is per request and not for Google, which is exactly what app pages are.
6. **Indexing at deploy:** a task builds one item per `##` heading from the same Fumadocs source
   (key `<slug>--<heading-id>.md`, metadata `url`, `title`, `release`), uploads through the AI Search
   API and deletes keys not in the new set. Production only; previews use the production index
   (**assumed** acceptable; citations then point at production URLs).
7. **Limits:** our route only (no public endpoint): question at most 300 characters, the Workers
   rate-limiting binding (suggested 10 a minute per IP), AI Search cache on (default 48 h),
   `max_num_results` 5, a `max_tokens` cap, an AI Gateway with a spend alert (**assumed** available
   on our plan). Failures show "no answer, search the docs" and the docs nav, never a blank.

## Checks (shared, level 1 locally and against the preview)

- **Docs pages complete without JavaScript:** for every row of the docs table, the server HTML with
  scripts removed contains the h1, every heading of the source file with its GitHub-style id, the
  same number of tables and code blocks as the source, the docs nav and "On this page"; a browser
  run with JavaScript disabled shows the same.
- **Every citation resolves:** every item in the upload manifest has a `url` whose page answers 200
  and contains an element with that id; the live check asks one fixed question on the preview and
  checks each returned citation the same way.
- **Links inside docs resolve:** every rewritten `/docs/...#hash` exists; every GitHub link points at
  a file that exists in the repo.
- **Sitemap includes docs:** every `/en/docs/<slug>` is in `sitemap.xml`, no other locale's docs URL is.
- **No duplicated content:** no Markdown copies in the repo (the source reads the table's paths; no
  `content/` folder, nothing generated committed); each docs page's canonical is its `/en` URL and
  it has no hreflang alternates; `/app/ask` carries `noindex` and `no-store`.
- Level 2 (Lighthouse, Core Web Vitals) on one docs page, thresholds unchanged.

## Work items (Executor; the Reviewer accepts each)

| # | Work | Size |
| --- | --- | --- |
| D1 | Fumadocs source over the docs table, link rewrite in `source.config.ts`, versions pinned exactly | S |
| D2 | Docs route and layout in `SiteShell` (docs nav, "On this page", stock shadcn typography), "Docs" in the header, docs paths in `paths.js` and the sitemap, canonical rule | M |
| D3 | The no-JavaScript, links, sitemap and duplicate checks above | M |
| D4 | Provision AI Search instance `remy-docs` with `url`/`title`/`release` metadata; `docs:index` task run after `cf:deploy` (owner request needed, below) | S |
| D5 | `/app/ask` app page: form, server function over the `ai_search` binding, citations, limits, error states, messages in every language | M |
| D6 | Citation checks, level 2 on one docs page, hands-on pass on a preview (throttled phone, with and without JavaScript) | S |
| D7 | Docs, release, now.md; remy-auth-app gets the header link only if the owner wants its own docs | S |

Status on branch `docs-site`: D1 to D5 built and checked locally; D6 checked locally except the
live answer and Core Web Vitals, which need a preview; D7 docs written, release not done.

## Decisions for the owner

1. Provisioning: **approved 2026-09-25**, ceiling $10 a month; created (below).
2. `.plans/` stays out of the public docs (decided); say so if you want it in.
3. Docs in English only for now (decided); translation waits for the hard localisation work.

## Implementation (2026-09-25)

### Cloudflare resources (account `7384af54e33b8a54ff240371ea368440`)

| Resource | Name / id | Settings |
| --- | --- | --- |
| AI Gateway | `remy-docs` | spend limit rule `monthly-10-usd`: $10 per 30-day fixed window, blocks with 429 once spent; rate limit 60 a minute; logs on; Workers AI billing `postpaid` |
| AI Search instance | `remy-docs` (namespace `default`) | built-in storage; gateway `remy-docs`; custom metadata `url`, `title`, `release` (text); cache on, `close_enough`, 48 h; `max_num_results` 5; keyword match `or`; embedding `@cf/qwen/qwen3-embedding-0.6b` (default); no public endpoint |
| Spend alert | notification policy `36460ec7f144488a83e37ad1e58a175a` ("Billing Budget Alert", $10, email) | already on the account, with the auto-created `7ab20ba503c44072a796a0a1766c7f7d`; account-wide, so it covers Workers AI |
| Worker bindings (`wrangler.jsonc`) | `DOCS_SEARCH` (`ai_search`, instance `remy-docs`); `ASK_LIMIT` (`ratelimits`, namespace 4281, 10 per 60 s) | |

**Assumed, not verified:** the gateway's spend limit is documented for Unified Billing and BYOK
requests; whether it also stops Workers AI calls billed `postpaid` through the gateway is not
stated. The hard backstop is therefore the Worker's own limits (10 questions a minute per IP, 300
characters, five sections, `max_tokens` 300, the AI Search cache); the budget alert reports
account spend daily. Switching the gateway to Unified Billing would make the limit certain but
needs prepaid credits (owner's call).

### Decisions made while building (delegated)

- **The docs table lives in the app** (`src/docs/table.js`), not in the package's `paths.js`: the
  package is shared with remy-auth-app, which has no docs. `src/paths.ts` composes the package's
  paths with the docs and `/app/ask` for the entry redirects, the sitemap and the shared checks.
- **"Docs" in the header through `SiteNavLinks`**, a context the shared `SiteShell` reads; an app
  that provides nothing (remy-auth-app) keeps the shared links only. D7's question stays open.
- **Content loads before hydration** (superseded by [Server-rendered docs](#server-rendered-docs-2026-09-25):
  there is no content chunk any more): the router's `hydrate` option (awaited by TanStack Router)
  preloaded the page's chunk; without it the article suspended during hydration and React replaced
  the server's text with nothing until the chunk arrived. A check still fails on any such drop.
- **Local runs use `wrangler dev --local`** (`playwright.config.ts`, `project:preview`): an
  `ai_search` binding always runs remotely, and without a login Wrangler refuses to start at all,
  which would break CI and the "no Cloudflare account needed" rule. Locally the binding is off.
- **Index upload**: `mise run docs:index` (scripts/docs-index.mjs) uploads one item per `##`
  section (60 today; `mise run docs:manifest` lists them) and deletes stale keys, with Wrangler's
  login. It was **not run**: uploading to the production index was held back for the orchestrator,
  so the instance is empty until the first `docs:index` after deploy.
- **Two docs lines reworded**: the compiled docs ship to the browser as JavaScript, so the app's
  build-boundary marker for server code (`/\.cf\b/`, `request.cf`) matched prose in `docs/gui.md`
  and `CHANGELOG.md`. The lines now say "the request's `cf` properties"; the marker is unchanged.
  Any future docs text naming `request.cf` will trip it again (owner's call whether to narrow it).

### How the answer check is deterministic

Everything that runs locally never reaches AI Search: limits are applied before any call, and the
binding is switched off (`--local`), so a question locally always takes the "no answer" path,
which a check asserts. The answer itself is checked only against a deployed target
(`project:test:remote`): one fixed question, asserting only structure (an answer, at least one
citation, every citation a `/<locale>/docs/<slug>#<id>` that exists), never wording; the AI Search
cache (48 h) returns the same answer to the same question. The upload manifest is checked locally:
every item's URL is an existing heading on the built page.

### Checks run (branch `docs-site`)

`mise run project:verify` (85 passed, 1 skipped: the remote-only answer), `mise run ui:verify`,
`mise run project:test:google` (6 of 6 pages pass every audit, `/en/docs/gui` included). Not run:
`project:test:cwv` and the answer check, which need a Cloudflare preview; the hands-on pass on a
throttled phone was done locally (screenshots, with and without JavaScript), not on a preview.

## Server-rendered docs (2026-09-25)

Owner, 2026-09-25: "I'm also a bit pissed off that this thing loads all the docs gui as
JavaScript. Maybe it's possible to do it both on server and client, so that site has no js or very
little. There is no reason for docs to be any other way perhaps because at the moment it's slow in
the browser." And: "What about the server side rendering thing?"

Before: the pages were already rendered on the server, but every page's text was also Fumadocs
MDX's compiled Markdown shipped as its own JavaScript chunk (8 chunks, `README-*`, `how-we-work-*`,
`CHANGELOG-*` …, 10 to 110 KiB each), fetched before hydration (the router's `hydrate` option)
and on every client navigation.

Survey (installed: Start 1.168.58, Router 1.170.39, fumadocs-mdx 15.4.5, React 19.3):

| Candidate | Result |
| --- | --- |
| TanStack Start server components (`@tanstack/react-start/rsc`, `renderServerComponent`) | Rejected for now. Start's docs mark it **experimental** ("The API may see refinements", expected to stay experimental into early v1; `@tanstack/react-start-rsc` 0.1.57). It needs `@vitejs/plugin-rsc`, forwards *every* server function into a new `rsc` environment (`ssrResolverStrategy: vite-rsc-forward`) and sets `ssr.noExternal: true` app-wide; TanStack's RSC examples run on Nitro, none on Cloudflare's Vite plugin; and the browser still gets the tree (as a Flight payload) plus the Flight client. Revisit when stable. |
| Selective SSR (`ssr: false / 'data-only'`) and prerendering | Not applicable: both change where or when the server renders, never what the browser downloads and hydrates. |
| The server sends the article as an HTML string, shown with `dangerouslySetInnerHTML` | Tried and dropped: lightest (no renderer at all), but its links are not React elements, so a docs link is no longer a router `Link` (preload on intent, localized by the router) and the check "docs links navigate in the app" fails as written (it requires hydrated links). It would also have needed our own click handler: a reinvented `Link`. |
| **Fumadocs' pattern for server-compiled Markdown** (`examples/tanstack-start-local-md`: the server sends the page's hast tree as loader data, the page renders it with `hast-util-to-jsx-runtime`) | **Chosen.** `@fumadocs/local-md` itself reads files from disk at runtime (no disk on Workers), so the tree comes from our existing fumadocs-mdx build instead: a rehype plugin exports the finished tree (after Shiki, heading ids and the link rewrite) as the page module's `tree`, the way fumadocs-mdx adds its own exports. Links stay TanStack `Link`s through the same `docsComponents`. |

How it works: `getDocsPage(slug)` returns the page with `tree` (registered as serializable, as in
Fumadocs' example); the route loader calls it, so the server's HTML carries the whole text,
hydration renders the same tree from the loader data (nothing to fetch first: the router's
`hydrate` preload and `src/docs/loader.tsx` are gone) and a client navigation fetches the next
page's data, never its code. The compiled Markdown now exists only in the Worker. The earlier note
about prose naming `request.cf` matching the build-boundary marker no longer applies: the docs text
is not in any browser bundle.

Measured once each, local production build in Chromium (`project:preview` artifact):

| | Before | After |
| --- | --- | --- |
| Docs content chunks in `dist/client/assets` | 8 (≈ 280 KiB) | 0 |
| JavaScript `/en/docs/how-we-work` loads | 18 files, 933,825 bytes | 16 files, 938,901 bytes |
| JavaScript `/en/docs/changelog` loads | ≈ 981,600 bytes (shell + 69,492 chunk) | 938,901 bytes |
| HTML of `/en/docs/how-we-work` | 396,799 bytes | 419,353 bytes (the tree as loader data) |

Every docs page now loads the same JavaScript: the per-page code is gone, and one generic renderer
(`hast-util-to-jsx-runtime`, about 29 KB in `view-*`) takes its place, so a short page loads about
the same bytes and a long one fewer. The text still travels twice (as HTML and as data for
hydration), as it did before (as HTML and as code).

**What the owner feels as slow is the shell, not the docs:** `index-*` (React, Router, Start,
347 KB) and the shared UI's `pages-*` (319 KB), plus app pieces the root pulled onto every page
(≈ 216 KB) that a docs page never uses. The orchestrator chose option 1 below (trim what every
page loads); done the same day, see [Trimmed first load](#trimmed-first-load-2026-09-25).

### Trimmed first load (2026-09-25)

Stock mechanisms only (TanStack Router's code splitting and moving imports to the modules that use
them); no behaviour change, no check changed. What every page loaded, and why:

- **TanStack keeps a route's `loader`, `validateSearch` and `search` options in the first load**
  (critical); only components are split by default. `/app`'s loader (`statusCardLoader`) brought the
  API client, its contract, oRPC and full Zod (≈ 120 KB) to every page: the route now sets
  `codeSplitGroupings: [['loader', 'component']]` (TanStack's per-route option; the component needs
  the same code, so no extra waterfall).
- `/app/ask`'s `validateSearch` used full Zod (`src/ask.ts`): now Zod Mini, as the shared search
  params already do; same schema, same results.
- The formats routes' shared options came from `src/formats-extras.tsx`, which also renders the rows
  (and `DeferredPlace`): they moved to `src/formats-route.ts`, so the rows go with the component.
- The shared UI's `pages` module is both the site frame and the home and formats pages, and the root,
  the problem pages and the docs imported the frame from it: the frame is now `@joeblew999/remy-ui/shell`
  and the formats rows `rows.tsx` (both re-exported by `pages`, so remy-auth-app is unaffected), and
  the showcase modules on the critical path import from them.

Measured once each, local production build, Chromium, JavaScript bytes loaded:

| Page | Before | After |
| --- | --- | --- |
| `/en/docs/how-we-work` | 16 files, 938,901 | 18 files, 762,456 (−19%) |
| `/en` | 14 files, 891,380 | 17 files, 767,242 (−14%) |
| `/en/app` | 16 files, 1,014,571 | 21 files, 977,276 (−4%) |

What a docs page still loads: React DOM (203 KB) and Query core (26 KB) in `index-*`; the site
frame's `shell-*` (257 KB: Base UI's navigation and dropdown menus with Floating UI, `cn`, the
URLPattern polyfill and Paraglide's runtime and messages); Router core (`load-client-*`, 54 KB);
Start's server-function client with seroval (36 KB); Zod Mini's core (51 KB), which the formats and
answer pages' `validateSearch` keep in every first load. Going further means changing what the frame
is built from (plain links instead of Base UI menus in the site header) or validating those search
params without Zod: owner decisions, not trimming.

## Docs search (2026-09-25)

Owner, 2026-09-25: "Most users though will want to ask from the site ... And stay in the site." The
owner chose A: plain docs search with Fumadocs' own built-in search (no AI, no Cloudflare service,
no cost), minimal code. B (AI answers with Cloudflare reading the docs) comes later from someone
else; `/app/ask` and the AI code are untouched.

Survey (installed `fumadocs-core` 16.15.14, read in `dist/search/*`; Fumadocs' search docs):

| Candidate | Result |
| --- | --- |
| **Fumadocs' search server, `createSearchAPI('advanced')`** (its built-in engine, `zbsearch`, Fumadocs' Orama fork, already a dependency of `fumadocs-core`) | **Chosen.** Indexes each page's `structuredData` (headings and paragraphs, each with its heading's anchor), groups hits by page, marks matches. `createFromSource` is the same server built from a Fumadocs `loader()`; this app has a `defineCollections` collection read by the docs table, not a loader, so it passes the same indexes itself (id, url, title, structuredData: what `createFromSource`'s default `buildIndex` passes). |
| Fumadocs' static search (`staticGET` export + `search/client/orama-static` or `flexsearch-static`) | Rejected: ships the whole index and the engine to the browser, which the owner asked not to do; needs JavaScript. |
| `search/flexsearch` server | Works the same way but needs `flexsearch` installed; the built-in engine needs nothing new. Runner-up: switch if the built-in engine's ranking proves poor. |
| Orama Cloud, Algolia, Mixedbread | Rejected: external services, accounts and cost. |

How it works: `/docs/search?q=` is a **site page** (`docsSearchPath` in `src/paths.ts`, in
`siteAndDocsPaths` and `everyPath`, so the zone, entry, CSP and observability checks cover it). Its
loader calls a server function; the Worker builds the index once per isolate on the first search
(`docsSearch` in `src/docs/source.server.ts`) and returns plain data. The page renders server-side
inside `SiteShell`, the search box is a plain GET form (works without JavaScript), and each hit is a
router `Link` to `/<locale>/docs/<slug>#<heading>`. Fumadocs gives the hit text as Markdown with
`<mark>`; the server splits it into plain pieces, so the page renders text, never HTML.

Decisions (delegated):

- **Indexing:** the empty page is an ordinary indexable site page (self-canonical, hreflang
  alternates via `pageHead`) but **not in the sitemap**: it has no content of its own. A page with a
  query carries `noindex` and no canonical or alternates (search results are not for Google, and
  noindex with a canonical sends mixed signals).
- **Where the box is:** on every docs page (above the question box) and the search page. **Not in the
  site header:** the header's app links are `NavigationMenuItem`s in Base UI's NavigationMenu
  (`SiteNavLinks`, shared with remy-auth-app), and a form does not belong in that menu's roving list;
  adding a slot to the shared `SiteShell` is a package change for the owner.
- The box uses the `<search>` landmark element rather than `role="search"` on its form, so the
  question box keeps the only `form[role="search"]` (its checks select it that way).
- The docs navigation moved to `src/docs/nav.tsx` (re-exported from `view.tsx`), so the search page
  does not load the article renderer.
- Query length: at most 100 characters (box and server).
- Code blocks are not searched: Fumadocs' structured text leaves them out (as the answers index notes).
- Ranking is Fumadocs' default (any word, tolerance 1, grouped by page); "Workers Logs" finds its
  section in `docs/tooling.md` but not first. Tune through `search` options only if people complain.

Cost: the client gets the route (4 KB) and the form (6 KB); the engine and index stay in the Worker
(`source.server` server chunk grew to about 560 KB uncompressed, zbsearch and remark).

Checks (`tests/docs.spec.ts`, "docs search"): a known phrase leads from a docs page's box to its
section's heading, without JavaScript, in every checked language, and result pages are `noindex`;
the empty page shows the box, is indexable and self-canonical; a query with no hits says so and
lists the docs; with JavaScript, results are in-app links with no errors.

## Live search panel (2026-09-25)

Owner, 2026-09-25: "The UX is pretty clunky for docs to be frank." "Yes integrating with tanstack
and stuff like that will also improve the UX." "The search ask stuff can sit there with the results
flying back."

Chosen, stock pieces only: **shadcn's Command in its `CommandDialog`** (cmdk under Base UI's Dialog),
added through `ui:components` (`dialog command`; the CLI also brought `input-group` and `textarea`,
and rewrote `field.tsx` without its `"use client"` line, which is what it writes today). It opens
from the site header's Search link and with ⌘K / Ctrl+K (`src/docs/header-link.tsx`); the panel
itself is `src/docs/search-panel.tsx`.

- **No JavaScript:** the header link keeps its `href` to `/docs/search`, and a modifier click still
  opens it; the `/docs/search` and `/docs/ask` pages and forms stay the way without JavaScript.
- **Results fly back:** TanStack Query's `useQuery` over the existing `searchDocs` server function,
  the query debounced 150 ms with **TanStack Pacer**'s `useDebouncedValue` (`@tanstack/react-pacer`
  0.23.0, the TanStack library for exactly this, instead of our own timer) and
  `placeholderData: keepPreviousData`, so the list never blanks between keystrokes. Hits are grouped
  by page (`byPage`, shared with the search page) and each is a router `Link` to its heading; a click
  follows the link, Enter clicks the selected one.
- **Ask only when chosen:** the last item, "Ask AI: <query>", runs `askDocs` only when selected, never
  while typing (each question is a model call); shadcn's Spinner, then the answer and its citations
  (`AskAnswer`, now shared with the answer page in `src/docs/ask-answer.tsx`) and a link to the full
  `/docs/ask` page. The answer is a Query kept for the visit (`staleTime: Infinity`), as the page keeps it.
- **Small JS:** the panel is `React.lazy`, loaded on first open (or on hovering the link). Docs page
  (`/en/docs/development`, local build, every script body): **before 750.1 KB (255.1 KB gzip, 20
  scripts), after 757.2 KB (262.7 KB gzip, 34 scripts)**; the lazy boundary makes Rolldown split the
  modules the panel shares with the pages into their own small chunks. Opening the panel loads about
  89 KB more (the panel chunk is 64 KB, 22 KB gzip: cmdk, the dialog, Pacer).
- **Messages:** three new Paraglide messages in all 13 languages (`search_panel_placeholder`,
  `search_panel_ask`, `search_panel_open`); titles and outcomes reuse the search and ask messages.

Checks (`tests/docs.spec.ts`, "live search panel"): without JavaScript the header link leads to the
search page in every checked language; with it, the link and both shortcuts open the panel, typing
shows results that link to the known heading, clicking one navigates in the app (no document load),
Enter follows the selected result, Escape closes; "Ask AI" makes no call while typing, one when
chosen, and shows the local "no answer" with the link to the answer page (local only: a deployed
target would pay for a model call).

**Superseded the same day (owner: "The search dialogue in top is not great UX. It floats above and
wastes screen real estate. Make it at the top of the docs area and then just update below").** The
dialog is gone: `src/docs/live-search.tsx` is an inline box (`#docs-q`, the one `role="search"` form
on a docs page) whose results replace the article as the visitor types (same Query + Pacer); choosing
a result empties the box so the page it opens shows; "Ask AI" is the first submit button (Enter
presses it), asks once and shows the answer in place, with a link to `/docs/ask`. The header link and
⌘K / Ctrl+K focus the box. Without JavaScript the form goes to `/docs/search`, or `/docs/ask` through
the button's `formaction`. `dialog`, `command` (and the `input-group` and `textarea` they brought) left
`ui:components`, and `cmdk` left the package; `search_panel_ask` is no longer used. The checks keep
their intents for the box: focus from the link and both shortcuts, results as you type linking to the
heading, an in-app navigation that shows the page, Escape clears; no ask while typing, exactly one
when asked (a call to a function the typing never called), the local "no answer" and the answer page
link; and the no-JavaScript form (`answers`, the answer page check).

## Docs translations (2026-09-25)

Owner: docs translation; plumbing proved with one language, Spanish. Survey: installed `fumadocs-core`
16.15.14 (`dist/i18n`, `dist/search/server.js`). Its `loader()` i18n (`parser: 'dir'`) assumes one
content folder per language; this app reads repository files in place through a collection, so the
docs table keeps that job with one rule, and search uses Fumadocs' own i18n server.

- **Files:** a translation lives at `docs/i18n/<locale>/<the English file's path>` (for example
  `docs/i18n/es/docs/tooling.md`). `docsFile(row, locale, exists)` in `src/docs/table.js` is the one
  rule: the translation when it exists, else the English file (`exists` is the disk in Node, the
  pages Fumadocs compiled in the Worker). `source.config.ts` compiles every file under `docs/i18n/`
  whose path names a docs table file; a translation's relative links resolve from its English file's
  folder, so links are copied unchanged. Headings keep the English ids with Fumadocs' `## Título [#id]`
  wherever the translated text would slug differently, so anchors and links between pages work.
- **Pages:** a locale with a translation renders it (`<article lang>` of that locale), canonical to
  itself, with hreflang alternates for every language the page has (English as x-default); the English
  page lists the same alternates. A locale without one keeps English text, canonical to /en, no
  alternates. The docs navigation shows translated titles. The sitemap follows `docsLangs`, the same rule.
- **Search:** `createI18nSearchAPI('advanced')` with `defineI18n`, each index tagged with its locale
  (Fumadocs' default multilingual tokenizer; `localeMap` is deprecated in this version). A locale
  without translations searches English.
- **Answers:** `docsObjectKey(slug, locale)`: English at the bucket's root, a translation at
  `<locale>/<slug>.md`; `docs:publish` puts both and deletes stale keys as before. A citation of
  `<locale>/<slug>.md` opens `/<locale>/docs/<slug>`; an English one opens in the visitor's language.
- **Add a language:** drop translated files into `docs/i18n/<locale>/` at the English paths (any subset;
  missing pages fall back to English), keep the headings' order and add `[#english-id]` where a
  heading slugs differently (`tests/docs.spec.ts` checks the ids match), then `mise run
  project:test` and, after deploy, `docs:publish`.
- **Checks** (`tests/docs.spec.ts`): each checked language shows its translation or English with the
  right `lang`, canonical and alternates and the English ids; links in every translation resolve; the
  sitemap lists each page once per language it has; a Spanish phrase finds its Spanish section while
  English and Arabic search English; every bucket key round-trips to its page in that language. The
  shared sitemap check takes the translations (`publicPageChecks({ oneLanguage: { translations } })`).
