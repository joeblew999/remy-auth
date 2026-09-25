# AI answers where Cloudflare pulls the docs (route B)

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
