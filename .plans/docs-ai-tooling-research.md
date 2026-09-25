# Docs AI answers: what's what, and tooling that is not reinvented

Status: research only, 2026-09-25. Nothing was changed, created or deleted on Cloudflare; no
model, AI Search query or test was run. Sources: the pinned `cloudflare` skill (it routes to
Cloudflare's docs, cited below), Wrangler 4.137.0 (`--help` and its bundled source), the
Cloudflare OpenAPI spec, and read-only GETs against the live account. **assumed** = not
confirmed in docs or on the account.

Owner, verbatim: "This is all virgin territory for me. Tell me what's what and research towards
having good tooling around this." "The way you test, confirm is probably a fucking reinvented mess
on this too. This thing costs money and I want this right." "It's critical this is solid and the
code is not reinventing things too."

## 1. What's what

**Workers AI** runs the models: the embedding model that turns text into vectors
(`@cf/qwen/qwen3-embedding-0.6b` for us) and the model that writes the answer
(`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, pinned in `src/ask.server.ts`). Billed per use.

**AI Search** is the managed search engine (open beta). It stores our text, cuts it into chunks,
embeds them, keeps a vector and keyword (BM25) index, and on a question finds the best chunks
and, if asked, has Workers AI write an answer from them.
[How it works](https://developers.cloudflare.com/ai-search/concepts/how-ai-search-works/)

| Term | Meaning |
|---|---|
| Namespace | A folder of instances. Every account has `default`; ours are in it. [Namespaces](https://developers.cloudflare.com/ai-search/concepts/namespaces/) |
| Instance | One search index with its settings (`remy-docs`, `remy-docs-dev`). |
| Item | One uploaded file, identified by its **key** (we upload one per `##` section). |
| Built-in storage | Files uploaded through the Items API. **Indexed right away, no sync jobs.** Uploading a key that already exists fails (409, `item_key_already_exist`), so replacing a file means delete, then upload. [Built-in storage](https://developers.cloudflare.com/ai-search/configuration/data-source/built-in-storage/), [error codes](https://developers.cloudflare.com/ai-search/troubleshooting/api-error-codes/) |
| R2 / website source | AI Search reads a bucket or crawls a site on a schedule (every 6 h by default, or on `wrangler ai-search jobs create`, at most every 30 s). New, changed and deleted files are handled by the sync. A website must be a domain onboarded to this account (remy-auth is on workers.dev). [Syncing](https://developers.cloudflare.com/ai-search/configuration/indexing/syncing/), [R2](https://developers.cloudflare.com/ai-search/configuration/data-source/r2/), [Website](https://developers.cloudflare.com/ai-search/configuration/data-source/website/) |
| Jobs | Indexing runs. Built-in uploads show up as "Builtin drain" jobs; `wrangler ai-search jobs list/logs` shows them. |
| Similarity cache | AI Search's own answer cache: a question worded like an earlier one gets the stored answer (free, about 0.2 s). Matching is by word overlap (MinHash), not meaning. It clears itself when the cited chunks change; `purge_cache` clears it all. TTL 48 h by default. [Similarity cache](https://developers.cloudflare.com/ai-search/configuration/retrieval/cache/) |
| `search()` / `wrangler ai-search search` | **Retrieval only**: returns ranked chunks with scores and metadata. No answer is written. |
| `chatCompletions()` | Retrieval **plus** generation: what `/app/ask` calls. |

**AI Gateway** is a proxy in front of model calls. It does not run models and does not search; it
records and controls the calls that pass through it: logs, analytics, caching, rate limits, spend
limits, retries, guardrails, DLP. Every AI Search instance is tied to one gateway, and AI Search's
model calls go through it ([AI Search and AI Gateway](https://developers.cloudflare.com/ai-search/configuration/models/ai-gateway/)).
So **AI Search is the thing that does the work; AI Gateway is the meter and the brake on its model
calls.** That is why it shapes the observability: the Worker's logs show what the visitor got, the
gateway shows what each model call cost, and AI Search's stats and jobs show how indexing went.

| Gateway feature | For us |
|---|---|
| Logs | One per model call: model, tokens, `cost`, time, cached, and AI Search's metadata (`ai-search: <instance>`, `task`). By default they **also store the request and response bodies, so visitors' questions are stored** (checked: the stored request bodies contain the user message). `cf-aig-collect-log-payload: false` switches that off per request, but the AI Search binding sends the request, not us. [Logging](https://developers.cloudflare.com/ai-gateway/observability/logging/) |
| Where logs live | Accounts whose first gateway dates from 2026-09-24 or later log into **Workers Observability** under Workers Logs pricing and retention ([limits](https://developers.cloudflare.com/ai-gateway/reference/limits/)). Ours is one: `GET /ai-gateway/logging-state` says `workers_observability`, and the Workers Logs dataset has keys like `gateway_id`, `response.cost_usd`, `response.cached`, `request.metadata.ai-search`. |
| Analytics | Dashboard, plus GraphQL `aiGatewayRequestsAdaptiveGroups`. [Analytics](https://developers.cloudflare.com/ai-gateway/observability/analytics/) |
| Caching | Must stay **off** for AI Search (it would reuse stale embeddings); use AI Search's cache instead. |
| Rate limiting | Must stay **off** for AI Search: it throttles AI Search's own indexing and queries. |
| Spend limits | Dollar budgets per window, returning 429 once spent. **They apply to Unified Billing and BYOK requests only**, and are "eventually consistent" (a burst can go over). [Spend limits](https://developers.cloudflare.com/ai-gateway/features/spend-limits/) |
| Billing mode (Workers AI) | `postpaid` (the default: Workers AI bills the account at the end of the cycle) or `unified` (prepaid credits, deducted in real time, 5% fee on credit purchases). [Manage gateway](https://developers.cloudflare.com/ai-gateway/configuration/manage-gateway/), [Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/) |
| Evaluations, datasets | **Deprecated, and not available to new accounts.** [Evaluations](https://developers.cloudflare.com/ai-gateway/evaluations/) |
| Guardrails | Content screening by a Workers AI model, paid per token. Not needed for docs Q&A. |
| DLP | Free: flags or blocks sensitive data in prompts and responses. Optional. |
| Authentication | Requires a Cloudflare token on each call. Recommended. Whether AI Search's internal calls pass an authenticated gateway is **assumed** yes; try it on a dev gateway first. |

**The `ai_search` binding** (`env.DOCS_SEARCH`) ties the Worker to one instance in `default`.
AI Search has no local simulator; `"remote": true` makes `wrangler dev` or `vite dev` proxy the
binding to the real instance ([Workers binding](https://developers.cloudflare.com/ai-search/api/search/workers-binding/)).
An `ai_search_namespaces` binding instead lets the Worker pick an instance at run time.

**How it fits in our app:** visitor → `/app/ask` (Worker: per-IP limit of 10 a minute, length
check) → `DOCS_SEARCH.chatCompletions` → AI Search: embed the question, hybrid search over
`remy-docs` (top 5, score ≥ 0.4), check the similarity cache → on a miss, Llama 3.3 70B through
gateway `remy-docs` (logged there) → answer plus chunks → our citations come from each chunk's
`url` and `title` metadata.

### Who charges what, per action

AI Search itself is free during the beta; storage, vectors and crawling are included; Workers AI
and AI Gateway are billed separately
([limits and pricing](https://developers.cloudflare.com/ai-search/platform/limits-pricing/)).
Workers AI: 10,000 neurons a day free on every plan, then $0.011 per 1,000 neurons
([pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)). The gateway's core
features are free; its logs are Workers Logs events (Paid: 20 M a month included, then $0.60 per
million, kept 7 days); Logpush costs $0.05 per million beyond 10 M
([gateway pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/),
[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)).

| Action | Who charges | Rate | Ours |
|---|---|---|---|
| Index the whole docs set (62 sections, ~140 KB) | Workers AI (embedding) | qwen3-embedding $0.012 / M tokens | ≈ $0.0005 per full reindex (**assumed** ~35 k tokens). These calls **do not appear in the gateway logs** (only chat completions do), so the gateway cannot show indexing cost. |
| Retrieval only (`search`) | Workers AI (one question embedding) | as above | ≈ $0.000001 per query: effectively free |
| Answer (`chatCompletions`, cache miss) | Workers AI (Llama 3.3 70B) | $0.293 / M in, $2.253 / M out | observed $0.00006 to $0.00073 (gateway `cost`); worst case with 5 chunks of 1024 tokens and `max_tokens` 300 ≈ $0.0023 |
| Answer, cache hit | none | $0 | observed $0, 0.2 s |
| Gateway, logs | Workers Logs | per event, over the included amount | one event per model call |

The free neurons cover roughly a few hundred answers a day. The real money risk is abuse: the
per-IP limit does not stop many addresses. At the worst case, a million uncached questions cost
about $2,300.

## 2. Each job: what exists upstream, what we built, verdict

### a. Uploading docs and re-indexing one page

| Upstream | Notes |
|---|---|
| Items REST API: upload, list (with `key=`, `status=`, `source=` filters), get, delete, download, chunks, item logs, sync one item; `wait_for_completion` on upload | No Wrangler command for items; the REST API (or a Worker binding's `items.uploadAndPoll`) is Cloudflare's own way. [Items REST API](https://developers.cloudflare.com/ai-search/api/items/rest-api/) |
| `PUT …/items` ("create or update") | Takes a key and `next_action: INDEX`, with no file: it re-indexes content already stored and cannot replace it (OpenAPI spec). |
| R2 source + `wrangler ai-search jobs create` | The sync would take over stale-item deletion, but needs a bucket, a service token and the async sync (≥ 30 s, job time), and `wrangler r2 object put` cannot set the custom metadata (`url`, `title`) that citations need. Not worth it. |
| Website source | Not possible while the site is on workers.dev; it would also lose our per-heading citation URLs. |
| Content hash | The API's `checksum` is `"0"` on every built-in item (live), so we must hash ourselves. |
| Fumadocs | Gives the structured text (`structuredData`, `toc`) that `docs-manifest.mjs` already uses, plus `llms.txt` and `.md` routes; its "Ask AI" backends are OpenRouter, LLMGateway or Inkeep, not AI Search ([Fumadocs LLMs](https://fumadocs.dev/docs/integrations/llms)). Nothing to replace here. |

**Verdict: keep** `docs-manifest.mjs` (it is Fumadocs' own data) and **keep but fix**
`docs-index.mjs` (the REST API is the upstream path):
1. Put a short content hash in the key (`<slug>--<id>--<hash8>.md`, under 128 characters).
   Unchanged sections are then skipped with no call at all; a changed section is uploaded under
   its new key **before** the old key is deleted, so production never lacks the section (today
   the item logs show a ~100 s delete-then-reupload gap).
2. Upload with `wait_for_completion`, then check `wrangler ai-search stats` (queued, running,
   error at 0) instead of assuming. One 30-minute "Builtin drain" today was a single file stuck
   "pending Vectorize ingestion confirmation" (job logs), not our script.
3. Refuse a production index from a dirty tree or anything but a tag, and store `release` as now.

### b. A fast, cheap dev and test loop

| Upstream | Cost | Verdict |
|---|---|---|
| A separate dev instance (`remy-docs-dev`) | free to hold | **keep** (Cloudflare's advice: separate instances per environment) |
| A namespace per environment (`remy-docs` with `prod`, `dev`, `<agent>`) | free | later, if agents need their own instances at once; not needed now |
| `wrangler ai-search search <instance> --query … --json` | ≈ $0 (no generation) | **add**: this is the fast loop for "does my edit get found" |
| `vite dev` with `remote: true` (our `docs:dev`) | per answer | **keep**, for the few times the full answer matters |
| `wrangler dev` Local Explorer | – | no help: AI Search "will never have a local simulator" (Wrangler source) |

`docs-dev.mjs create` copies production's settings through REST because `wrangler ai-search
create` has no gateway flag and, in 4.137, insists on an AI Search service token even for
built-in storage (its source calls `listTokens` first); the docs say that token is only for R2.
**Verdict:** keep `create` (about 15 lines, no upstream equivalent); replace `delete` with
`wrangler ai-search delete remy-docs-dev -y`. Turning the dev cache off is not needed, since the
cache clears when cited chunks change; drop that rationale.

### c. Testing and confirming answer quality

AI Gateway Evaluations and datasets are deprecated and closed to new accounts, so there is
nothing upstream to adopt. The right split:

| Layer | How | Cost |
|---|---|---|
| Retrieval (most of the quality) | A fixed file of questions, each with the section URL(s) it must find in the top k, run through `wrangler ai-search search --json` (or REST `/search`) against the dev instance, and against production after an index | ≈ $0, seconds |
| Metadata | Assert every item's `title` and `url` are sane after each index (list items: free) | $0 |
| Generation | Keep the one Playwright answer check on a deployed target (citations open real headings) | one call, usually cached |
| Human review | Read the gateway logs (the questions are there while payloads are kept) | $0 |

**Verdict:** keep the Playwright check but stop treating it as the quality gate. It hits
production's cached index and never looked at titles, so it passed while every production
citation title reads "undefined: …" (section 3). Add the retrieval set as a mise task.

### d. Observability

| Upstream | What it gives | Ours |
|---|---|---|
| Workers Logs query API (`/workers/observability/telemetry/query`) | our Worker's events **and now the gateway's per-call events** (cost, tokens, cached, instance), aggregated on the server | `cf:events` already uses it |
| AI Gateway `/logs` REST | the same calls, plus stored bodies | `cf:ai-usage` pages through it and sums on the client |
| GraphQL `aiGatewayRequestsAdaptiveGroups` | aggregates | unused |
| `wrangler ai-search stats`, `jobs list`, `jobs logs` | indexing health | `cf:ai-check` uses `stats` |
| Workers Observability alerts, billing budget alerts | alerting (budget alerts are daily and informational) | two Workers alerts; $10 budget alert |
| Gateway Logpush | long-term copies | off; not needed |

**Verdict:** keep `cf:events`; rewrite `cf:ai-usage` as one Workers Logs query (`gateway_id` =
the instance's gateway, sum `response.cost_usd`, grouped by day, `request.metadata.ai-search` and
`response.cached`). That drops the paging and client-side summing, and the same token serves
both tasks. Add a `docs:status` task that wraps `wrangler ai-search stats` and `jobs list`.
**Keep `cf:ai-check`**: nothing upstream asserts gateway settings (Terraform or Pulumi could hold
them as code; whether their Cloudflare providers cover AI Search and gateways is **assumed**).
Remove its `log_management`-style legacy assumptions; retention is now Workers Logs' 7 days.

### e. Cost control that actually stops spending

- **Confirmed:** gateway spend limits cover Unified Billing and BYOK only. Our gateway is
  `postpaid`, so the `monthly-10-usd` rule does not stop Workers AI spend. The account-level
  Unified Billing limit (`/ai-gateway/billing/spending-limit`) is disabled and the credit balance
  is $0.
- **A real cap:** buy credits, set the gateway's Workers AI billing to `unified`, keep the spend
  rule. Credits run out, so requests fail (5% fee; "in rare instances" the balance can go
  negative). Embedding calls that bypass the gateway would stay postpaid; that is negligible and
  **assumed**. **Owner decision (money).**
- **Kill switch, in order of speed:**
  1. Set the gateway's rate limit to a tiny number: it stops AI Search's model calls at once,
     indexing included (that is exactly why it must normally be off). No deploy needed.
  2. A flag the Worker reads before calling AI Search (Cloudflare Flagship, in the pinned skill,
     or a var redeployed with `wrangler versions deploy`), so the page says "answers off".
  3. `wrangler ai-search update --paused` is **not** a kill switch: it pauses indexing, and search
     keeps working (**assumed** from the syncing docs).
- Keep the per-IP limit and the similarity cache. Consider a global limit key as well
  (for example `key: "all"` at N a minute) to bound the worst case in dollars.

### f. Deleting each docs-related thing

| Thing | How | Permission | Script it? |
|---|---|---|---|
| Dev instance `remy-docs-dev` (and its items) | `wrangler ai-search delete remy-docs-dev -y` | AI Search Edit (Wrangler OAuth `ai-search:write`) | yes |
| Items in an instance | REST `DELETE …/items/{id}` (no Wrangler command) | AI Search Edit | yes, dev only; in production only through `docs:index` |
| Similarity cache | REST `POST …/purge_cache` | AI Search Edit | yes |
| Production instance `remy-docs` | `wrangler ai-search delete remy-docs` | AI Search Edit | **never**: answers go dark |
| Namespace | `wrangler ai-search namespace delete` (`default` cannot be deleted, **assumed**) | AI Search Edit | only for our own namespaces |
| Gateway logs | REST `DELETE /ai-gateway/gateways/{id}/logs` with filters (up to 10,000). Under Workers Observability they also expire after 7 days; whether the delete reaches those copies is **assumed** | AI Gateway Edit | yes, e.g. "delete stored questions" |
| Gateway `remy-docs` | REST `DELETE /ai-gateway/gateways/{id}` (no Wrangler command); permanent | AI Gateway Edit | **never**: both instances point at it |
| Gateway `default` | same | AI Gateway Edit | owner decides; apparently created automatically at 07:50, unused |
| Rate-limit "namespace" `4281` | nothing to delete: it is an ID we chose in `wrangler.jsonc` | – | – |
| Previews | `wrangler preview delete --name <name>` | Workers Scripts Edit | yes |
| AI Search service tokens | REST `DELETE /ai-search/tokens/{id}` | AI Search Edit | none exist |

### g. Credentials

| Operation | Wrangler login (OAuth) | API token permission |
|---|---|---|
| Instances, jobs, stats, items, purge | yes (`ai-search:write`) | AI Search Edit |
| Search and chat over REST or `wrangler ai-search search` | yes (`ai-search:run`) | AI Search Run ([Items REST API](https://developers.cloudflare.com/ai-search/api/items/rest-api/) asks for Edit + Run) |
| Gateway settings and logs | **no**: `wrangler login --scopes-list` has no AI Gateway scope | AI Gateway Read (Edit to change or delete) |
| Workers Logs query (includes gateway events now) | **no** | Workers Observability (the existing code says only Write is accepted: **not re-verified**) |
| Unified Billing and credits | no | Billing (**assumed**) |
| Service token for AI Search | not needed: only an R2 source needs one ([service token](https://developers.cloudflare.com/ai-search/configuration/indexing/service-api-token/)). Wrangler 4.137 asks for one on `create` anyway; don't create one for us. |

Two tokens are enough: Wrangler's login for AI Search, and one API token in `mise.local.toml`
with AI Gateway Read + Workers Observability for reading. AI Gateway Edit belongs in a separate,
rarely used token (it can delete the gateway). AI Gateway permissions cannot be limited to one
gateway ([authentication](https://developers.cloudflare.com/ai-gateway/configuration/authentication/)).

## 3. Mistakes and risks in the current setup (live, 2026-09-25)

1. **Every production citation title is broken.** All 62 items in `remy-docs` have titles like
   `undefined: Language: Paraglide owns it`, and `/app/ask` shows these titles to visitors. The dev
   instance's titles are right, so the fix is in the uncommitted `docs-manifest.mjs`; production
   has not been re-indexed with it. No check caught it.
2. **Production was indexed from a dirty working tree, and in parts.** It mixes 47 items from
   `v0.10.5-13-ge015c0e` with 15 from `v0.10.5-18-gf7be509-dirty` (how-we-work, development and
   index only), although the task says production is only ever indexed whole.
3. **The $10 spend limit does nothing** (postpaid Workers AI, confirmed above).
4. **Gateway rate limit of 60 a minute** against Cloudflare's explicit advice. It throttles
   indexing and answers.
5. **Visitors' questions are stored** in the gateway logs (bodies confirmed), while the code
   comment says "the question is never logged". The binding cannot set the per-request payload
   header, and the gateway API has no payload-only switch (**assumed** from the spec's fields), so
   the choice is all logs (7-day retention) or no gateway logs. Decide and say so on the page.
6. Gateway authentication is off.
7. Delete-then-upload leaves a section missing from production for about 100 s per section while
   re-indexing.
8. The dev instance shares production's gateway, justified by a spend limit that does not apply.
   It is fine for logs (the `ai-search` metadata tells them apart), but settings such as
   authentication cannot be tried on dev first. Consider a `remy-docs-dev` gateway.
9. Indexing cost is invisible: embedding calls are not in the gateway logs.
10. The `docs` environment in `wrangler.jsonc` could be deployed by mistake
    (`CLOUDFLARE_ENV=docs wrangler deploy` would create a `remy-auth-docs` Worker). Guard it in the
    deploy task.
11. `remy-docs-dev` exists now (one item still `running`); delete it when done.
12. A `default` gateway exists unused.

## 4. Recommended tooling (mise tasks → upstream)

| Task | Upstream it wraps | Replaces |
|---|---|---|
| `docs:manifest` | Fumadocs structured data (unchanged) | – |
| `docs:index [--instance dev] [pages]` | Items REST API: content-hash keys, upload first, `wait_for_completion`, delete stale; production only from a clean tag | today's delete-then-upload loop |
| `docs:search -- "<q>" [--instance]` | `wrangler ai-search search --json` | – (new, ≈ free) |
| `docs:eval [--instance]` | the same search over a checked-in question → expected-URL file, plus item metadata sanity | the Playwright answer check as the quality gate (Playwright keeps one smoke check) |
| `docs:status` | `wrangler ai-search stats`, `jobs list`, `jobs logs` | – |
| `docs:dev:create` | REST create copying production (Wrangler cannot set the gateway) | keep |
| `docs:dev:delete` | `wrangler ai-search delete remy-docs-dev -y` | the delete branch of `docs-dev.mjs` |
| `docs:cache:purge [--instance]` | REST `purge_cache` | – |
| `docs:dev` | `vite dev` + `remote: true` (unchanged) | – |
| `cf:ai-usage` | one Workers Logs telemetry query on gateway events | paging `/logs` and summing locally |
| `cf:ai-check` | gateway GET + `wrangler ai-search stats` | keep; drop legacy-log assumptions |
| `cf:ai-logs:delete` (owner-run) | REST `DELETE …/logs` | – |
| `cf:preview:delete` | `wrangler preview delete` | – (from docs-site-review item 3) |
| kill switch: `docs:answers:off/on` | gateway rate limit to a tiny number and back (REST PUT, AI Gateway Edit), or a Flagship flag | – |

Deleted from our code: the delete branch of `scripts/docs-dev.mjs`, the log paging and summing in
`tasks/cf/observe.mjs`, and the "cache off so a reindexed page answers at once" rationale. Kept,
because nothing upstream does it: `docs-manifest.mjs`, the item upload in `docs-index.mjs`,
`docs-dev.mjs create`, `cf:ai-check`.

**Owner decisions:** Unified Billing with prepaid credits (the only real cap); keep or drop
stored questions; remove the gateway rate limit; turn on gateway authentication; delete the
`default` gateway.
