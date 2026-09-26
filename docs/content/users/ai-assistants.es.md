---
title: "Pregunta a tu asistente de IA"
description: "Deja que ChatGPT, Claude u otro asistente de IA lea esta guía para que pueda responder tus preguntas sobre la app de Remy."
---

Esta guía es para las personas que **usan la app de Remy**. Tu asistente de IA puede leerla a través de una sola dirección, el servidor MCP de la guía:

```text
https://remy-auth-docs.gedw99.workers.dev/api/mcp/docs
```

Solo tiene acceso a esta guía del producto. Para desarrollar Remy o usar su API, consulta en cambio la
[documentación para desarrolladores](/dev/ai-tools).

## ChatGPT [#chatgpt]

1. Ajustes → **Seguridad e inicio de sesión** → activa el **Modo desarrollador** (tu cuenta o espacio de trabajo tiene que permitirlo).
2. **Plugins** → **+** → ponle el nombre `remy-product-guide`, pega la dirección de arriba y crea el plugin.
3. En un chat, elígelo en el menú **+** y pregunta sobre Remy. Deep research también puede usarlo.

## Claude [#claude]

Ajustes → **Conectores** → **Añadir conector personalizado** → pega la dirección de arriba.

## Gemini y Google [#gemini-and-google]

Gemini y el Modo IA de Google encuentran esta guía a través de la Búsqueda de Google, sin nada que configurar. Gemini CLI
puede añadir la dirección de arriba: `gemini mcp add --transport http remy-product-guide https://remy-auth-docs.gedw99.workers.dev/api/mcp/docs`.

## Cualquier asistente, sin configuración [#any-assistant-without-setup]

Pásale [`/docs/llms.txt`](https://remy-auth-docs.gedw99.workers.dev/docs/llms.txt) (todas las páginas con una línea sobre cada una) o
[`/docs/llms-full.txt`](https://remy-auth-docs.gedw99.workers.dev/docs/llms-full.txt) (la guía completa). En cada página, **Abrir** envía esa página
a ChatGPT o Claude.
