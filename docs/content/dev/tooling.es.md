---
title: "Referencia de herramientas de desarrollo"
description: "La referencia de herramientas de desarrollo: los scripts de package.json y los comandos de remy, herramientas fijadas, secretos, skills de agentes y los servicios de Cloudflare detrás de la documentación."
---

## Las herramientas [#the-tooling]

```sh
npm run                   # cada script, con lo que ejecuta
npm run setup             # los skills fijados, MCP, el guard del flujo, las comprobaciones de la instalación
npm run auth -- --help    # la CLI de Better Auth
npm run wrangler -- --help
npm run auth:info
```

`package.json` es la entrada, como en cualquier proyecto TypeScript: sus scripts ejecutan cada comando del proyecto.
Node está fijado por `.node-version` y por el `engines` de `package.json`; cada herramienta es una dependencia de
`@joeblew999/remy-ui`, de modo que cada app que instala el paquete obtiene las mismas versiones sin un pin
propio: Wrangler, Playwright, TypeScript, las herramientas de Chrome DevTools, la CLI de Modern Web Guidance y la
CLI de Codex. `gh` es el de la máquina, y Claude Code (el traductor) es el propio de la máquina, aquel en el que
está iniciada la sesión de la suscripción. Un script que es una sola herramienta se escribe como esa herramienta (`"logs": "wrangler
tail --format json"`); todo lo que tenga lógica es TypeScript, un comando `remy` del paquete
(`packages/ui/src/cli`, con comprobación de tipos en cada check) o, para lo que es propio de una sola app, un `scripts/*.ts` de
esa app ([el plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/tooling-in-typescript.md)).
`npx remy verify doctor` imprime las versiones de las CLI que ejecutan las herramientas.

Better Auth se ejecuta en el propio Worker de remy-auth sobre una base de datos D1 (`DB` en `wrangler.jsonc`), con sus
opciones en `src/auth/options.ts`. Sus scripts son propios de remy-auth, en `package.json`:

```sh
npm run auth:generate -- <name>        # LOCAL: what the options need beyond migrations/, as the next numbered migration
npm run auth:migrate                   # LOCAL: apply migrations/ and migrations-demo/ to Wrangler's local D1 databases
npm run local                          # LOCAL: .dev.vars when missing, the migrations, the guard's fixture (dev, build and start run it)
npm run auth:mail -- you@example.com   # LOCAL: the sign-in codes captured for an address, from the running Worker
npm run auth:provision                 # Prints what the deployed sign-in needs on Cloudflare; creates nothing
```

