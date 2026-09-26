---
title: "Docs in your AI tools"
description: "Read and search these docs from Claude, ChatGPT, Cursor, VS Code or Gemini CLI: the MCP servers, llms.txt and Markdown pages."
---

The docs Worker serves the docs to AI tools three ways. All of them come from Fumadocs; nothing here is
ours but the addresses.

## MCP servers

Each docs site has a remote MCP server (Streamable HTTP), with three tools: `list_pages`, `get_page` (a
page as Markdown) and `search`.

| Site | MCP server |
| --- | --- |
| Developer docs | `https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev` |
| Guide | `https://remy-auth-docs.gedw99.workers.dev/api/mcp/docs` |

Add one as a remote MCP server in your tool (`mise run docs:test:remote` proves both answer). For Claude Code:

```sh
claude mcp add --transport http remy-dev-docs https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev
```

## llms.txt and Markdown

- `/dev/llms.txt` and `/docs/llms.txt`: every page with its description; `/es/llms.txt` after the site's
  base for Spanish (`/dev/es/llms.txt`).
- `/dev/llms-full.txt`: every page's text in one file.
- Any page as Markdown: add `.md` to its address (`/dev/tooling.md`). "Copy Markdown" and "Open" on each
  page do the same for you.

## Search engines

Google and other search engines read the pages themselves: each language has its own address, linked to
the others with `hreflang`, and all of them are in `/sitemap.xml`.
