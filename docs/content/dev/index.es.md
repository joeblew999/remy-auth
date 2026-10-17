---
title: "Desarrolladores: empieza aquí"
description: "Para desarrolladores que construyen Remy o una app sobre él: autenticación compartida para las apps de Remy, Better Auth en Cloudflare Workers, el paquete compartido remy-ui y por dónde empezar."
translatedFrom: "15c7d6a6 48bae343 6dd49ee8 88eb7fe7 bb481083 c1c9c2c9"
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
[paths.js](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/paths.js) define ambos tipos. Cambia `/en` por `/es` o `/ar` en cualquier lugar.

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

Node según indica `.node-version` (26), y luego, desde este checkout:

```sh
npm install          # once, for the lockfile and the remy bin
npm run setup        # the pinned skills, MCP, the flow's guard, the installation's checks
npm run dev          # http://127.0.0.1:5173/en
```

Abre [localhost:5173/en](http://127.0.0.1:5173/en); cambia a español o prueba la demo.
La configuración instala las dependencias y las skills, registra MCP, y luego ejecuta las comprobaciones de la instalación (sin navegador).

La configuración instala la **Codex CLI** fijada en su versión; autentícate cuando se te solicite. **Claude Code**
es opcional y se instala aparte.
Instala **Google Chrome** antes de la configuración; las comprobaciones de navegador usan el Chrome instalado.

## Trabajar con un agente [#work-with-an-agent]

Cómo iniciar, reanudar y recargar Codex o Claude Code, en VS Code o en una terminal, está en las
[herramientas de desarrollo](./tooling.md#start-or-reload-your-agent).

## Comandos cotidianos [#everyday-commands]

Los comandos cotidianos, iguales en todas las apps de la plataforma (los scripts de `package.json`,
ejecutados por el bin `remy` del paquete):

| Tarea | Comando |
| --- | --- |
| Ver qué está pasando | `npm run dev:status` |
| Empezar una tarea, en un worktree propio | `npm run dev:start -- <name>` |
| Comprobar, después de cada cambio | `npm run dev:change` |
| Aterrizar el trabajo terminado: main, las comprobaciones de GitHub, staging | `npm run dev:land -- "<what changed>"` |
| Listar los scripts | `npm run` |
| Ejecutar la GUI local | `npm run dev` |
| Probar el build de producción en local | `npm run preview` |
| Las versiones de las herramientas | `npx remy verify doctor` |
| Comprobar actualizaciones de paquetes | `npm run packages -- check` |
| Actualizar paquetes, incluidas las versiones mayores | `npm run packages -- upgrade` |
| Ayuda de la CLI de Better Auth | `npm run auth -- --help` |
| Ayuda de la CLI de Cloudflare | `npm run wrangler -- --help` |
| Inspeccionar las herramientas de navegador | `npm run browser -- --help` |
| Inspeccionar el estado de MCP en ambos clientes | `npx remy mcp status` |

Las primeras cuatro son [el flujo](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest), que
también dice quién ejecuta producción y una publicación. Las comprobaciones pesadas no son comandos cotidianos: GitHub las
ejecuta después de cada aterrizaje, y las herramientas las rechazan fuera del flujo.

La vista previa local y el despliegue remoto usan el mismo build y la misma configuración de Wrangler.
Consulta los [comandos locales/remotos](./run-and-test.md#one-scaffold-for-local-and-cloudflare)
para el despliegue y para ejecutar las mismas pruebas contra una URL desplegada.

Revisa los cambios de dependencias después de actualizar. Node está fijado en `.node-version` y en los
`engines` de `package.json`; los commits de origen de las skills están en el paquete (`packages/ui/src/cli/skills.ts`), que todas las
apps instalan ([la línea de comandos](./projects.md)).

## Documentación del proyecto [#project-documentation]

- [Agentes: empieza aquí](./agents.md): por dónde empiezan los agentes; el `AGENTS.md` y `CLAUDE.md` raíz solo apuntan a él.
- [Principios de desarrollo](./principles.md): qué debe ser el código, y cómo funcionan los planes.
- [Cómo trabajamos](./how-we-work.md): cómo trabajan las personas y los agentes.
- [Herramientas de desarrollo](./tooling.md): los scripts y comandos, skills, MCP y herramientas de navegador.
- [Flujo de trabajo en tiempo de ejecución de la GUI](./run-and-test.md): un Worker, objetivos de prueba locales y remotos.
- [La línea de comandos](./projects.md): `remy`, las herramientas que toda app instala con el paquete.
- [Paquete de UI compartido](./remy-ui.md) y su [registro de cambios](https://github.com/joeblew999/remy-auth/blob/main/CHANGELOG.md).
- [Planes](https://github.com/joeblew999/remy-auth/tree/main/.plans): [.plans/now.md](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md) es la única lista de lo que está abierto y en qué punto está.
