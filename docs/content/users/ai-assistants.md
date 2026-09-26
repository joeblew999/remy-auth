---
title: "Ask your AI assistant"
description: "Let ChatGPT, Claude or another AI assistant read this guide, so it can answer your questions about the Remy app."
---

This guide is for people **using the Remy app**. Your AI assistant can read it through one address, the
guide's MCP server:

```text
https://remy-auth-docs.gedw99.workers.dev/api/mcp/docs
```

It only has this product guide. Building Remy, or calling its API, is in the
[developer docs](/dev/ai-tools) instead.

## ChatGPT

1. Settings → **Security and login** → turn on **Developer mode** (your account or workspace has to allow it).
2. **Plugins** → **+** → name it `remy-product-guide`, paste the address above, create.
3. In a chat, pick it from the **+** menu and ask about Remy. Deep research can use it too.

## Claude

Settings → **Connectors** → **Add custom connector** → paste the address above.

## Any assistant, without setup

Give it [`/docs/llms.txt`](https://remy-auth-docs.gedw99.workers.dev/docs/llms.txt) (every page with a line about it) or
[`/docs/llms-full.txt`](https://remy-auth-docs.gedw99.workers.dev/docs/llms-full.txt) (the whole guide). On each page, **Open** sends that page
to ChatGPT or Claude.
