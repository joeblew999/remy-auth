# Remy Auth

Shared authentication for Remy apps, using **Better Auth on Cloudflare Workers**, and the shared UI
package `@joeblew999/remy-ui` its apps are built on.

**Live: https://remy-auth-docs.gedw99.workers.dev**, the one page linking everything:

| What | Where |
| --- | --- |
| The app | https://remy-auth.gedw99.workers.dev |
| Guide (for people using the app) | https://remy-auth-docs.gedw99.workers.dev/docs |
| Developer docs | https://remy-auth-docs.gedw99.workers.dev/dev |
| API reference | https://remy-auth-docs.gedw99.workers.dev/reference |
| Docs for AI tools (MCP, llms.txt) | https://remy-auth-docs.gedw99.workers.dev/dev/ai-tools |

The docs' source is [docs/content](docs/content/) (`users/` for the guide, `dev/` for developers), served by
the docs Worker in [docs/](docs/). Agents start at [AGENTS.md](AGENTS.md); open work is in
[.plans/now.md](.plans/now.md); releases in [CHANGELOG.md](CHANGELOG.md).
