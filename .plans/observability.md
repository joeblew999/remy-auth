# Cloudflare observability (generic)

Status: open, 2026-09-24. Generic: applies to every Worker built on the shared package and
tasks (remy-auth now, remy-auth-app and later apps). The auth-specific signals, audit
records and alerts moved to [the auth plan](auth-service.md#observability-for-the-auth-service).
Done 2026-09-24, in both apps: `@joeblew999/remy-ui/worker` (0.8.0) wraps each Worker with
`X-Request-ID` on every response, one structured line per request following the log contract
below (release from the version-metadata binding, route templates, never URLs or headers),
and `/healthz`; the collection baseline is in both `wrangler.jsonc` files (remy-auth-app now
runs a thin Worker in front of its assets); `observabilityChecks` covers request IDs and
liveness in level 1; the shared `cf:logs` and `cf:errors` tasks read both. A secret canary in
a query string was verified absent from our log lines and from the persisted Workers Logs; live
`wrangler tail` still shows Cloudflare's own request metadata with the full URL, including the
query string, to anyone with account access, so never put secrets in URLs. Done 2026-09-25:
both notification policies exist (real-time issues, and alert rules firing and recovered), each
emailing the account address; the 5xx and latency rules, saved views and an exercised recovery
notice are still open. Decisions for the rest are below.

## Collection baseline

Use Cloudflare-native tooling for every Worker built on the shared package and tasks.
remy-auth's `wrangler.jsonc` explicitly enables persisted logs, invocation logs and traces,
with query-string redaction. Collection is set to 100% initially so local-to-staging
verification has complete eligible-request coverage. Platform limits still apply.
Record production volume/cost estimates and any sampling change before rollout.
Traces require explicit enablement; enabling logs alone is insufficient.
Sources: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/),
[traces](https://developers.cloudflare.com/workers/observability/traces/),
and the pinned Wrangler 4.137.0 configuration schema.

Cloudflare currently documents telemetry retention of 3 days on Free and 7 days
on Paid. Verify plan limits at deployment. Retention is not an audit-retention
policy. Long-term exports, if required, should remain in Cloudflare R2 with a
defined lifecycle and access policy; select and verify the export mechanism then.

## Decisions (2026-09-24, delegated by the owner)

| Item | Decision | Why |
| --- | --- | --- |
| Alert delivery | Email to the Cloudflare account address | Every existing account alert already goes there |
| Real-time issues | Native policy "Remy Workers: real-time issues" created (id `d7ee777542904364914da603524f1c5e`, type `workers_observability_real_time_issue`, no filters, email to the account address) | Cloudflare detects Worker issues itself; no code |
| Rule delivery, firing and recovery | Policy "Remy Workers: alert rules firing and recovered" created 2026-09-25 (id `26fa5f3e73e243a2bc2bfbf95809254a`, type `workers_observability_alert`, filter `status` = `FIRING_FAILED`, `NORMAL`, email to the account address) | Needed before any rule below can email; no rule exists yet, so it has not fired |
| 5xx and latency rules | Defined in Workers Observability once there is real traffic | The plan's thresholds need traffic to calibrate |
| Availability alerts | Deferred until a production domain exists | Cloudflare Health Checks need a zone; workers.dev has none |
| Capacity and cost | Covered by the existing $10 budget alerts | Already in place |
| Readiness | Same as liveness until an app has dependencies; the auth slice adds its D1 check | Nothing to check yet |
| Saved views | Created with the 5xx and latency rules | Empty views are no use |
| Sampling and retention | 100% sampling kept; retention per Cloudflare plan | Traffic is tiny; revisit at production volume |

## Required signals

| Area | Signals and implementation |
| --- | --- |
| Worker health | Requests, HTTP status, exceptions, CPU/wall duration, resource-limit failures and release version |
| Request tracing | Request spans and supported outbound spans, explicit business-operation spans where supported |
| Release health | Correlate errors with deployment/version; verify monitoring after rollout and rollback |
| Availability | Liveness, readiness with each app's own dependency checks, and scheduled synthetic checks of its critical pages |

Use [Worker metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)
for platform signals. Custom outcomes need application instrumentation. Prefer structured
logs and Query Builder first; introduce Analytics Engine only if aggregation requires it.
Sampled event counts are not exact totals.

## Logging and correlation contract

Emit structured JSON with `schemaVersion`, `service`, `environment`, `release`,
`event`, `level`, `requestId`, `route`, `method`, `status`, `durationMs`, `outcome`
and a bounded `reasonCode`. Use route templates, not raw URLs or dynamic paths.
Generate request IDs server-side, return them in `X-Request-ID`, and include them
in CLI failure messages. Preserve platform trace/Ray identifiers where available.
Only propagate validated correlation metadata to trusted services; correlation IDs
never authorize a request.
Verify [trace limitations](https://developers.cloudflare.com/workers/observability/traces/known-limitations/)
against the deployed runtime and the actual HTTP/service-binding topology.

Allowlist log fields. Never record passwords, cookies, Authorization headers,
OAuth codes/state, access/refresh tokens, API keys, request/response bodies or full
callback URLs. Default to omitting email, IP and user-agent from operational logs.
Keep necessary actor/tenant identifiers in restricted audit storage; avoid them as
metric dimensions. Map errors to bounded codes and sanitized details rather than
dumping arbitrary exception objects. Apply the same rules to every library logger.

Platform URL redaction does not sanitize application console messages or custom
span attributes. Test automatic spans, exceptions and live tail separately with
secret canaries. If an automatic field leaks sensitive data, change collection or
instrumentation before production. No debug capture of real credentials.

## Dashboards and alerts

Save views in Cloudflare [Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/):
service health by environment and release, and a request-ID investigation view.

Initial proposed alert rules, to calibrate with real traffic:

| Rule | Trigger | Response |
| --- | --- | --- |
| Availability | Three consecutive one-minute readiness failures | Check the Worker deployment, its dependencies and Cloudflare status |
| Server failures | >1% HTTP 5xx over 5 minutes, at least 100 requests | Inspect release, routes and dependency failures |
| Latency | p95 >1 second over 10 minutes, at least 100 requests | Separate dependency time from Worker time |
| Capacity/cost | 80% of an agreed usage/budget threshold | Review storage and telemetry volume and capacity before exhaustion |

Do not assume Cloudflare Notifications supports arbitrary log-query thresholds. Check the
account's [available notification types](https://developers.cloudflare.com/notifications/notification-available/)
and plan entitlements; where native rules fall short, a small scheduled monitoring Worker
with persisted deduplication and cooldown state. Delivery destinations are the owner's call
and still unset. Cloudflare-hosted probes share a failure domain with the service.

## CLI workflow

```sh
mise run cf:logs -- --help
mise run cf:errors -- --help
# After deployment, with an authenticated Cloudflare account:
mise run cf:logs -- remy-auth
mise run cf:errors
```

The errors task uses the Worker name from `wrangler.jsonc`; select an environment
with `-- --env <environment>` once environments are configured. It filters
invocation failures, not every handled HTTP 500 or expected
401/403. Use full tail or persisted queries for those. Tail is live debugging, not
a historical query or audit archive. Local logs will come from `wrangler dev`
when the Worker exists; Cloudflare dashboards need deployed traffic.

## Shared, not copied

Everything here should reach apps the way the UI and tasks do: request logging and the log
contract as a Worker wrapper in the package, the collection baseline and version metadata in
each app's `wrangler.jsonc`, the checks (secret canaries absent from logs, request ID on every
response, liveness answering) in `@joeblew999/remy-ui/checks`, and the CLI tasks in `tasks/`.

## Acceptance

- Every deployed Worker has the collection baseline, returns `X-Request-ID`, logs the contract
  fields with its release version, and answers liveness.
- Secret canaries are absent from logs, exceptions and spans.
- Saved views and alerts exist in the account, with a destination the owner chose, and a
  recovery notice is exercised once.
- Sampling, retention, projected costs and monitoring ownership are recorded.

## AI answers (docs site): what Cloudflare gives, what we have (checked 2026-09-25)

Sources: the pinned `cloudflare` skill (`references/ai-gateway`, `ai-search`, `observability`),
which routes to Cloudflare's docs ([AI Search and its gateway](https://developers.cloudflare.com/ai-search/configuration/models/ai-gateway/),
[spend limits](https://developers.cloudflare.com/ai-gateway/features/spend-limits/),
[logging](https://developers.cloudflare.com/ai-gateway/observability/logging/),
[analytics](https://developers.cloudflare.com/ai-gateway/observability/analytics/),
[custom metadata](https://developers.cloudflare.com/ai-gateway/observability/custom-metadata/)),
and the live account read through the Cloudflare API MCP (gateway, instance, logs, alert types).

**Every model call AI Search makes runs through its AI Gateway (`remy-docs`).** That gateway is the
place to observe the AI part:
- **Logs, per call** (on, live): model, tokens in and out, cost, duration, cached or not, status,
  user agent, and AI Search's own metadata (`ai-search`, `task`, `origin`). 11 calls so far; an
  answer costs about $0.0002 to $0.0006 and takes 2.4 to 4.2 s, a cached one 0.2 s and $0.
- **Analytics** (dashboard and GraphQL): requests, tokens, cost, errors, cache rate over time.
- **User Insights** (dashboard): spend and unusual-usage flags, per user when metadata names one.
- **Logpush** of gateway logs (off). **Custom metadata**: up to 5 entries per call; whether the AI
  Search binding passes ours through is **not verified**.
- **AI Search Metrics tab**: indexing health, searches, most retrieved sections.
- **Alerts**: no AI Gateway alert type exists. Available: Workers Observability alert policies
  (we have two), billing budget and billing usage alerts (the $10 budget alert exists; whether a
  usage alert can target Workers AI alone is **not verified**).

**Problems found in the live setup:**
1. **The $10 spend limit very likely does not stop anything.** Spend limits apply to Unified
   Billing (prepaid credits) and bring-your-own-key calls; the gateway's Workers AI billing is
   `postpaid`. A real cap means Unified Billing with prepaid credits (**owner: money**).
2. **The gateway has a rate limit (60 a minute), which Cloudflare says not to set** on a gateway
   connected to AI Search: it also throttles AI Search's own calls, including indexing. A likely
   cause of the first `docs:index` run failing part way. Remove it; our own limit (10 a minute per
   visitor, in the Worker) stays. Gateway caching is off, as Cloudflare advises; AI Search's own
   cache (48 h) is on.
3. **Visitors' questions are stored.** Gateway logs keep request and response bodies by default,
   so questions and answers are kept, while our code says "the question is never logged". Decide:
   turn off payload storage (metadata only), or keep them for quality review and say so.
4. **The gateway is unauthenticated**; Cloudflare recommends authentication to stop others adding
   calls and log volume.
5. **Our own logs say almost nothing**: only `ask_failed`, with the error name "Error".

**Proper observability for the answers, proposed:**
- One `ask` event per question in Workers Logs: outcome (answered, no-answer, rate-limited,
  too-long, failed), AI call duration, citation count, cache hit, gateway log ID, locale, release,
  request ID; the error's message on failure. Never the question.
- A Workers Observability alert on `ask` failures and on answer time, beside the existing two.
- Gateway spend and errors read through GraphQL by a mise task (`cf:ai-usage`), so agents and the
  owner see cost and errors per day without the dashboard; later a check against a daily budget.
- A remote check that the gateway settings stay as decided (no gateway rate limit, no gateway
  cache, payload storage as decided, spend rule present).
