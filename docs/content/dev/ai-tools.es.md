---
title: "Los docs en tus herramientas de IA"
description: "Todos los servidores MCP y archivos llms.txt disponibles, para quién es cada uno, cómo añadirlos a ChatGPT, Claude, Cursor, VS Code o Gemini, y cómo ve los docs el Modo IA de Google."
---

La documentación tiene tres partes, cada una para un público distinto, y cada parte tiene su propio servidor MCP y sus propios archivos llms.
Añade solo el que necesites: la guía de producto no sabe nada del código, y los docs para desarrolladores no saben nada
de los parámetros de la API.

| Parte | Para | Servidor MCP (Streamable HTTP) | llms |
| --- | --- | --- | --- |
| [Guía de producto](/docs) | quienes usan la app | `https://remy-auth-docs.gedw99.workers.dev/api/mcp/docs` (`remy-product-guide`) | [llms.txt](https://remy-auth-docs.gedw99.workers.dev/docs/llms.txt), [completo](https://remy-auth-docs.gedw99.workers.dev/docs/llms-full.txt) |
| [Docs para desarrolladores](/dev) | desarrolladores que construyen Remy o una app sobre él | `https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev` (`remy-developer-docs`) | [llms.txt](https://remy-auth-docs.gedw99.workers.dev/dev/llms.txt), [completo](https://remy-auth-docs.gedw99.workers.dev/dev/llms-full.txt) |
| [Referencia de la API](/reference) | desarrolladores que llaman a la API | `https://remy-auth-docs.gedw99.workers.dev/api/mcp/reference` (`remy-api-reference`) | [llms.txt](https://remy-auth-docs.gedw99.workers.dev/reference/llms.txt), [completo](https://remy-auth-docs.gedw99.workers.dev/reference/llms-full.txt) |

[`/llms.txt`](https://remy-auth-docs.gedw99.workers.dev/llms.txt) lista las tres. No requieren iniciar sesión: son públicos y de solo lectura.

## Las herramientas [#the-tools]

Todos los servidores tienen las mismas cuatro, todas de solo lectura:

- `search` y `fetch`: el par que ChatGPT necesita para el chat, la investigación profunda (deep research) y el conocimiento de empresa
  ([esquema de OpenAI](https://developers.openai.com/api/docs/mcp)). `search` devuelve
  `{results: [{id, title, url}]}`; `fetch(id)` devuelve `{id, title, text, url}`, la página en Markdown.
- `list_pages` y `get_page`: las propias de Fumadocs (`fumadocs-core/mcp`).

Las instrucciones de cada servidor indican para quién es, así que un asistente con los tres elige el correcto.

## Cómo añadir uno [#adding-one]

| Herramienta | Cómo |
| --- | --- |
| ChatGPT | Settings → Security and login → activa Developer mode; luego Plugins → **+** → pega la URL. |
| Claude (web, escritorio) | Settings → Connectors → Add custom connector → pega la URL. |
| Claude Code | `claude mcp add --transport http remy-developer-docs https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev` |
| Cursor | `.cursor/mcp.json`: `{"mcpServers": {"remy-developer-docs": {"url": "https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev"}}}` |
| VS Code | `.vscode/mcp.json`: `{"servers": {"remy-developer-docs": {"type": "http", "url": "https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev"}}}` |

Sustituye la URL y el nombre por los de otra fila para usar la guía de producto o la referencia de la API.
`mise run docs:test:remote` lista las herramientas de cada servidor.

## Gemini y Google [#gemini-and-google]

Las respuestas de IA de Google no usan servidores MCP ni llms.txt: lo dice el propio Google
([Search Central](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)).

| Dónde | Cómo ve estos docs |
| --- | --- |
| Modo IA de Google, AI Overviews | El índice de búsqueda de Google: las páginas HTML (`/sitemap.xml`), sus títulos, descripciones y texto. La página debe estar indexada con un fragmento (snippet), y el sitio incluido en "Search generative AI features" en Search Console. |
| La app de Gemini | El mismo grounding de Google Search; no admite ningún servidor MCP nuestro. |
| Gemini CLI | Un servidor MCP: `gemini mcp add --transport http remy-developer-docs https://remy-auth-docs.gedw99.workers.dev/api/mcp/dev` |
| Gemini API (agentes gestionados) | Un servidor MCP: una herramienta `mcp_server` con la URL. |
| Gemini Enterprise | Un servidor MCP: un administrador lo añade como conector MCP personalizado (Streamable HTTP). |

Por eso, para Google, las propias páginas tienen que decir a quién van dirigidas, y de ahí que cada parte esté escrita para
su público ([Escribir docs](./writing-docs.mdx#who-each-part-is-for)): el título de cada página termina con su
parte ("… | Remy product guide", "… | Remy developer docs", "… | Remy API reference"), y la página de inicio de cada parte
empieza diciendo para quién es.

## Cómo encontrarlos [#finding-them]

Nada encuentra un servidor MCP buscando en la web: un asistente necesita su URL. Estas páginas, la
[página de inicio](/), `/llms.txt` y la barra lateral de cada parte ("For AI tools") se la dan. Incluirlos en el
[MCP Registry](https://registry.modelcontextprotocol.io) oficial (`io.github.joeblew999/...`) es una decisión
del propietario; no está hecho.

## llms.txt y Markdown [#llmstxt-and-markdown]

- `/<part>/llms.txt`: todas las páginas con su descripción; el español va después de la base de la parte (`/dev/es/llms.txt`).
- `/<part>/llms-full.txt`: el texto de todas las páginas en un solo archivo.
- Cualquier página en Markdown: añade `.md` a su dirección (`/dev/tooling.md`, `/reference/status.md`).

## Buscadores [#search-engines]

Google y otros buscadores leen las propias páginas: cada idioma tiene su propia dirección, enlazada con las
demás mediante `hreflang`, y todas están en `/sitemap.xml`.
