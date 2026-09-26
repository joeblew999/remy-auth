# AI answers where Cloudflare pulls the docs (route B)

Closed 2026-09-26: route B live (AI Search remy-docs-pages reads the R2 bucket remy-docs; docs:publish after every deploy; per-language folder filter).

Status: decided 2026-09-25, after route A (Fumadocs site search, no AI). Owner: "Can we have A and B."
Earlier the same day: "It's just complexity unacceptable that a deploy of the docs take this long",
"Most users though will want to ask from the site ... And stay in the site."

## Why

Today we push every section into AI Search's built-in storage ourselves (docs-manifest, docs-index with
hashed keys, retries and waiting, docs-dev). AI Search is in open beta: "overloaded" replies and items
stuck "processing" for 40+ minutes made a docs update take 5 to 10 minutes. AI Search can instead pull
the docs itself, on its own schedule, and our upload code goes.

## How

- **Now (no domain): an R2 source.** One Markdown file per docs page in an R2 bucket (`remy-docs`,
  keys = the docs slug, from src/docs/table.js), put with Wrangler's own `r2 object put` from a mise
  task on release; AI Search's R2 source syncs changed objects (sync interval, or a sync job from
  `wrangler ai-search jobs create`). Citations are pages: the answer maps the object key to its docs
  URL through the docs table. Heading-level citations are lost; accept, or split files per `##` later.
- **Later (a custom domain on this account): the web crawler source.** AI Search crawls the live
  /docs pages from the sitemap; nothing is uploaded at all, and citations are the page URLs.
- **Ask from the site.** The question box and its answer move from /app/ask to a site page beside the
  docs search (server-rendered, works without JavaScript, query pages noindex).
- **Delete** after the switch: scripts/docs-index.mjs, docs-dev.mjs, the manifest's upload role, the
  dev instance, the hashed-key items in remy-docs (a new instance with the R2 source replaces it).
- **Keep:** docs:questions (search only), docs:answers:off|on, cf:ai-usage, cf:ai-check, cf:ai-gateway.

## Open

- Whether R2 object metadata can carry page title and URL for citations (else the docs table maps them).
- The R2 bucket is a new resource (storage cost is negligible for a few hundred KB of Markdown).
- Other languages: one folder per language in the bucket and a metadata filter on search.

## Built (2026-09-25)

- **Ask from the site:** `/docs/ask?q=` (src/routes/docs.ask.tsx) is a site page in SiteShell beside
  `/docs/search`, treated as it is: the empty page is indexable with its canonical and alternates (not
  in the sitemap); a page with a question is noindex without them. Every response stays
  `private, no-store`, and the router keeps each answer for the visit (staleTime Infinity, keyed by q).
  The docs pages' question box posts there. `/app/ask` in every language answers 301 to `/docs/ask`
  with its question (src/routes/app.ask.tsx). Limits, too-long, no-answer and ASK_PAUSED are unchanged.
- **Citations from the R2 source:** the production binding names the instance `remy-docs-pages`,
  whose items are the R2 objects `<slug>.md` (`index.md` for /docs; `docsObjectKey` in
  src/docs/table.js, for the upload task too). Chunks carry no metadata, so src/ask.server.ts maps
  `chunk.item.key` to its docs row: the citation is the page (its title), or, when the chunk's text
  has a Markdown heading line that is one of the page's "On this page" headings, that section
  (`<page>: <heading>`, linked to its id). So heading-level citations are kept where the chunk shows
  its heading.