`npm run local` (el script "local" de la app, que `npm run dev`, `npm run build` y `dev:start` ejecutan
primero) escribe `.dev.vars`, aplica las migraciones e instala el fixture de oRPC v1 del guard (`tests/guard/v1`),
de modo que dev, preview y cada comprobación arrancan con el esquema actual sin nada que recordar.
`auth:generate` ejecuta la CLI fijada a través de `src/auth/cli.ts`, que compara las opciones con una base
de datos SQLite desechable construida a partir de `migrations/`, así que solo escribe lo que aún no está
ahí; cambia las opciones y luego genera, nunca edites a mano las tablas de Better Auth. Para iniciar
sesión localmente: `npm run dev`, abre `/en/app/account` y pulsa sobre una de las personas
de ejemplo, o introduce cualquier dirección y lee su código con `auth:mail`. No se envía ningún correo
localmente: el entorno local lo guarda en el buzón de salida del Worker en su lugar (la tabla de
entornos en `src/auth/environment.ts`, [explicado](./auth.md#environments-one-table); staging también
tiene a las personas de ejemplo y envía correo de verdad; cualquier otro entorno es producción, donde
el correo se envía a través de Cloudflare Email Service y no hay nadie de ejemplo). La base de datos
desplegada, sus migraciones y el secreto de Worker `BETTER_AUTH_SECRET` solo se crean a petición del
propietario: `auth:provision` imprime los pasos, y hasta que la base de datos exista, el despliegue se
niega, porque de otro modo Wrangler la crearía por sí misma.

Estas son herramientas para desarrolladores/operadores. El inicio de sesión de la CLI de Remy para usuarios finales y las llamadas
delegadas a la API siguen siendo parte del hito del servicio. Ambas apps están en vivo en Cloudflare; el despliegue a producción sube a
`origins.production` en [remy.config.ts](https://github.com/joeblew999/remy-auth/blob/main/remy.config.ts), y `dev:promote` lo ejecuta, solo a petición del propietario.

### Actualizaciones de paquetes [#package-upgrades]

```sh
npm run packages -- check            # Preview available updates
npm run packages -- upgrade          # Apply latest versions, including majors, then the installation's checks
```

### Los scripts y los comandos [#the-scripts-and-commands]

Todas las apps que usan el paquete tienen los mismos scripts; `npm run` los lista. El flujo y las herramientas manuales son
scripts; el resto son comandos `remy` (`npx remy <command>`), un módulo cada uno en `packages/ui/src/cli`:
`npx remy help` lista todos los comandos, una línea cada uno, y un comando ejecutado sin argumentos dice
cuáles son los suyos (`npx remy docs`).

| Scripts y comandos | Propósito |
| --- | --- |
| `npm run dev:status`, `dev:start`, `dev:change`, `dev:land`, `dev:promote`, `dev:release`, `dev:done` | El flujo ([cómo trabajamos](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest)) |
| `npm run dev`, `build`, `preview` | La app: recarga en caliente, la build de producción con un dry run de Wrangler, el Worker compilado en el puerto de preview ([la GUI](./gui.md)) |
| `npm run test -- every\|quick\|only <words>\|smoke\|google\|cwv\|remote\|live\|consumers\|report` | Las comprobaciones de navegador en cada nivel; la suite es la de GitHub tras un landing, `only <words>` es la única ejecución que un paso no controla |
| `npm run check -- [plans\|single-copies\|routes\|types\|unit\|translations\|docs]` | La comprobación (`dev:change`), o una parte de ella |
| `npm run setup`, `npx remy verify [setup\|tooling\|doctor]`, `npm run upgrade -- <version>` | Una instalación: sus comprobaciones, los invariantes de las herramientas, las versiones de las CLI; llevar una app a un release |
| `npm run packages -- check\|upgrade\|pack\|notes\|bumped\|publish\|tag\|release` | Un repositorio que publica paquetes ([la línea de comandos](./tasks.md#a-repository-that-publishes-packages)) |
| `npx remy cloudflare deploy\|staging\|docs-deploy\|versions\|urls\|preview\|preview-delete` | Despliegues, qué está ejecutando cada uno, las URL de las páginas de una app, un Worker de comprobación desechable ([la línea de comandos](./tasks.md#cloudflare)) |
| `npm run logs`, `errors`, `wrangler`, `npm run observe -- events\|ai-usage\|ai-check\|gateway` | Logs en vivo, la CLI de Cloudflare, logs almacenados y el uso, la configuración y el gateway de la IA (más abajo) |
| `npm run docs -- dev\|build\|check\|test [remote]\|preview\|answers on\|off\|publish\|questions\|provision\|init\|observe` | El Worker de documentación, de `@joeblew999/remy-ui`, sobre el `docs/` de una app ([escribir docs](./writing-docs.mdx)); solo remy-auth: `npm run docs:cli`, la CLI de Fumadocs en el paquete |
| `npx remy i18n check [messages\|docs] [--list]`, `i18n translate` | Traducciones: las comprobaciones sin conexión (un aviso en el check, la puerta de control en un release), el único redactor que `dev:land` ejecuta en main ([un solo redactor](./how-we-work.md#translations-one-writer)) |
| `npm run plans -- status\|check\|close\|park\|open` | La regla de los planes ([planes](./how-we-work.md#plans-few-short-closed)) |
| `npx remy skills install\|list\|remove`, `npx remy mcp register\|verify\|status`, `npx remy rules` | Los skills de agentes fijados, el registro de MCP, el bloque de reglas en el `AGENTS.md` de una app (más abajo) |
| `npm run shots -- <page> [--phone] [--dark] [--all] [--video]`, `npm run browser`, `browser:start`, `browser:stop`, `npm run web` | Capturas de pantalla, la CLI y la sesión de Chrome DevTools, Modern Web Guidance (más abajo) |
| `npm run api -- spec [origin] [--urls]` | El documento OpenAPI que sirve un Worker en ejecución |
| `npm run codex`, `codex:resume`, `claude`, `claude:resume` | Inicia o reanuda una sesión de agente (más abajo) |
| Propios de remy-auth: `npm run auth…`, `ui:components`, `ui:blocks`, `ui:theme`, `ui:verify`, `ui:version`, `template:check`, `release-checks`, `generate`, `local`, `test:consumers` | Better Auth, los archivos de shadcn, las comprobaciones propias del release, lo que este repositorio genera y prepara |

`npm run packages -- upgrade` usa el `npm-check-updates` fijado localmente para mover las
dependencias npm más allá de los pins de versión existentes, guarda las versiones exactas, las instala y
refresca `package-lock.json`, y luego ejecuta las comprobaciones de la instalación.
Los conflictos de peer fallan visiblemente; el comando no usa `--force` ni `--legacy-peer-deps`
de npm. Revisa el diff del manifiesto/lockfile y cualquier requisito de migración de versión mayor.
Si la instalación falla tras actualizar el manifiesto, resuelve el conflicto reportado antes de
usar `npm run setup`; ningún rollback automático descarta tus cambios.
Las dependencias del workspace también se actualizan; las referencias locales `@joeblew999/remy-ui` y `@joeblew999/remy-auth-contract` se excluyen
de las actualizaciones del registro. Los pins de Node y de las fuentes de skills se gestionan por separado.

### Verificación [#verification]

El flujo son cuatro pasos: `dev:change` (la comprobación, en segundos, después de cada cambio),
`dev:land` (commit, main, push, staging; GitHub ejecuta las comprobaciones pesadas), `dev:promote`
(producción) y `dev:release`, con `dev:start` y `dev:done` alrededor de una pieza de trabajo y
`dev:status` para mirar; una puerta en cada comando pesado se niega a ejecutarlo
fuera de ellos. La regla está en
[cómo trabajamos](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest), los comandos en
[la línea de comandos](./tasks.md).

`npx remy verify` es la puerta del release: `dev:release` lo ejecuta. Una instalación termina con
`npx remy verify setup` (`npm run setup`, `npm run packages -- upgrade` y `npm run upgrade` lo ejecutan): alrededor de
un minuto, sin navegador. Nadie ejecuta la puerta mientras programa (`dev:change` es la comprobación); a mano, a
propósito, es `REMY_FLOW=hand npx remy verify`. Las comprobaciones de la instalación son las dependencias frente al
lockfile, el registro de MCP, el guard del flujo, las versiones de las CLI, los invariantes de las herramientas (`npx remy verify
tooling`: cada `package.json` coincide con el lockfile, la configuración de Wrangler mantiene los previews desactivados y la
observabilidad activada, los workflows nombran solo scripts que existen, cada skill instalado proviene de una
fuente fijada con su enlace de Claude), y luego el check. Usan la instalación local existente y
no aprovisionan recursos de Cloudflare. Después la puerta ejecuta cada comprobación de navegador propia en cada
idioma (`npm run test -- every`) contra el artefacto de producción en Workers locales usando el Chrome instalado,
y luego el fixture de consumidor. Las auditorías de Google no están incluidas: `npm run test -- google` y
`npm run test -- cwv`, que el release ejecuta después. No se realiza ningún despliegue. Consulta [la prueba de la GUI](./gui.md) para el alcance y los comandos.


## Iniciar o recargar tu agente [#start-or-reload-your-agent]

### Extensión de Codex para VS Code [#vs-code-codex-extension]

Abre este repositorio en VS Code y usa la barra lateral de Codex. La extensión incluye
su propio ejecutable; la instalación de la CLI npm del proyecto sirve a los usuarios de terminal.
[La CLI de Codex y la extensión de IDE comparten la configuración de MCP](https://developers.openai.com/learn/docs-mcp).
Nuestro registro de proyecto escribe `.codex/config.toml`; confía en el proyecto en Codex
para que la configuración del proyecto pueda cargarse. El `.vscode/mcp.json` de VS Code configura
su propio cliente MCP y no es el archivo de configuración de la extensión de Codex.

Después de cambiar los skills o la configuración de MCP:

1. Ejecuta `npx remy mcp register` en la terminal del repositorio.
2. Guarda tu trabajo, abre la paleta de comandos (`Cmd+Shift+P` en macOS) y ejecuta
   **Developer: Reload Window**.
3. Vuelve a abrir la barra lateral de Codex y continúa la conversación. Verifica que el agente
   pueda llamar a las herramientas recién configuradas; el registro por sí solo no demuestra una conexión.

`npm run codex:resume` lanza una sesión de terminal; no recarga la extensión.
La CLI `code` instalada no tiene un flag documentado de reload-window, así que la recarga usa
el comando integrado de VS Code en lugar de un wrapper de shell que simule reiniciarla.

### Agentes de terminal [#terminal-agents]

Después de `npm run setup`, usa la CLI instalada de Codex o Claude Code:

```sh
npm run codex             # New Codex conversation
npm run codex:resume      # Resume latest Codex conversation in this project
npm run claude            # New Claude conversation
npm run claude:resume     # Resume latest Claude conversation in this project
```

Para recargar los skills y la configuración de MCP, sal del agente actual con `/exit` y luego
ejecuta su script `:resume` desde tu terminal. Usa `/mcp` dentro del agente para comprobar la
conexión. Pasa opciones adicionales originales después de `--`, por ejemplo
`npm run codex -- --help`. La configuración instala localmente la [`@openai/codex` CLI](https://learn.chatgpt.com/docs/codex/cli)
oficial y fijada, y los scripts de Codex usan ese ejecutable directamente en lugar de
depender del PATH de tu shell.
`npm run packages -- upgrade` la actualiza junto con las demás dependencias. Autentícate cuando
se te solicite. Claude Code se instala por separado; lanzar Codex no lo requiere.


## Skills de agentes [#agent-skills]

Las fuentes de los skills son los `pins` de
[packages/ui/src/cli/skills.ts](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/cli/skills.ts): Better Auth, Cloudflare, Chrome DevTools, Modern Web
Guidance, shadcn, Playwright CLI, GitHub release y TanStack Router/Start. Los skills de TanStack están
nombrados uno por uno, incluido su skill `react-router` (los bindings de React), que reemplazó al
skill de Remix con el mismo nombre: los skills se instalan planos por nombre, así que los dos no pueden
coexistir. Los skills de TanStack Form no están instalados: solo existen en sus ramas alpha de v2 y
describen la API alpha 2.0, no la 1.x que fijamos; añádelos cuando pasemos a Form 2. Instala los skills localmente:

```sh
npx remy skills install
npx remy skills list
```

Para reinstalar desde cero, ejecuta `npx remy skills remove` y luego `npx remy skills install`.

Skills viven en `.agents/skills/`; `.claude/skills/` enlaza a los mismos archivos.

### El skill `remy`: las reglas de la plataforma para los agentes de cada repositorio [#the-remy-skill-the-platforms-rules-for-every-repos-agents]

Además de los skills fijados, `remy skills install` instala `remy` desde el paquete instalado
(`./node_modules/@joeblew999/remy-ui/skills`), así que su versión es la del paquete. Se
genera a partir de estos docs de desarrollo (cómo trabajamos, los principios, las herramientas, la línea de
comandos, el paquete de UI, cómo escribir docs, la GUI) mediante el script `generate` de remy-auth, que ejecuta cada
empaquetado y publicación (`packages/ui/skill.mjs`); los docs siguen siendo la única fuente. En una app,
`npx remy rules` mantiene un bloque marcado en `AGENTS.md` que dirige a sus agentes hacia el skill y
nombra la versión; `npm run setup` y `npm run upgrade` lo ejecutan, así que una actualización cambia las
reglas que leen los agentes en el mismo paso. El propio `AGENTS.md` de remy-auth es un puntero a
[Agentes: empieza aquí](./agents.md).
El instalador registra la procedencia en `skills-lock.json`. Volver a ejecutar la instalación
restaura los skills seleccionados desde las fuentes fijadas; actualiza sus commits de fuente deliberadamente
para adoptar cambios upstream. Solo se hace commit de `skills-lock.json`; los skills instalados y sus
enlaces de Claude están ignorados y se recrean con `npm run setup` o `npx remy skills install`.
`npx remy skills list` muestra lo que está instalado; [el plan de skills](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/agent-skills.md)
hace seguimiento de las dependencias sin un skill oficial. Recarga una sesión de agente existente
si los skills recién instalados aún no son visibles.

Para añadir una fuente, solo de los propios mantenedores de la biblioteca:

1. Fíjala en `pins` en `packages/ui/src/cli/skills.ts` como
   `https://github.com/<owner>/<repo>/tree/<commit>`, usando el
   commit de `git ls-remote https://github.com/<owner>/<repo> HEAD`, nombrando los skills que se van a tomar
   en lugar de `'*'` cuando el repositorio también incluya skills solo para contribuidores.
2. Ejecuta `npx remy skills remove`, `npx remy skills install` y `npx remy verify tooling`
   (segundos), que lee los pins y rechaza los skills instalados desde fuentes no fijadas.


## Registro de MCP [#mcp-registration]

Los skills proporcionan instrucciones y flujos de trabajo; MCP proporciona herramientas invocables. Chrome
DevTools usa ambos. Modern Web Guidance usa su CLI, y muchos skills de auth/Cloudflare
también funcionan a través de las CLI existentes; un skill no requiere automáticamente
un servidor MCP.

```sh
npx remy mcp register   # Also runs during npm run setup
npx remy mcp verify     # Also runs in the installation's checks
npx remy mcp status     # Requires both Codex and Claude CLIs
```

El registro (`packages/ui/src/cli/mcp.ts`) escribe la entrada `chrome-devtools` en
`.codex/config.toml` y `.mcp.json`, locales del proyecto. Cada cliente lanza el `chrome-devtools-mcp`
propio de la app (aislado, headless, telemetría desactivada) con una ruta absoluta. Los archivos generados
contienen rutas específicas de la máquina y están en gitignore; vuelve a ejecutar el registro después de mover el checkout.
Los ajustes y servidores no relacionados se conservan. Los archivos existentes modificados
reciben una copia de recuperación `.bak`; la serialización TOML puede normalizar el formato y los comentarios.

El servidor usa el paquete de npm fijado, un perfil de Chrome headless aislado, y tiene
desactivadas la telemetría de herramientas y las subidas a CrUX. El proceso MCP es independiente de la
sesión `browser:start`/`browser:stop` de la CLI; el cliente del agente gestiona su ciclo de vida.

Recarga el agente después del registro. Codex solo carga la configuración del proyecto en un
proyecto de confianza. Claude puede mostrar **Pending approval** para un nuevo servidor MCP del proyecto;
revísalo en la interfaz `/mcp` de Claude. El registro no evita la confianza del cliente ni los ajustes
de aprobación. Consulta [la configuración de MCP de Codex](https://developers.openai.com/codex/mcp)
y [los ámbitos de MCP de Claude](https://code.claude.com/docs/en/mcp).

`remy mcp verify` comprueba la configuración, no una conexión en vivo. `remy mcp status` muestra lo que
ven los clientes (Claude también comprueba la conectividad de los servidores aprobados).


## Herramientas de navegador [#browser-tooling]

Las [herramientas de agente de Chrome DevTools](https://developer.chrome.com/docs/devtools/agents) de Google
ofrecen interacción con el navegador, capturas de pantalla, inspección de accesibilidad, depuración de
red/cookies, Lighthouse y análisis de rendimiento. Instala Google Chrome por separado; la configuración
del proyecto no instala el navegador. La CLI es experimental y está fijada junto con las demás herramientas
npm, así que `npm run packages -- upgrade` también la actualiza.

```sh
npm run browser:start                           # Isolated, headless Chrome session
npm run browser -- new_page http://localhost:3000
npm run browser -- list_pages
npm run browser -- take_snapshot 1              # Use the returned page ID
npm run browser -- click 1 "UID_FROM_SNAPSHOT"
npm run browser:stop
```

Ejecuta `npm run browser:start -- --headless=false` para una ventana visible. Inícialo una vez
por sesión; las llamadas posteriores a la CLI reutilizan el daemon en segundo plano. Volver a iniciarlo
reinicia ese daemon. Estas sesiones usan un perfil temporal de Chrome; el script de inicio deshabilita
la telemetría de uso de herramientas y las subidas de URL a CrUX. Detén la sesión cuando termines.
Usa `npm run browser -- --help` para los comandos originales.


## Guía de implementación web moderna [#modern-web-implementation-guidance]

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) de Google
complementa la inspección del navegador con guías de implementación para HTML/CSS nativos,
formularios, accesibilidad, rendimiento, passkeys y compatibilidad entre navegadores. El skill
principal `modern-web-guidance` está instalado para ambos agentes. El skill separado
`chrome-extensions` se omite porque este proyecto es un servicio web y una UI.

```sh
npm run web -- search "animate a dialog modal backdrop"
npm run web -- retrieve "GUIDE_ID_FROM_SEARCH"
npm run web -- list
```

Usa el script `web` fijado localmente en este repo en lugar de los ejemplos
`npx modern-web-guidance@latest` del skill original. `npm run packages -- upgrade` actualiza la CLI;
`npx remy skills install` restaura el skill fijado por commit. El instalador `skills` alternativo de Google
mantiene nuestra estructura existente de `.agents` y `.claude` sin un segundo instalador ni
actualizaciones automáticas de skills. Si una búsqueda no devuelve resultados, usa `list` para explorar los IDs de guías.
La compatibilidad de navegadores usa por defecto la política **Baseline Widely available** del skill, con fallbacks
para funciones más nuevas.


## Observabilidad de Cloudflare [#cloudflare-observability]

[El plan de observabilidad](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/observability.md) cubre logs, trazas, métricas,
salud de D1, registros de auditoría de auth duraderos, correlación, dashboards y alertas.
`wrangler.jsonc` habilita los logs/trazas y la redacción de query de URL para el Worker de la GUI.
Una entrada del Worker de la GUI ahora emite IDs de solicitud, estado y tiempos sin registrar URLs,
cabeceras ni cookies. Los registros de auditoría duraderos del inicio de sesión no están implementados.

```sh
npm run logs -- --help
npm run errors -- --help
```

Ambos usan el Worker configurado; `npm run logs` también acepta un nombre de Worker explícito.
`npm run errors` filtra los fallos de invocación del Worker, no todas las respuestas de error HTTP. El almacenamiento
de auditoría duradero, los dashboards y la entrega de alertas son trabajo pendiente en el plan de observabilidad.

### Las respuestas de la documentación en Cloudflare: AI Search y AI Gateway [#the-docs-answers-on-cloudflare-ai-search-and-ai-gateway]

Dos productos de Cloudflare están detrás de Ask AI de la documentación (el Worker de docs), y es fácil confundirlos:

- **AI Search** es el índice (`remy-docs-pages`, el de remy-auth; cada nombre aquí es el `ask` de
  `docs.config.ts`). Lee los docs directamente desde el bucket R2
  `remy-docs` (un archivo Markdown por página de docs e idioma, `<site>/<lang>/<page>.md`, sincronizado cada hora
  y cuando `docs publish` lo solicita), encuentra los pasajes que coinciden con una pregunta y le pide a un modelo de Workers AI
  que escriba la respuesta.
- **R2** contiene los archivos que lee AI Search. `docs publish` hace que el bucket contenga exactamente
  las páginas de docs: coloca cada una y elimina cualquier otra cosa, así que una página eliminada también
  deja de estar en las respuestas.
- **AI Gateway** es el medidor delante del modelo. Cada llamada al modelo que hace AI Search pasa por
  él (`remy-docs`), y registra cada una con su costo, tokens y tiempo (y la pregunta). No contiene
  docs. Los límites de gasto y de tasa viven aquí; `npm run docs -- observe ai-usage` y `ai-check` lo leen.

Local o remoto: las páginas de docs, la página de Ask AI y todas las comprobaciones se ejecutan
localmente; las respuestas solo existen en Cloudflare (AI Search no tiene versión local).
Cada comando indica en su comentario de cabecera si es local o remoto (y si es de producción).

```sh
npm run docs -- publish                          # REMOTE, PRODUCTION: bucket = docs pages, the index's sync waited for, then the fixed questions (dev:promote runs it)
npm run docs -- questions                        # REMOTE: the fixed questions alone (docs/content/questions.json), search only, no answer written
CLOUDFLARE_ENV=ask npm run docs -- dev           # LOCAL docs Worker, answers from the live index
npm run docs -- answers off                      # REMOTE, PRODUCTION: emergency stop, seconds, no build
npm run docs -- answers on                       # REMOTE, PRODUCTION: resume
fnox exec -- npm run docs -- observe ai-check    # REMOTE, read only: AI Search, AI Gateway, answers paused or not
fnox exec -- npm run docs -- observe gateway     # REMOTE: the gateway's settings
fnox exec -- npm run docs -- observe gateway rate-limit off   # REMOTE: change a setting (read back after); also logs on|off
```

Tokens: consulta [secretos](#secrets-fnox) más abajo.

Costos: la indexación son unos pocos embeddings (una reindexación completa, unos $0.0005); una búsqueda
sin respuesta, casi nada; una respuesta entre $0.0001 y $0.0007, y $0 cuando la caché de AI Search ya la tiene.

Ask AI es una decisión de cada app: el `ask` de `docs.config.ts` nombra su instancia de AI Search, su
bucket R2, su AI Gateway y su espacio de nombres de límite de tasa, y la configuración de Cloudflare del
Worker de docs se genera a partir de él (`docs/.remy-docs/wrangler.json`). Sin `ask`, la documentación no
tiene página, botón ni bindings de Ask AI. `npm run docs -- provision` imprime los comandos que crean los
recursos de una app y no crea nada: eso cuesta dinero y es cosa del propietario.

Historial almacenado y las respuestas de IA, de solo lectura, desde las propias APIs de Cloudflare. El
Worker, su instancia de AI Search y el AI Gateway de esa instancia provienen de su configuración de Wrangler, así que
una app que lo incluya obtiene el suyo propio:

```sh
fnox exec -- npm run observe -- events                      # Workers Logs, last 24 h: counts by event and level, latest 10
fnox exec -- npm run observe -- events ask --since 7d --limit 20   # one per question: outcome, time, citations
fnox exec -- npm run observe -- ai-usage                    # AI Gateway, last 7 days: calls, cache, failures, tokens, cost, time
fnox exec -- npm run observe -- ai-check                    # AI Search and gateway settings against Cloudflare's advice; fails on FAIL
```

### Secretos: fnox [#secrets-fnox]

El login de Wrangler cubre los despliegues, AI Search y los secretos del Worker, pero no se le puede
otorgar acceso a AI Gateway ni a Workers Logs. Para eso, los comandos leen tokens del entorno:

- `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`: el token y la cuenta de Cloudflare compartidos, los
  mismos elementos del llavero en todos los repositorios de joeblew999. [`fnox.toml`](https://github.com/joeblew999/remy-auth/blob/main/fnox.toml) los
  nombra (los valores se quedan en el llavero de macOS, nunca en el archivo); `fnox` es el de la máquina.
  Ejecuta un comando con ellos: `fnox exec -- npm run observe -- ai-usage`. Guarda uno con
  `fnox set -p keychain CLOUDFLARE_API_TOKEN <token>` (nunca omitas `-p keychain`: sin él el valor se
  escribe en `fnox.toml` en texto plano). Lee Workers Logs y AI Gateway, así que necesita
  **Workers Observability Read** y **AI Gateway Edit**; AI Search se lee con el login de Wrangler.

Un solo token lo hace todo (el token `dev` en <https://dash.cloudflare.com/profile/api-tokens>): **AI Gateway
Edit** (que incluye lectura) y **Workers Observability Read** son los que estos comandos necesitan; cambiar
el gateway con `observe gateway` usa el mismo token, y cada cambio se lee de vuelta.
