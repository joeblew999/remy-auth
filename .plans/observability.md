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
query string, to anyone with account access, so never put secrets in URLs. Still open: readiness with
dependency checks, saved views, alerts (destination is the owner's call), automated canary
checks against spans and live tail, and sampling, retention and cost records.

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
