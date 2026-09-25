# Docs on the site, with AI answers that cite the page

Status: proposed 2026-09-25 under the owner's delegation; spike done, nothing built in the repo.
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

## Decisions for the owner

1. Provisioning: create the production AI Search instance `remy-docs` and an AI Gateway with a
   spend alert, on this account. What monthly Workers AI spend is the ceiling?
2. `.plans/` stays out of the public docs (decided); say so if you want it in.
3. Docs in English only for now (decided); translation waits for the hard localisation work.
