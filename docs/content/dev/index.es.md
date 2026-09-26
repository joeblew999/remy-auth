---
title: "Remy Auth"
---
<!-- translated-from: docs/content/dev/index.md @ 4f143453da05397a3cf209e7de9657a26312be28 -->

https://github.com/joeblew999/remy-auth

Autenticación compartida para las apps de Remy, usando **Better Auth en Cloudflare Workers**
con **D1** como el almacén de identidad y sesiones planeado.

**Estado:** la base de la GUI está en producción en Cloudflare en dos apps construidas sobre TanStack Start, en
inglés, español y árabe, a partir del paquete compartido `@joeblew999/remy-ui`. La autenticación y el almacenamiento
en D1 todavía están planeados; el trabajo abierto está listado en [.plans/now.md](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md).

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

Instala [mise](https://mise.jdx.dev/getting-started.html), y luego ejecuta desde este checkout:

```sh
mise install
mise run project:setup
mise run project:dev
```

Abre [localhost:5173/en](http://127.0.0.1:5173/en); cambia a español o prueba la demo.
La configuración instala las dependencias y las skills, registra MCP, y luego ejecuta las comprobaciones de build y de navegador.

La configuración instala la **Codex CLI** fijada en su versión; autentícate cuando se te solicite. **Claude Code**
es opcional y se instala aparte.
Instala **Google Chrome** antes de la configuración; las comprobaciones de navegador usan el Chrome instalado.

## Trabajar con un agente [#work-with-an-agent]

Cómo iniciar, reanudar y recargar Codex o Claude Code, en VS Code o en una terminal, está en las
[herramientas de desarrollo](./tooling.md#start-or-reload-your-agent).

## Comandos cotidianos [#everyday-commands]

| Tarea | Comando |
| --- | --- |
| Explorar las tareas del proyecto | `mise tasks ls --local` |
| Ejecutar la GUI local | `mise run project:dev` |
| Probar el build de producción en local | `mise run project:preview` |
| Verificar la configuración | `mise run project:verify` |
| Diagnosticar mise | `mise doctor` |
| Comprobar actualizaciones de paquetes | `mise run packages:check` |
| Actualizar paquetes, incluidas las versiones mayores | `mise run packages:upgrade` |
| Ayuda de la CLI de Better Auth | `mise run auth:cli -- --help` |
| Ayuda de la CLI de Cloudflare | `mise run cf:cli -- --help` |
| Inspeccionar las herramientas de navegador | `mise run browser:cli -- --help` |
| Inspeccionar el estado de MCP en ambos clientes | `mise run mcp:status` |

La vista previa local y el despliegue remoto usan el mismo build y la misma configuración de Wrangler.
Consulta los [comandos locales/remotos](./gui.md#one-scaffold-for-local-and-cloudflare)
para el despliegue y para ejecutar las mismas pruebas contra una URL desplegada.

Revisa los cambios de dependencias después de actualizar. Node está fijado en [mise.toml](https://github.com/joeblew999/remy-auth/blob/main/mise.toml); los
commits de origen de las skills y las tareas compartidas de arranque del agente viven en
[tasks/](./tasks.md), un archivo por espacio de nombres de tarea, que otros proyectos incluyen por referencia de git.

## Documentación del proyecto [#project-documentation]

- [Índice de agentes](https://github.com/joeblew999/remy-auth/blob/main/AGENTS.md): por dónde empiezan los agentes.
- [Principios de desarrollo](./development.md): qué debe ser el código, y cómo funcionan los planes.
- [Cómo trabajamos](./how-we-work.md): cómo trabajan las personas y los agentes.
- [Herramientas de desarrollo](./tooling.md): tareas de mise, skills, MCP y herramientas de navegador.
- [Flujo de trabajo en tiempo de ejecución de la GUI](./gui.md): un Worker, objetivos de prueba locales y remotos.
- [Tareas compartidas](./tasks.md): las tareas de mise que incluyen otros proyectos.
- [Paquete de UI compartido](./ui-package.md) y su [registro de cambios](https://github.com/joeblew999/remy-auth/blob/main/CHANGELOG.md).
- [Planes](https://github.com/joeblew999/remy-auth/tree/main/.plans): [.plans/now.md](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md) es la única lista de lo que está abierto y en qué punto está.
