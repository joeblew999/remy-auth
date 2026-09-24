# Cloudflare observability

Status: required service capability, 2026-09-24. Wrangler collection configuration
and tail CLI tasks exist. No Worker, instrumentation, audit store, dashboards or
alerts have been deployed. This is not a completed observability implementation.

## Collection baseline

Use Cloudflare-native tooling for auth and every consumer Worker. The root
`wrangler.jsonc` explicitly enables persisted logs, invocation logs and traces,
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
| Request tracing | Auth and sample request spans, supported D1/outbound spans, explicit business-operation spans where supported |
| Auth behavior | Login success/failure counts, verification/recovery outcomes, token issuance/refresh/revocation and rate-limit denials |
| Authorization | Bounded reason codes for scope, audience, membership and permission denial; HTTP/MCP parity |
| D1 | Query errors/latency, read/write volume, database size, query efficiency and migration failures |
| Dependencies | Email/provider failures and timeouts, JWKS/discovery failures, audit persistence failures |
| Release health | Correlate errors with deployment/version; verify monitoring after rollout and rollback |
| Availability | Liveness, readiness including a minimal D1 check, and scheduled synthetic auth checks with disposable identities |

Use [Worker metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)
and [D1 metrics](https://developers.cloudflare.com/d1/observability/metrics-analytics/)
for platform signals. Custom outcomes need application instrumentation. Prefer
structured logs and Query Builder first; introduce Analytics Engine only if metric
aggregation requirements justify it. Sampled event counts are not exact totals.

## Logging and correlation contract

Emit structured JSON with `schemaVersion`, `service`, `environment`, `release`,
`event`, `level`, `requestId`, `route`, `method`, `status`, `durationMs`, `outcome`
and a bounded `reasonCode`. Use route templates, not raw URLs or dynamic paths.
Generate request IDs server-side, return them in `X-Request-ID`, and include them
in CLI failure messages. Preserve platform trace/Ray identifiers where available.
Only propagate validated correlation metadata to trusted services; correlation IDs
never authorize a request. Browser redirect legs need a non-secret flow identifier
if they cannot share a trace. Do not promise a single trace across every OAuth hop.
Verify [trace limitations](https://developers.cloudflare.com/workers/observability/traces/known-limitations/)
against the deployed runtime and the actual HTTP/service-binding topology.

Allowlist log fields. Never record passwords, cookies, Authorization headers,
OAuth codes/state, access/refresh tokens, API keys, request/response bodies or full
callback URLs. Default to omitting email, IP and user-agent from operational logs.
Keep necessary actor/tenant identifiers in restricted audit storage; avoid them as
metric dimensions. Map errors to bounded codes and sanitized details rather than
dumping arbitrary exception objects. Apply the same rules to Better Auth's logger.

Platform URL redaction does not sanitize application console messages or custom
span attributes. Test automatic spans, exceptions and live tail separately with
secret canaries. If an automatic field leaks sensitive data, change collection or
instrumentation before production. No debug capture of real credentials.

## Durable security audit

Record administrator actions, user lifecycle changes, membership/role changes,
client registrations/grants, credential rotation, consent and revocation. Audit
records contain event ID, timestamp, actor type/ID, target, organization, action,
result, request ID and sanitized change metadata. Cover both API and CLI actions.

Implement application-owned audit tables in D1 with restricted query access and
an explicit retention policy. Do not rely on sampled console logs, `wrangler tail`
or the optional Better Auth hosted dashboard for completeness. Cloudflare account
audit logs cover platform administration, not all Remy end-user actions.

Choose hooks against the installed Better Auth version. A background console log
is not durable delivery. Define a D1-compatible atomic batch/outbox or reconciled
delivery mechanism before claiming atomic mutation/audit coverage; do not assume
Better Auth hooks provide interactive transactions on D1. Define failure behavior
for critical privilege mutations and test crash/retry/deduplication. Never mark a
failed or merely attempted action as successfully completed in the audit record.

## Dashboards and alerts

Save views in Cloudflare [Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/):
service health by environment/release; login outcomes and 429s; HTTP/MCP denials;
D1/dependency failures; and a request-ID investigation view. Review operator access
and prevent cross-environment ambiguity. These views still need creation.

Initial proposed alert rules, to calibrate with real traffic:

| Rule | Trigger | Response |
| --- | --- | --- |
| Availability | Three consecutive one-minute readiness failures | Check Worker deployment, D1 and Cloudflare status |
| Server failures | >1% HTTP 5xx over 5 minutes, at least 100 requests | Inspect release, routes and dependency failures |
| Latency | p95 >1 second over 10 minutes, at least 100 requests | Separate hashing/provider time from D1 and Worker time |
| Audit durability | Any unrecovered critical audit-write failure | Investigate affected privileged mutations immediately |
| Abuse | Sustained login failures/429s above baseline | Inspect aggregate patterns; do not treat ordinary 401s as outages |
| Capacity/cost | 80% of an agreed usage/budget threshold | Review D1/telemetry volume and capacity before exhaustion |

Do not assume Cloudflare Notifications supports arbitrary log-query thresholds.
Check the account's [available notification types](https://developers.cloudflare.com/notifications/notification-available/)
and plan entitlements. Where native rules do not cover these conditions, implement
a small scheduled monitoring Worker querying supported metrics APIs, with persisted
deduplication/cooldown/recovery state and an explicitly selected delivery destination.
Record monitor credentials/scopes and retry behavior. Delivery destinations and
account-side policies are still unset; do not send messages during local setup.
Cloudflare-hosted probes share a failure domain with the service: platform-wide
outages require an independently hosted probe if that coverage becomes required.

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

## Acceptance before production

- Implement instrumentation and audit migrations with the first auth/sample flows.
- Verify success, expected denial, unexpected failure, slow dependency and D1 failure
  locally; distinguish HTTP errors from Worker execution failures.
- Assert secret canaries are absent from logger output, exceptions and spans.
- Verify request correlation across browser, CLI, HTTP and MCP operations.
- Test audit completeness, persistence failure, retry deduplication and access control.
- In staging, confirm persisted logs/traces, D1/platform metrics and saved views;
  retain exact queries and release IDs in the runbook.
- Exercise alerts and recovery delivery with the selected destination; verify the
  monitor detects missing data as well as threshold breaches.
- Record sampling, retention, projected costs, monitoring ownership and rollback
  steps. Observability is complete only when these checks pass against the service.
