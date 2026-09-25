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
347 KB) and the shared UI's `pages-*` (319 KB), plus app pieces the root pulls onto every page
(`skeleton`, `api`, `schemas`, `reservation`, `deferred-place`, `createServerFn`, ≈ 216 KB) that a
docs page never uses: about 900 KB of the 939 KB. "No js or very little" for docs pages means not
hydrating them at all, which TanStack Start cannot do per route today without server components.
Options for the owner: (1) trim what the root route imports so docs pages stop loading app code
(no behaviour change, likely several hundred KB); (2) adopt Start's server components once stable;
(3) serve docs pages as plain HTML with no client bundle (outside the TanStack app, e.g. a
server route that renders the same tree to a string), giving up in-app navigation for them.
