---
title: "Docs in your AI tools"
description: "Every MCP server and llms.txt here, who each is for, how to add them to ChatGPT, Claude, Cursor, VS Code or Gemini, and how Google's AI Mode sees the docs."
---

The docs have three parts, each for one audience, and each part has its own MCP server and llms files.
Add only the one you need: the product guide knows nothing about the code, the developer docs nothing
about the API's parameters.

| Part | For | MCP server (Streamable HTTP) | llms |
| --- | --- | --- | --- |
| [Product guide](/docs) | people using the app | `https://remy-auth-docs.gedw99.workers.dev/api/mcp/docs` (`remy-product-guide`) | [llms.txt](https://remy-auth-docs.gedw99.workers.dev/docs/llms.txt), [full](https://remy-auth-docs.gedw99.workers.dev/docs/llms-full.txt) |
| [Developer docs](/dev) | developers building Remy or an app on it | `https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev` (`remy-developer-docs`) | [llms.txt](https://remy-auth-docs.gedw99.workers.dev/dev/llms.txt), [full](https://remy-auth-docs.gedw99.workers.dev/dev/llms-full.txt) |
| [API reference](/reference) | developers calling the API | `https://remy-auth-docs.gedw99.workers.dev/api/mcp/reference` (`remy-api-reference`) | [llms.txt](https://remy-auth-docs.gedw99.workers.dev/reference/llms.txt), [full](https://remy-auth-docs.gedw99.workers.dev/reference/llms-full.txt) |

[`/llms.txt`](https://remy-auth-docs.gedw99.workers.dev/llms.txt) lists all three. No sign-in: they are public and read-only.

## The tools

Every server has the same four, all read-only:

- `search` and `fetch`: the pair ChatGPT needs for chat, deep research and company knowledge
  ([OpenAI's schema](https://developers.openai.com/api/docs/mcp)). `search` returns
  `{results: [{id, title, url}]}`; `fetch(id)` returns `{id, title, text, url}`, the page as Markdown.
- `list_pages` and `get_page`: Fumadocs' own (`fumadocs-core/mcp`).

Each server's instructions say who it is for, so an assistant with all three picks the right one.

## Adding one

| Tool | How |
| --- | --- |
| ChatGPT | Settings → Security and login → Developer mode on; then Plugins → **+** → paste the URL. |
| Claude (web, desktop) | Settings → Connectors → Add custom connector → paste the URL. |
| Claude Code | `claude mcp add --transport http remy-developer-docs https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev` |
| Cursor | `.cursor/mcp.json`: `{"mcpServers": {"remy-developer-docs": {"url": "https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev"}}}` |
| VS Code | `.vscode/mcp.json`: `{"servers": {"remy-developer-docs": {"type": "http", "url": "https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev"}}}` |

Swap in another row's URL and name for the product guide or the API reference.
`mise run docs:test:remote` lists every server's tools.

## Gemini and Google

Google's AI answers do not use MCP servers or llms.txt: Google says so
([Search Central](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)).

| Where | How it sees these docs |
| --- | --- |
| Google AI Mode, AI Overviews | Google's search index: the HTML pages (`/sitemap.xml`), their titles, descriptions and text. A page must be indexed with a snippet, and the site included in "Search generative AI features" in Search Console. |
| The Gemini app | The same Google Search grounding; it takes no MCP server of ours. |
| Gemini CLI | An MCP server: `gemini mcp add --transport http remy-developer-docs https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev` |
| Gemini API (managed agents) | An MCP server: an `mcp_server` tool with the URL. |
| Gemini Enterprise | An MCP server: an administrator adds it as a custom MCP connector (Streamable HTTP). |

So for Google the pages themselves have to say who they are for, which is why every part is written for
its audience ([Writing docs](./writing-docs.mdx#who-each-part-is-for)): each page's title ends with its
part ("… | Remy product guide", "… | Remy developer docs", "… | Remy API reference"), and each part's home
page opens by saying who it is for.

## Finding them

Nothing finds an MCP server by searching the web: an assistant needs its URL. These pages, the
[landing page](/), `/llms.txt` and each part's sidebar ("For AI tools") give it. Listing them in the
official [MCP Registry](https://registry.modelcontextprotocol.io) (`io.github.joeblew999/...`) is the
owner's decision; it is not done.

## llms.txt and Markdown

- `/<part>/llms.txt`: every page with its description; Spanish after the part's base (`/dev/es/llms.txt`).
- `/<part>/llms-full.txt`: every page's text in one file.
- Any page as Markdown: add `.md` to its address (`/dev/tooling.md`, `/reference/status.md`).

## Search engines

Google and other search engines read the pages themselves: each language has its own address, linked to
the others with `hreflang`, and all of them are in `/sitemap.xml`.
