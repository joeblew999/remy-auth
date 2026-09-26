---
title: "Referencia de herramientas de desarrollo"
description: "La referencia de herramientas de desarrollo: tareas de mise, herramientas fijadas, secretos, skills de agentes y los servicios de Cloudflare detrás de la documentación."
---

## CLI para desarrolladores [#developer-cli]

```sh
mise install
mise run project:setup
mise run auth:cli -- --help
mise run cf:cli -- --help
mise run auth:info
```

Node está fijado en `mise.toml`; la CLI de Better Auth (`auth`), Wrangler, Chrome DevTools y Modern Web Guidance están fijados en
`package.json` y `package-lock.json`. `project:setup` ejecuta `npm ci`, instala los skills oficiales fijados
para Codex y Claude, registra las herramientas MCP del proyecto y luego ejecuta `mise run project:verify`. Se detiene ante cualquier
paso fallido. Los comandos usan los binarios locales y aceptan los argumentos de la CLI original
después de `--`; no descargan una CLI diferente en tiempo de ejecución.

Por ejemplo, `mise run auth:cli -- generate --help` describe la generación de esquemas, y
`mise run cf:cli -- d1 --help` muestra las operaciones de D1. `project:doctor` comprueba las versiones de las herramientas
sin iniciar sesión en Cloudflare. `auth:info` informa del scaffold actual; aún no se ha creado
una configuración de auth ni una base de datos. La generación de esquemas, las migraciones
y la creación del administrador se conectarán a D1 local durante la implementación del servicio.
Una versión `Unknown` de Better Auth en `auth:info` es lo esperado hasta que se añada la biblioteca
de la aplicación; `project:doctor` informa la versión instalada de la CLI por separado.

