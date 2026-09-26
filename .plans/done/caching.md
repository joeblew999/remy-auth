# Caching (quick plan)

Closed 2026-09-26: decided "don\'t cache HTML yet" (every page carries a per-response CSP nonce and request ID); hashed assets are immutable (public/_headers); robots.txt and sitemap.xml send cacheable headers for when Workers Caching is turned on. Hash-based CSP for cacheable site pages is not planned.

Status: open, 2026-09-25; step 0 built (see "Decision 2026-09-25"), HTML caching not started. Owner's request: "a proper solution for
caching. TanStack must have one?" Applies to both apps through the shared package and tasks.
Checked 2026-09-25 against the TanStack skills, Start 1.168.58, Wrangler 4.137.0, TanStack's ISR
guide and Cloudflare's docs. Anything else is marked **assumed**.

## Correction to what we believed

We thought Cloudflare does not cache a Worker's own responses on workers.dev, and that a custom
domain was needed. That is no longer true. **Workers Caching** (`"cache": { "enabled": true }` in
`wrangler.jsonc`, Wrangler 4.69 or later) puts Cloudflare's cache *in front of* the Worker. It works
on workers.dev, custom domains and previews. It follows our `Cache-Control`, `s-maxage`,
`stale-while-revalidate`, `Vary` and `Cache-Tag` headers (RFC 9111), and `ctx.cache.purge()` clears
entries. The cache key is the path, the query string and the **Worker version**, so every deploy
starts with a fresh cache and no purge step is needed. Zone Cache Rules, Page Rules and the
Cache API do not apply to it ([docs](https://developers.cloudflare.com/workers/cache/)). A custom
domain is now about branding and alerts, not caching. Trade-offs: with caching on, **every**
request is billed, including static assets and calls between entrypoints, which are free today
(hits use no CPU); `Set-Cookie` responses and `Authorization` requests skip the cache.

## Decision 2026-09-25: don't cache HTML yet

Survey result, unattended run (owner: "pump and deploy fast"): every HTML response carries a
per-request CSP nonce (`cspNonce` in `src/start.ts`, router `ssr.nonce`), an `X-Request-ID`, and
on site pages the cookie/Accept-Language hint and the `request.cf` place card. Caching any of it at
the edge would serve one visitor's nonce, request ID and hints to the next, so HTML stays `no-store`
until W2 to W4 land. TanStack Start has no hash-based CSP (stock `ssr.nonce` only), so dropping the
nonce for cached pages is our own code and waits for W3. `"cache": { "enabled": true }` is **not**
switched on: with HTML uncacheable the only cacheable responses are robots.txt and sitemap.xml, and
turning it on bills every asset request (decision 1 below), so today it costs more than it saves.
Hashed `/assets/*` are already `immutable` (`public/_headers`), which is the real win in place.

Built (step 0): `crawlCache` now says `public, max-age=3600, s-maxage=3600`, so robots.txt and
sitemap.xml are cache-ready the day Workers Caching is on (**assumed:** the key includes the host, so the
origin in their bodies stays correct; their `X-Request-ID` would repeat on a hit, accepted for
crawl metadata). `/api` stays `no-store` (contracts plan decides per route); docs search
(`searchDocs`, a GET server function keyed by the query) is left uncached until Workers Caching
is on; it is the next candidate for `public, s-maxage`.

## TanStack's model and how it maps

TanStack Start has no cache of its own on the server. Its ISR guide and the deployment and
server-functions skills say to set standard headers and let the CDN do the caching:
- **Pages:** the route `headers()` option (typed in router-core `route.d.ts`), or
  `setResponseHeader(s)` in a loader or middleware:
  `public, max-age=0, s-maxage=N, stale-while-revalidate=M`. ISR here means `s-maxage` plus
  stale-while-revalidate, with an optional purge endpoint.
- **Server functions and server routes:** GET handlers set `Cache-Control` the same way. The
  server-functions skill says never to mark as `public` anything that reads a session or cookie.
- **In the browser:** Router's loader cache (`staleTime`, `gcTime`) and TanStack Query already
  cache (`src/router.tsx`). The edge cache sits in front; neither replaces the other.
- **On Cloudflare:** the headers above drive Workers Caching directly. A deploy clears the cache
  because the version is in the key. Put the locale in the path (Paraglide `url` strategy, which
  we already use) rather than `Vary: Accept-Language`. `Vary` is honoured
  ([Vary](https://developers.cloudflare.com/workers/cache/configuration/)), but it splits the
  cache into one copy per header value.

## Survey (fixed criteria: upstream-owned, no custom code, works on workers.dev, correctness, cost)

| Candidate | Score | Notes |
| --- | --- | --- |
| Workers Caching + TanStack route `headers()` | best | Only headers and a config flag. Deploy clears it. Charges for asset requests too |
| TanStack Start prerendering of site pages (as remy-auth-app does) | runner-up | Static assets are free and cached. But no Worker runs, so no log line and no request ID, and `time-zones/$` needs a list of paths. Switch to it if billing or logging rules out option 1 |
| Cache API (`caches.default`) | rejected | Hand-written code, one data centre, Worker runs every time |
| Zone Cache Rules on a custom domain | rejected | Do not apply to a Worker's own responses |

Both finalists get a small scratch build in W1 before anything is chosen (how-we-work).

## What each kind of page gets

| Kind | Cache-Control | Where set |
| --- | --- | --- |
| Site pages (`/:locale/...`) | `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` (**assumed** values), no `Vary` | Root route `headers()` in the shared package; `localizedWorker` keeps `no-store` as the default for everything else |
| App pages (`/app/...`) | `private, no-store`, forever (auth follows; [auth plan](../parked/auth-service.md) "never share a public cache") | Stays the `localizedWorker` default |
| Entry redirects (un-localized paths) | `private, no-store` (they depend on Accept-Language and the cookie) | `entryRedirect` |
| `robots.txt`, `sitemap.xml` | `public, max-age=3600` as now, plus `s-maxage` | `packages/ui/src/parts/seo-routes/server-routes.ts` `crawlCache` |
| `/healthz` | `no-store`; it must always reach the Worker | `withObservability` |
| Future `/api` | `no-store` by default; `public` only for data that is the same for everyone, byte for byte | Per route, in the contracts plan |
| `/assets/*` | `public, max-age=31536000, immutable` (done) | `public/_headers` |

## What has to change first

1. **Site pages must be the same for every visitor.** Today the language hint comes from the
   cookie and Accept-Language (`src/preferred.ts`, root loader) and the /formats place card from
   `request.cf` (`packages/ui/src/parts/deferred-place/place.server.ts`). Move both to the
   browser on site pages only (`createClientOnlyFn` or `ssr: 'data-only'`; the browser location
   exists since 0.9.3). App pages keep them.
2. **CSP:** a per-request nonce inside cached HTML would be served again to later visitors, which
   defeats it. Site pages that are cached switch to a hash-based CSP; app pages keep the nonce.
   **Assumed:** TanStack Start has no built-in hash CSP. W1 checks this; if it is missing, record
   the gap before writing any code of our own.
3. **Request ID and log line:** on a cache hit the Worker does not run, so a cached
   `X-Request-ID` would be served again and no log line would be written. The upstream pattern
   ([examples](https://developers.cloudflare.com/workers/cache/examples/)) fixes this: an
   uncached gateway entrypoint (`withObservability`, Paraglide redirects) calls a cached Start
   entrypoint through `ctx.exports`, billed twice (**assumed** fine at our traffic).
4. **No `Set-Cookie`** on site pages, or they skip the cache (**assumed** none today; W1 checks).

## Log contract: cache outcome

Add `cache` to the line `withObservability` writes, taken from the inner response's
`Cf-Cache-Status` (`HIT`, `MISS`, `EXPIRED`, `UPDATING`, `BYPASS`, or `none`); additive, so
`schemaVersion` stays 1, and hits and misses filter in Workers Observability. Cloudflare's own "Cache Analytics in Workers
Observability" is listed as coming soon, and the cache-keys page says hits show there already;
**assumed** unclear until W1 looks. Owner: [observability plan](observability.md).

## Checks (shared, level 1 locally and against the preview)

- Each kind of page in the table above: the exact `Cache-Control`, no `Vary: Cookie` on site
  pages, and no `Set-Cookie` on site pages.
- Preview: a site page twice gives `Cf-Cache-Status: HIT`, the same body and a *different*
  `X-Request-ID`; an app page is never `HIT`.
- Site page HTML contains no nonce, no location and no language hint from the server; its CSP
  hashes match its inline scripts. App pages carry the nonce.
- The log line has `cache` for every request.

## Work items (Executor; the Reviewer accepts each)

| # | Work | Size |
| --- | --- | --- |
| W1 | Spike on a preview: Workers Caching and prerendering, each with one site page. Check `HIT`, the gateway pattern, Set-Cookie, hash CSP and the Observability cache field | S (half a day) |
| W2 | Language hint and place card to the browser on site pages; the page looks the same, and the Lighthouse and Core Web Vitals gates stay green | M |
| W3 | Hash CSP on site pages, nonce on app pages (merges with the CSP work under way) | M |
| W4 | Cache headers per kind (route `headers()` and the shared defaults), `cache.enabled`, gateway and cached entrypoints | M |
| W5 | Log contract `cache` field, the checks above, the shared tasks and docs | S |
| W6 | Release, then remy-auth-app follows (its pages are prerendered, so only its Worker routes change) | S |

## Decisions for the owner

1. Workers Caching (all requests billed, assets included) or prerendered site pages (free
   assets, no log line on those pages)? W1 gives the numbers.
2. A custom domain: no longer needed for caching; still needed for availability alerts
   ([observability plan](observability.md)). Now or later?
3. Site page freshness: `s-maxage` and stale-while-revalidate values (suggested 1 h and 1 day;
   a deploy clears everything anyway).
4. Is it acceptable that site pages show the language hint and the place card only after
   hydration?
