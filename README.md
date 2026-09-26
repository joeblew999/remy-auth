# Remy Auth

Shared authentication for Remy apps, using **Better Auth on Cloudflare Workers**, and the shared UI
package `@joeblew999/remy-ui` its apps are built on.

**Live: https://remy-auth-docs.gedw99.workers.dev**, the one page linking everything:

| What | For | Where | MCP server | llms |
| --- | --- | --- | --- | --- |
| The app | everyone | https://remy-auth.gedw99.workers.dev | | |
| Product guide | people using the app | https://remy-auth-docs.gedw99.workers.dev/docs | https://remy-auth-docs.gedw99.workers.dev/api/mcp/docs | https://remy-auth-docs.gedw99.workers.dev/docs/llms.txt |
| Developer docs | developers | https://remy-auth-docs.gedw99.workers.dev/dev | https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev | https://remy-auth-docs.gedw99.workers.dev/dev/llms.txt |
| API reference | developers calling the API | https://remy-auth-docs.gedw99.workers.dev/reference | https://remy-auth-docs.gedw99.workers.dev/api/mcp/reference | https://remy-auth-docs.gedw99.workers.dev/reference/llms.txt |

All of it for AI tools: https://remy-auth-docs.gedw99.workers.dev/llms.txt; how to add the MCP servers (ChatGPT, Claude, Cursor, VS Code,
Gemini CLI): https://remy-auth-docs.gedw99.workers.dev/dev/ai-tools.

The docs' source is [docs/content](docs/content/) (`users/` for the product guide, `dev/` for developers), served by
the docs Worker in [docs/](docs/). Agents start at [AGENTS.md](AGENTS.md); open work is in
[.plans/now.md](.plans/now.md); releases in [CHANGELOG.md](CHANGELOG.md).