Estas son herramientas para desarrolladores/operadores. El inicio de sesión de la CLI de Remy para usuarios finales y las llamadas
delegadas a la API siguen siendo parte del hito del servicio. Ambas apps están en vivo en Cloudflare; `cf:deploy` sube a
`DEPLOY_ORIGIN`, definido en [mise.toml](https://github.com/joeblew999/remy-auth/blob/main/mise.toml), y solo se ejecuta a petición del propietario.

### Actualizaciones de paquetes [#package-upgrades]

```sh
mise run packages:check            # Preview available updates
mise run packages:upgrade          # Apply latest versions, including majors
```

Todas las tareas del proyecto usan un espacio de nombres. Lístalas con `mise tasks ls --local`.

Los comandos integrados de mise conservan su significado habitual:

| Comando integrado | Comportamiento en este repositorio |
| --- | --- |
| `mise install` | Instala los runtimes configurados; usa `project:setup` para paquetes npm y skills |
| `mise tasks ls --local` | Descubre las tareas con espacio de nombres del proyecto |
| `mise run` | Abre el selector de tareas de mise en una terminal interactiva; sin configuración ni despliegue automáticos |
| `mise exec -- node --version` | Ejecuta usando la versión de Node configurada |
| `mise doctor` | Diagnostica la instalación de mise en la máquina; `project:doctor` comprueba las CLI del proyecto |
| `mise outdated` / `mise upgrade --local --dry-run` | Inspecciona actualizaciones de runtimes; las actualizaciones de npm usan `packages:upgrade` |
| `mise fmt --check` | Comprueba el formato de mise.toml |
| `mise run --dry-run project:setup` | Muestra una vista previa de la secuencia completa y ordenada de configuración |

Un pin exacto de Node se mantiene fijo con el `mise upgrade` habitual. Usa el comando integrado
`mise upgrade --local --bump node` solo cuando quieras cambiarlo intencionadamente, y revisa
la restricción del motor de Node en `package.json` junto con la nueva versión. Las configuraciones
de mise superiores y globales pueden añadir herramientas; este repositorio declara solo Node.
Consulta [la ejecución de tareas de mise](https://mise.jdx.dev/tasks/running-tasks.html) y
[el comportamiento de actualización de runtimes](https://mise.jdx.dev/cli/upgrade.html).

Las tareas de passthrough de la CLI aceptan directamente los flags originales, como
`mise run auth:cli --help` y `mise run cf:cli d1 --help`.

| Espacio de nombres | Propósito |
| --- | --- |
| `project:*` | Configuración, pipeline y verificación (valores predeterminados compartidos desde `tasks/project.toml`; `[env]` proporciona las entradas) y diagnóstico de herramientas |
| `packages:*` | Comprueba y actualiza paquetes npm |
| `ui:*` | Compila los catálogos compartidos (`ui:generate`), regenera los componentes y el tema de shadcn (`ui:components`, `ui:theme`), demuestra que no se han modificado (`ui:verify`), empaqueta y publica el paquete (`ui:pack`, `ui:release`) |
| `skills:*` | Instala, lista y elimina los skills oficiales fijados |
| `auth:*` | CLI de Better Auth y diagnóstico |
| `cf:*` | CLI de Cloudflare, logs en vivo, despliegue (`cf:deploy`), Workers de comprobación desechables (`cf:preview`, `cf:preview-delete`), logs almacenados y uso de IA (`cf:events`, `cf:ai-*`); tareas compartidas, listadas en el [README de tareas](./tasks.md#cloudflare-tasks) |
| `api:*` | El documento OpenAPI generado que sirve un Worker en ejecución (`api:spec`, `--urls` para sus operaciones; tarea compartida) |
| `browser:*` | CLI de Chrome DevTools, ciclo de vida de la sesión y servidor MCP |
| `web:*` | Búsqueda y recuperación de Modern Web Guidance |
| `docs:*` | El Worker de documentación (`docs/`): ejecutarlo (`docs:dev`), compilarlo y comprobarlo (`docs:build`, `docs:check`), probarlo (`docs:test`, `docs:test:remote`), desplegarlo (`docs:preview`, `docs:deploy`), las páginas de Ask AI en AI Search (`docs:publish`), detener o reanudar las respuestas (`docs:answers:off`, `docs:answers:on`), sus logs y la IA (`docs:observe`, `docs:ai-gateway`), la CLI de Fumadocs (`docs:cli`) y su incorporación a otra app (`docs:init`) |
| `i18n:*` | Traducciones, dos pipelines: mensajes de la interfaz (Paraglide) y documentación (Fumadocs). `i18n:check` (sin conexión, solo lectura; un aviso o la puerta de control del release), `i18n:translate` (el agente Claude fijado, en main, con commit); tareas compartidas, [un solo redactor](./how-we-work.md#translations-one-writer), [cómo](./tasks.md#translations) |
| `mcp:*` | Registra, verifica e inspecciona las conexiones MCP del proyecto |
| `codex:*` / `claude:*` | Inicia o reanuda una sesión interactiva de agente (tareas compartidas) |

Después de `project:setup`, `packages:upgrade` usa el `npm-check-updates` fijado localmente para mover las
dependencias npm más allá de los pins de versión existentes, guarda las versiones exactas, las instala y
refresca `package-lock.json`. Luego ejecuta la tarea completa de verificación de herramientas.
Los conflictos de peer fallan visiblemente; la tarea no usa `--force` ni `--legacy-peer-deps`
de npm. Revisa el diff del manifiesto/lockfile y cualquier requisito de migración de versión mayor.
Si la instalación falla tras actualizar el manifiesto, resuelve el conflicto reportado antes de
volver a usar `project:setup`; ningún rollback automático descarta tus cambios.

`project:setup` sigue reproduciendo el lockfile. Las dependencias del workspace también se actualizan; las referencias locales `@joeblew999/remy-ui` y `@joeblew999/remy-auth-contract` se excluyen
de las actualizaciones del registro. Los pins de Node y de las fuentes de skills en
`mise.toml` se gestionan por separado. El flujo de verificación incluye la comprobación de tipos de la GUI, una build del Worker y
pruebas de navegador. La compatibilidad del runtime de auth
necesitará sus propias pruebas cuando se integre Better Auth.

### Verificación [#verification]

Las pruebas se ejecutan por niveles, desde `project:check` (comprobación de tipos y build) hasta
`project:verify` (todo, en todos los idiomas); los niveles y cuándo usar cada uno están en
[cómo trabajamos](./how-we-work.md#gates-before-anything-leaves-the-machine), y las tareas en el
[README de tareas](./tasks.md). Los despliegues no ejecutan pruebas salvo que `GATE` elija un nivel.

Ejecuta `mise run project:verify` antes de una publicación; `project:setup` y `packages:upgrade` también terminan con ella. Comprueba
las tareas de mise, las dependencias instaladas, las versiones de las CLI, la consistencia del manifiesto/lockfile,
la configuración de Wrangler y los ajustes de observabilidad, y la fuente fijada, los archivos
y el symlink de Claude de cada skill. Usa la instalación local existente y
no aprovisiona recursos de Cloudflare. Las comprobaciones de skills cubren el inventario del lockfile,
no el descubrimiento upstream ni los hashes de integridad de contenido.

La comprobación de configuración de Wrangler usa su propio lector. Luego la verificación genera
tipos, construye y simula (dry-run) el empaquetado de despliegue para la GUI/Worker, y ejecuta las
comprobaciones de Playwright y Lighthouse contra el artefacto de producción en Workers locales usando el
Chrome instalado. No se realiza ningún despliegue. Consulta [la prueba de la GUI](./gui.md) para el alcance y los comandos.


## Iniciar o recargar tu agente [#start-or-reload-your-agent]

### Extensión de Codex para VS Code [#vs-code-codex-extension]

Abre este repositorio en VS Code y usa la barra lateral de Codex. La extensión incluye
su propio ejecutable; la instalación de la CLI npm del proyecto sirve a los usuarios de terminal.
[La CLI de Codex y la extensión de IDE comparten la configuración de MCP](https://developers.openai.com/learn/docs-mcp).
Nuestro registro de proyecto escribe `.codex/config.toml`; confía en el proyecto en Codex
para que la configuración del proyecto pueda cargarse. El `.vscode/mcp.json` de VS Code configura
su propio cliente MCP y no es el archivo de configuración de la extensión de Codex.

Después de cambiar los skills o la configuración de MCP:

1. Ejecuta `mise run mcp:register` en la terminal del repositorio.
2. Guarda tu trabajo, abre la paleta de comandos (`Cmd+Shift+P` en macOS) y ejecuta
   **Developer: Reload Window**.
3. Vuelve a abrir la barra lateral de Codex y continúa la conversación. Verifica que el agente
   pueda llamar a las herramientas recién configuradas; el registro por sí solo no demuestra una conexión.

`codex:resume` lanza una sesión de terminal; no recarga la extensión.
La CLI `code` instalada no tiene un flag documentado de reload-window, así que la recarga usa
el comando integrado de VS Code en lugar de un wrapper de shell que simule reiniciarla.

### Agentes de terminal [#terminal-agents]

Después de `mise run project:setup`, usa la CLI instalada de Codex o Claude Code:

```sh
mise run codex:start     # New Codex conversation
mise run codex:resume    # Resume latest Codex conversation in this project
mise run claude:start    # New Claude conversation
mise run claude:resume   # Resume latest Claude conversation in this project
```

Para recargar los skills y la configuración de MCP, sal del agente actual con `/exit` y luego
ejecuta su tarea `:resume` desde tu terminal. Estas tareas refrescan el registro de MCP,
se lanzan desde la raíz del repositorio y preservan la entrada/salida interactiva de la terminal.
No detienen otra sesión en ejecución. Usa `/mcp` dentro del agente para comprobar la
conexión. Pasa opciones adicionales originales después de `--`, por ejemplo
`mise run codex:start -- --help`. La configuración instala localmente la [`@openai/codex` CLI](https://learn.chatgpt.com/docs/codex/cli)
oficial y fijada, y las tareas de Codex usan ese ejecutable directamente en lugar de
depender del PATH de tu shell.
`packages:upgrade` la actualiza junto con las demás dependencias. Autentícate cuando
se te solicite. Claude Code se instala por separado; lanzar Codex no lo requiere.


## Skills de agentes [#agent-skills]

Las fuentes de los skills son las vars `*_skills_source` de la tarea `skills:install` en
[tasks/skills.toml](https://github.com/joeblew999/remy-auth/blob/main/tasks/skills.toml): Better Auth, Cloudflare, Chrome DevTools, Modern Web
Guidance, shadcn, Playwright CLI, GitHub release y TanStack Router/Start. Los skills de TanStack están
nombrados uno por uno, incluido su skill `react-router` (los bindings de React), que reemplazó al
skill de Remix con el mismo nombre: los skills se instalan planos por nombre, así que los dos no pueden
coexistir. Los skills de TanStack Form no están instalados: solo existen en sus ramas alpha de v2 y
describen la API alpha 2.0, no la 1.x que fijamos; añádelos cuando pasemos a Form 2. El directorio contiene
un archivo por espacio de nombres de tarea; `mise.toml` lo incluye, y [tasks/README.md](./tasks.md) explica
cómo otro proyecto lo incluye y qué paquetes npm proporciona ese proyecto. Instala los skills localmente:

```sh
mise install
mise run skills:install
mise run skills:list
```

Para reinstalar desde cero, ejecuta `mise run skills:remove` y luego `mise run skills:install`.

Los skills viven en `.agents/skills/`; `.claude/skills/` enlaza a los mismos archivos.
El instalador registra la procedencia en `skills-lock.json`. Volver a ejecutar la instalación
restaura los skills seleccionados desde las fuentes fijadas; actualiza sus commits de fuente deliberadamente
para adoptar cambios upstream. Solo se hace commit de `skills-lock.json`; los skills instalados y sus
enlaces de Claude están ignorados y se recrean con `project:setup` o `skills:install`.
`mise run skills:list` muestra lo que está instalado; [el plan de skills](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/agent-skills.md)
hace seguimiento de las dependencias sin un skill oficial. Recarga una sesión de agente existente
si los skills recién instalados aún no son visibles.

Para añadir una fuente, solo de los propios mantenedores de la biblioteca:

1. Fíjala en `vars` de la tarea `skills:install` en `tasks/skills.toml` como
   `<name>_skills_source = "https://github.com/<owner>/<repo>/tree/<commit>"`, usando el
   commit de `git ls-remote https://github.com/<owner>/<repo> HEAD`.
2. Añade su línea a la lista `run` de esa tarea, nombrando los skills con `--skill` en lugar de `'*'`
   cuando el repositorio también incluya skills solo para contribuidores.
3. Ejecuta `mise run skills:remove`, `mise run skills:install` y `mise run project:verify`.
   La verificación lee los pins de `tasks/skills.toml` y rechaza los skills instalados desde fuentes no fijadas.


## Registro de MCP [#mcp-registration]

Los skills proporcionan instrucciones y flujos de trabajo; MCP proporciona herramientas invocables. Chrome
DevTools usa ambos. Modern Web Guidance usa su CLI, y muchos skills de auth/Cloudflare
también funcionan a través de las CLI existentes; un skill no requiere automáticamente
un servidor MCP.

```sh
mise run mcp:register   # Also runs during project:setup
mise run mcp:verify     # Also runs during project:verify
mise run mcp:status     # Requires both Codex and Claude CLIs
```

El registro (`tasks/mcp/register`, una tarea de archivo) escribe la entrada `chrome-devtools` en
`.codex/config.toml` y `.mcp.json`, locales del proyecto. Cada cliente lanza `browser:mcp` a través del
ejecutable de mise actual con una ruta de repositorio explícita. Los archivos generados contienen rutas
específicas de la máquina y están en gitignore; vuelve a ejecutar el registro después de mover el checkout o el
ejecutable de mise. Los ajustes y servidores no relacionados se conservan. Los archivos existentes modificados
reciben una copia de recuperación `.bak`; la serialización TOML puede normalizar el formato y los comentarios.

El servidor usa el paquete de npm fijado, un perfil de Chrome headless aislado, y tiene
desactivadas la telemetría de herramientas y las subidas a CrUX. El proceso MCP es independiente de la
sesión `browser:start`/`browser:stop` de la CLI; el cliente del agente gestiona su ciclo de vida.

Recarga el agente después del registro. Codex solo carga la configuración del proyecto en un
proyecto de confianza. Claude puede mostrar **Pending approval** para un nuevo servidor MCP del proyecto;
revísalo en la interfaz `/mcp` de Claude. El registro no evita la confianza del cliente ni los ajustes
de aprobación. Consulta [la configuración de MCP de Codex](https://developers.openai.com/codex/mcp)
y [los ámbitos de MCP de Claude](https://code.claude.com/docs/en/mcp).

`mcp:verify` comprueba la configuración, no una conexión en vivo. `mcp:status` muestra lo que
ven los clientes (Claude también comprueba la conectividad de los servidores aprobados).


## Herramientas de navegador [#browser-tooling]

Las [herramientas de agente de Chrome DevTools](https://developer.chrome.com/docs/devtools/agents) de Google
ofrecen interacción con el navegador, capturas de pantalla, inspección de accesibilidad, depuración de
red/cookies, Lighthouse y análisis de rendimiento. Instala Google Chrome por separado; la configuración
del proyecto no instala el navegador. La CLI es experimental y está fijada junto con las demás herramientas
npm, así que `packages:upgrade` también la actualiza.

```sh
mise run browser:start                          # Isolated, headless Chrome session
mise run browser:cli -- new_page http://localhost:3000
mise run browser:cli -- list_pages
mise run browser:cli -- take_snapshot 1          # Use the returned page ID
mise run browser:cli -- click 1 "UID_FROM_SNAPSHOT"
mise run browser:stop
```

Ejecuta `mise run browser:start -- --headless=false` para una ventana visible. Inícialo una vez
por sesión; las llamadas posteriores a la CLI reutilizan el daemon en segundo plano. Volver a iniciarlo
reinicia ese daemon. Estas sesiones usan un perfil temporal de Chrome; la tarea de inicio deshabilita
la telemetría de uso de herramientas y las subidas de URL a CrUX. Detén la sesión cuando termines.
Usa `mise run browser:cli -- --help` para los comandos originales.


## Guía de implementación web moderna [#modern-web-implementation-guidance]

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) de Google
complementa la inspección del navegador con guías de implementación para HTML/CSS nativos,
formularios, accesibilidad, rendimiento, passkeys y compatibilidad entre navegadores. El skill
principal `modern-web-guidance` está instalado para ambos agentes. El skill separado
`chrome-extensions` se omite porque este proyecto es un servicio web y una UI.

```sh
mise run web:guidance -- search "animate a dialog modal backdrop"
mise run web:guidance -- retrieve "GUIDE_ID_FROM_SEARCH"
mise run web:guidance -- list
```

Usa la tarea `web:guidance` fijada localmente en este repo en lugar de los ejemplos
`npx modern-web-guidance@latest` del skill original. `packages:upgrade` actualiza la CLI;
`skills:install` restaura el skill fijado por commit. El instalador `skills` alternativo de Google
mantiene nuestra estructura existente de `.agents` y `.claude` sin un segundo instalador ni
actualizaciones automáticas de skills. La tarea de mise deshabilita la telemetría de uso. Si
una búsqueda no devuelve resultados, usa `list` para explorar los IDs de guías. La compatibilidad de
navegadores usa por defecto la política **Baseline Widely available** del skill, con fallbacks
para funciones más nuevas.


## Observabilidad de Cloudflare [#cloudflare-observability]

[El plan de observabilidad](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/observability.md) cubre logs, trazas, métricas,
salud de D1, registros de auditoría de auth duraderos, correlación, dashboards y alertas.
`wrangler.jsonc` habilita los logs/trazas y la redacción de query de URL para el Worker de la GUI.
Una entrada del Worker de la GUI ahora emite IDs de solicitud, estado y tiempos sin registrar URLs,
cabeceras ni cookies. D1 y la autenticación no están implementados.

```sh
mise run cf:logs -- --help
mise run cf:errors -- --help
```

Ambas tareas usan el Worker configurado; `cf:logs` también acepta un nombre de Worker explícito.
`cf:errors` filtra los fallos de invocación del Worker, no todas las respuestas de error HTTP. El almacenamiento
de auditoría duradero, los dashboards y la entrega de alertas son trabajo pendiente en el plan de observabilidad.

### Las respuestas de la documentación en Cloudflare: AI Search y AI Gateway [#the-docs-answers-on-cloudflare-ai-search-and-ai-gateway]

Dos productos de Cloudflare están detrás de Ask AI de la documentación (el Worker de docs), y es fácil confundirlos:

- **AI Search** es el índice (`remy-docs-pages`). Lee los docs directamente desde el bucket R2
  `remy-docs` (un archivo Markdown por página de docs e idioma, `<site>/<lang>/<page>.md`, sincronizado cada hora
  y cuando `docs:publish` lo solicita), encuentra los pasajes que coinciden con una pregunta y le pide a un modelo de Workers AI
  que escriba la respuesta.
- **R2** contiene los archivos que lee AI Search. `docs:publish` hace que el bucket contenga exactamente
  las páginas de docs: coloca cada una y elimina cualquier otra cosa, así que una página eliminada también
  deja de estar en las respuestas.
- **AI Gateway** es el medidor delante del modelo. Cada llamada al modelo que hace AI Search pasa por
  él (`remy-docs`), y registra cada una con su costo, tokens y tiempo (y la pregunta). No contiene
  docs. Los límites de gasto y de tasa viven aquí; `docs:observe -- ai-usage` y `-- ai-check` lo leen.

Local o remoto: las páginas de docs, el panel de Ask AI y todas las comprobaciones se ejecutan
localmente; las respuestas solo existen en Cloudflare (AI Search no tiene versión local).
Cada tarea `docs:*` y `cf:*` indica LOCAL o REMOTE (y PRODUCTION) en `mise tasks`.

```sh
mise run docs:publish                      # REMOTE, PRODUCTION: bucket = docs pages, sync, fixed questions (docs:deploy runs it)
CLOUDFLARE_ENV=ask mise run docs:dev       # LOCAL docs Worker, answers from the live index
mise run docs:answers:off                  # REMOTE, PRODUCTION: emergency stop, seconds, no build
mise run docs:answers:on                   # REMOTE, PRODUCTION: resume (confirms)
mise run docs:observe -- ai-check          # REMOTE, read only: AI Search, AI Gateway, answers paused or not
mise run docs:ai-gateway                   # REMOTE: the gateway's settings
mise run docs:ai-gateway -- rate-limit off # REMOTE: change a setting (read back after); also logs on|off
```

Tokens: consulta [secretos](#secrets-fnox) más abajo.

Costos: la indexación son unos pocos embeddings (una reindexación completa, unos $0.0005); una búsqueda
sin respuesta, casi nada; una respuesta entre $0.0001 y $0.0007, y $0 cuando la caché de AI Search ya la tiene.

Historial almacenado y las respuestas de IA, de solo lectura, desde las propias APIs de Cloudflare. El
Worker, su instancia de AI Search y el AI Gateway de esa instancia provienen de `wrangler.jsonc`, así que
una app que lo incluya obtiene el suyo propio:

```sh
mise run cf:events                      # Workers Logs, last 24 h: counts by event and level, latest 10
mise run cf:events -- ask --since 7d --limit 20   # one per question: outcome, time, citations
mise run cf:ai-usage                    # AI Gateway, last 7 days: calls, cache, failures, tokens, cost, time
mise run cf:ai-check                    # AI Search and gateway settings against Cloudflare's advice; fails on FAIL
```

### Secretos: fnox [#secrets-fnox]

El login de Wrangler cubre los despliegues, AI Search y los secretos del Worker, pero no se le puede
otorgar acceso a AI Gateway ni a Workers Logs. Para eso, las tareas leen tokens del entorno:

- `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`: el token y la cuenta de Cloudflare compartidos, los
  mismos elementos del llavero en todos los repositorios de joeblew999. [`fnox.toml`](https://github.com/joeblew999/remy-auth/blob/main/fnox.toml) los
  nombra (los valores se quedan en el llavero de macOS, nunca en el archivo); `fnox` está fijado en
  `mise.toml`. Ejecuta una tarea con ellos: `fnox exec -- mise run cf:ai-usage` (`docs:observe` y
  `docs:ai-gateway` se ejecutan a través de fnox por sí mismos). Guarda uno con
  `fnox set -p keychain CLOUDFLARE_API_TOKEN <token>` (nunca omitas `-p keychain`: sin él el valor se
  escribe en `fnox.toml` en texto plano). Lee Workers Logs y AI Gateway, así que necesita
  **Workers Observability Read** y **AI Gateway Edit**; AI Search se lee con el login de Wrangler.

Un solo token lo hace todo (el token `dev` en <https://dash.cloudflare.com/profile/api-tokens>): **AI Gateway
Edit** (que incluye lectura) y **Workers Observability Read** son los que estas tareas necesitan; cambiar
el gateway con `cf:ai-gateway` usa el mismo token, y cada cambio se lee de vuelta.
