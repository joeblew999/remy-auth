---
title: "Desarrolladores: empieza aquí"
description: "Para desarrolladores que construyen Remy o una app sobre él: autenticación compartida para las apps de Remy, Better Auth en Cloudflare Workers, el paquete compartido remy-ui y por dónde empezar."
translatedFrom: "15c7d6a6 57a9efbc 0de6e796 88eb7fe7 f354609f 831ba7b9"
---

**Para desarrolladores** que construyen Remy, o una app sobre su paquete de UI compartido. ¿Usas la app? Lee la
[guía del producto](/docs). ¿Llamas a la API? Consulta la [referencia de la API](/reference).

https://github.com/joeblew999/remy-auth

Autenticación compartida para las apps de Remy, usando **Better Auth en Cloudflare Workers**
con **D1** como el almacén de identidad y sesiones, y permisos basados en relaciones que toda app
obtiene del paquete compartido ([inicio de sesión y permisos](./auth.md)).

**Estado:** la base de la GUI está en producción en Cloudflare en dos apps construidas sobre TanStack Start,
a partir del paquete compartido `@joeblew999/remy-ui`. remy-auth inicia sesión a las personas con un código
enviado por correo, protege su API mediante políticas, y decide quién puede hacer qué mediante relaciones,
mostrado en su propia demo de notas. Cómo otra app sabe quién ha iniciado sesión es la siguiente pieza;
el trabajo abierto está listado en [.plans/now.md](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md).

## Dónde mirar [#where-to-look]

Dos sitios en producción, cada uno con páginas de sitio para Google y páginas de app bajo `/app`;
[paths.js](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/paths.js) define ambos tipos. Cambia `/en` por `/es` o `/ar` en cualquier lugar.

| Sitio | Renderizado | Abrir |
| --- | --- | --- |
| remy-auth | renderizado en el servidor en cada solicitud | https://remy-auth.gedw99.workers.dev/en |
| remy-auth-app | páginas estáticas prerenderizadas | https://remy-auth-app.gedw99.workers.dev/en |

| Tipo | Página | Enlace de remy-auth |
| --- | --- | --- |
| Sitio | Inicio | https://remy-auth.gedw99.workers.dev/en |
| Sitio | Formatos, con la configuración en la dirección | https://remy-auth.gedw99.workers.dev/en/formats?currency=JPY&count=11&calendar=islamic |
| Sitio | Una zona horaria | https://remy-auth.gedw99.workers.dev/en/time-zones/Asia/Tokyo |
| Sitio | No encontrado, localizado | https://remy-auth.gedw99.workers.dev/ar/time-zones/Mars/Olympus |
| Sitio | Mapa del sitio (solo páginas de sitio) | https://remy-auth.gedw99.workers.dev/sitemap.xml |
| App | Inicio, con la tarjeta de estado en vivo | https://remy-auth.gedw99.workers.dev/en/app |
| App | Formulario de demostración: respuesta del servidor y aviso al salir | https://remy-auth.gedw99.workers.dev/en/app/demo |
| App | Ubicación: la de Cloudflare y la de tu dispositivo | https://remy-auth.gedw99.workers.dev/en/app/location |
| Ops | Liveness | https://remy-auth.gedw99.workers.dev/healthz |

## Primeros pasos [#get-started]

El `vp` de la máquina en modo gestionado, que da a este checkout el Node que indica `.node-version` (26) y el pnpm que indica
`devEngines` ([herramientas de desarrollo](./tooling.md#vite-plus-the-machines-vp-in-managed-mode)), y luego, desde este
checkout:

```sh
vp install          # once: the dependencies from pnpm-lock.yaml, and the Git hooks
vp run setup        # the install, the pinned skills (skills-lock.json), the agents' rules, then vp run ready
vp run dev          # http://127.0.0.1:5173/en
```

Abre [localhost:5173/en](http://127.0.0.1:5173/en); cambia a español o prueba la demo.

Los servidores MCP para Claude y Codex están incluidos en el repositorio (`.mcp.json`, `.codex/config.toml`); la **Codex CLI** se ejecuta con
`pnpm dlx @openai/codex`, y **Claude Code** se instala aparte.
Las comprobaciones de navegador usan el Chromium propio de Playwright, que instala la tarea `browsers` (en Linux, añade la fuente
`fonts-noto-cjk`).

## Trabajar con un agente [#work-with-an-agent]

Cómo iniciar, reanudar y recargar Codex o Claude Code, en VS Code o en una terminal, está en las
[herramientas de desarrollo](./tooling.md#start-or-reload-your-agent).

## Comandos cotidianos [#everyday-commands]

Todos los comandos, generados a partir de la propia línea de comandos, están en [Comandos](./commands.mdx). Lo que ejecutas día a
día, y quién ejecuta producción y una publicación, está en [el flujo](./how-we-work.md#the-flow-the-standard-way-in-plain-sight).
Cada tarea está escrita en el `vite.config.ts` de su paquete, y `vp run` las lista junto con los scripts de la raíz.

La vista previa local y el despliegue remoto usan el mismo build y la misma configuración de Wrangler; desplegar es hacer un push, que
Cloudflare compila. Consulta los [comandos locales/remotos](./run-and-test.md#one-scaffold-for-local-and-cloudflare)
y [en Cloudflare](./run-and-test.md#on-cloudflare) para el despliegue y para ejecutar las mismas pruebas contra una URL desplegada.

Revisa los cambios de dependencias después de actualizar. Node está fijado en `.node-version` y en los
`engines` de `package.json`, pnpm en `devEngines`, y cada una de las demás versiones una sola vez en el catálogo de `pnpm-workspace.yaml`; los commits de origen de las skills están en el paquete (`packages/remy-cli/src/skills.ts`), que todas las
apps instalan ([proyectos](./projects.md)).

## Documentación del proyecto [#project-documentation]

- [Agentes: empieza aquí](./agents.md): por dónde empiezan los agentes; el `AGENTS.md` y `CLAUDE.md` raíz solo apuntan a él.
- [Principios de desarrollo](./principles.md): qué debe ser el código, y cómo funcionan los planes.
- [Cómo trabajamos](./how-we-work.md): cómo trabajan las personas y los agentes.
- [Herramientas de desarrollo](./tooling.md): las herramientas fijadas, los secretos, las skills de agentes, MCP y las herramientas de navegador.
- [Ejecutar, previsualizar y probar la app](./run-and-test.md): un Worker, objetivos de prueba locales y remotos, Cloudflare.
- [Proyectos](./projects.md): la estructura que mantiene toda app, una app nueva, publicación, traducciones, Cloudflare y planes.
- [Paquete de UI compartido](./remy-ui.md) y su [registro de cambios](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/CHANGELOG.md).
- [Planes](https://github.com/joeblew999/remy-auth/tree/main/.plans): [.plans/now.md](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md) es la única lista de lo que está abierto y en qué punto está.
