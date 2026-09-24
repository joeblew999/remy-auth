# Scaffold verification — 2026-09-24

This records observed results for the current local scaffold, not production readiness.

| Check | Observed result |
| --- | --- |
| `mise run project:verify` | Exit 0 |
| Mise task validation | All 34 tasks valid |
| Skill installation and Claude links | 28 pinned skills verified |
| MCP configuration | Codex and Claude registrations verified; this is configuration validation, not a live MCP connection test |
| Type generation and TypeScript | Passed |
| Production Worker and browser build | Passed |
| Wrangler deployment dry run | Passed using generated `build/server/wrangler.json`; no upload |
| Production-build browser suite | 7 passed in 7.0 seconds |
| Shared UI tarball | Installed and built successfully in an isolated temporary consumer |
| Local observability | Queried captured `remy-auth` request spans with `ok` outcomes and structured `http_request` logs containing request ID, HTTP status and duration |
| Cloudflare authentication | Failed: existing auth token expired and could not be refreshed |
| Remote deployment, browser tests and hosted observability | Not yet verified; require renewed login and selection of the target account |

The browser suite covers EN/ES HTML without JavaScript, metadata and alternate
links, locale isolation across concurrent requests, interactive client rendering,
same-tab language navigation, redirects/404s/sitemap and narrow-screen layout.
The existing-server test path also passed all seven checks against a separately
running local production preview during scaffold implementation. That result is
not evidence of execution on Cloudflare's deployed network.

Full verification output on this machine: `/tmp/remy-proof-verify.log`.
The log is temporary; rerun `mise run project:verify` to reproduce the checks.
Authentication, D1, cross-app SSO, hosted alerting and Google indexing are not
implemented or proven by these results. See [the runtime workflow](gui.md).
