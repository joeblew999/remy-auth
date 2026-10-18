---
title: "Referencia de herramientas de desarrollo"
description: "Las herramientas detrás de los comandos: dónde se explica cada área, herramientas fijadas, secretos, skills de agentes y los servicios de Cloudflare detrás de la documentación. Todos los comandos están en Comandos."
translatedFrom: "cccfd094 05929bce 14fa0896 70fe6514 81343dbe 766a0ddf ec3067e7 03919f95 f3b472f8 36cc5dee a9201e80 532209f9 c9aa85c0 e9ec8ccd a5cad7e7 68c1a5a6 5ee1f825"
---

## Las herramientas [#the-tooling]

El repositorio es un monorepo estándar de Vite Plus, tal como lo crea `vp create vite:monorepo`, sobre pnpm: cada comando
del proyecto es una tarea escrita en el `vite.config.ts` de su paquete o un script del `package.json` de la raíz, que se ejecuta como
`vp run <name>`. Node está fijado por `.node-version` y por el `engines` de `package.json`, pnpm por `devEngines` (12.14.0,
que `vp install` descarga y ejecuta). Cada versión se escribe una sola vez, en el catálogo de `pnpm-workspace.yaml`, y cada
paquete enumera lo que importa (`catalog:`, o `workspace:*` para un paquete de este repositorio), con `pnpm-lock.yaml`
junto a él; las herramientas que ejecutan las tareas compartidas (Wrangler, Playwright, las herramientas de Chrome DevTools, la CLI de Modern Web Guidance,
la CLI de Codex, npm-check-updates) son dependencias de `@joeblew999/remy-cli`, de modo que todas las apps obtienen las mismas.
`vp migrate --full` no informa de nada que cambiar y `vp env doctor` pasa. `gh` es el de la máquina, y Claude Code (el traductor) es el propio de la máquina, aquel en el que
está iniciada la sesión de la suscripción. Un script que es una sola herramienta se escribe como esa herramienta (`"logs": "wrangler
tail --format json"`); todo lo que tenga lógica es TypeScript, un comando `remy` del paquete
(`packages/remy-cli/src`, con comprobación de tipos en cada check) o, para lo que es propio de una sola app, un `scripts/*.ts` de
esa app ([el plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/tooling-in-typescript.md)).
`pnpm remy verify doctor` imprime las versiones de las CLI que ejecutan las herramientas.

### Vite Plus: el `vp` de la máquina, en modo gestionado [#vite-plus-the-machines-vp-in-managed-mode]

Vite Plus es una sola herramienta, y su comando es siempre `vp`. Se instala en dos lugares, cada uno con su propio trabajo:

| | En la máquina (global) | En el repositorio (local) |
| --- | --- | --- |
| Cómo llega | una vez por máquina: `curl -fsSL https://vite.plus \| bash` | el paquete `vite-plus` en `package.json`, en `node_modules` |
| Qué hace | elige Node y el gestor de paquetes: el Node que fija `.node-version` (26.10.0), el pnpm que fija `devEngines` | las herramientas: build, lint, formato, comprobación de tipos, tests, el ejecutor de tareas |
| Quién fija la versión | quien lo instaló | el repositorio, así que todas las máquinas obtienen la misma |

Tú solo escribes `vp`. El `vp` de la máquina pone en su sitio el Node fijado y luego ejecuta la versión de las herramientas que tiene el repositorio.
Toda máquina que trabaja con el repositorio (tu Mac, la nube de Claude, GitHub) tiene ambos, con el `vp` de la máquina en
**modo gestionado**; sin él, `node` es el que la máquina tenga por casualidad, y nada lo avisa.

```sh
curl -fsSL https://vite.plus | bash   # una vez por máquina: el vp global (di que sí a que gestione Node)
vp env on                             # modo gestionado: node sigue a .node-version
vp env current                        # debe decir: Version 26.10.0, Source .node-version, Mode managed
vp install                            # las dependencias, sobre ese Node
```

El instalador, ejecutado sin terminal (como lo ejecuta un agente), deja `vp` en modo **system-first**. En ese modo
el pin se ignora en silencio y cada comprobación se ejecuta con el Node de la máquina, así que revisa `vp env current` antes de
fiarte de cualquier resultado.

- **Las máquinas de la nube de Claude** empiezan vacías. El `.claude/settings.json` versionado ejecuta los cuatro pasos al
  inicio de cada sesión allí e informa del Node que obtuvo, así que nadie los ejecuta a mano.
- **Tu propia máquina (un Mac):** ejecutas los cuatro pasos una vez. Después, `node` pasa por `vp` en todos los
  proyectos, no solo en este: un proyecto con su propio `.node-version` obtiene ese Node; uno sin él obtiene el predeterminado
  de `vp` (la última LTS) en lugar del Node instalado antes. `vp env default <version>` fija ese predeterminado.
  El paso de sesión de `.claude/settings.json` no hace nada allí.
- **Un checkout hecho antes del 17 de octubre de 2026** tiene un `.claude/settings.json` escrito por el antiguo `remy guard` (entonces no
  se versionaba). Bórralo antes de hacer pull, o el pull se rechaza; luego `vp install`. El guard y los hooks de Claude
  nuestros han desaparecido; un `.claude/settings.local.json` que dejaron es de la máquina y le corresponde borrarlo.

Las instrucciones propias de Vite Plus para agentes se cargan en cada sesión de Claude desde el paquete instalado
(`CLAUDE.md` importa `node_modules/vite-plus/AGENTS.md`), y sus docs de la versión instalada están en
`node_modules/vite-plus/docs`: léelas antes de cambiar cómo se construye, comprueba o ejecuta cualquier cosa.

Better Auth se ejecuta en el propio Worker de remy-auth sobre una base de datos D1 (`DB` en `wrangler.jsonc`), con sus
opciones en `src/auth/options.ts` (ambos en `apps/remy-auth/`). Sus scripts son propios de la app, en
`apps/remy-auth/package.json`, y también lo es la tarea `local` (`apps/remy-auth/vite.config.ts`, que ejecuta el
`scripts/local.ts` de la app); desde la raíz cada una es `remy-auth#<name>`:

```sh
vp run remy-auth#auth:generate <name>        # LOCAL: lo que las opciones necesitan además de migrations/, como la siguiente migración numerada
vp run remy-auth#local                       # LOCAL: .dev.vars si falta, migrations/ y migrations-demo/ en las bases D1 locales de Wrangler, el fixture del guard
vp run remy-auth#auth:mail you@example.com   # LOCAL: los códigos de inicio de sesión capturados para una dirección, desde el Worker en ejecución
vp run remy-auth#auth:provision              # Imprime lo que el inicio de sesión desplegado necesita en Cloudflare; no crea nada
```

La tarea `local` (que `vp run dev`, `vp run build` y todo lo posterior ejecutan primero) escribe `.dev.vars`, aplica las migraciones e instala el fixture de oRPC v1 del guard (`tests/guard/v1`),
de modo que dev, preview y cada comprobación arrancan con el esquema actual sin nada que recordar. `auth:generate`
ejecuta la CLI fijada a través de `src/auth/cli.ts`, que compara las opciones con una base de datos
SQLite desechable construida a partir de `migrations/`, así que solo escribe lo que aún no está
ahí; cambia las opciones y luego genera, nunca edites a mano las tablas de Better Auth. Para iniciar
sesión localmente: `vp run dev`, abre `/en/app/account` y pulsa sobre una de las personas
de ejemplo, o introduce cualquier dirección y lee su código con `auth:mail`. No se envía ningún correo
localmente: el entorno local lo guarda en el buzón de salida del Worker en su lugar (la tabla de
entornos en `src/auth/environment.ts`, [explicado](./auth.md#environments-one-table);
staging, la Preview de cada rama, también tiene a las personas de ejemplo y envía correo de verdad; cualquier otro entorno es
producción, donde el correo se envía a través de Cloudflare Email Service y no hay nadie de ejemplo). Las bases de datos
desplegadas, sus migraciones y el secreto de Worker `BETTER_AUTH_SECRET` solo se crean a petición del
propietario: `auth:provision` imprime los pasos, y `pnpm remy cloudflare provisioned` se niega mientras un binding
nombre una base de datos que no existe, porque de otro modo el despliegue de Wrangler la crearía por sí mismo.

Estas son herramientas para desarrolladores/operadores. El inicio de sesión de la CLI de Remy para usuarios finales y las llamadas
delegadas a la API siguen siendo parte del hito del servicio. Ambas apps están en vivo en Cloudflare, en los orígenes del `.env` de la app
(`VITE_DEPLOY_ORIGIN`, `VITE_DOCS_ORIGIN`); un push a `main` las despliega ([en Cloudflare](./run-and-test.md#on-cloudflare)).

### Los scripts y los comandos [#the-scripts-and-commands]

Todas las apps tienen las mismas tareas y scripts, tal como los dispone `vp create vite:monorepo`; `vp run` los lista. Vite
Plus decide qué se ejecuta, en qué orden y qué hace innecesario una caché. Las tareas de cada paquete están escritas en su
propio `vite.config.ts` (`apps/remy-auth`, `apps/remy-auth-docs`, `packages/remy-ui`, `packages/remy-cli`; la copia
en blanco de una app, en `template/`), las comprobaciones del repositorio y `ready` en el de la raíz, y nada crea una tarea en código
(propietario, 2026-10-17: "in that configuration file of VP, you see everything"). `remyApp()` y `remyDocs()` devuelven solo
la configuración de Vite, y `@joeblew999/remy-ui/vite-plus` los ajustes compartidos simples (`style`, `network`). Cada tarea es
una herramienta: Vite, Wrangler, Playwright, `tsc`, `vp test`, `vp check`, o un comando `remy` para un trabajo para el que Vite Plus
no tiene herramienta (las comprobaciones propias del proyecto, los navegadores, el bloqueo de las auditorías). Nada nuestro ejecuta `vp run`
(una comprobación unitaria lo rechaza), y nada nuestro pasa un valor a través del entorno: los scripts del `package.json` de la raíz
(`ci`, `translate`, `release`, `setup`) son cada uno una cadena de hojas `remy` y tareas de Vite Plus escritas en
orden ([Comandos](./commands.mdx) imprime los pasos de cada uno). Los comandos propios de Vite Plus funcionan como en cualquier parte:
`vp install`, `vp dev`, `vp check`, `vp test`, `vp build`, `vp preview`, `vp run <name>`, `vp run -r build`.
`vp run --last-details` dice por qué cada tarea se ejecutó o vino de la caché; las entradas, salidas y entorno de una tarea están en
su configuración `cache`.

Los comandos `remy` y `remy-check` son de `@joeblew999/remy-cli` (`packages/remy-cli/src`, un módulo cada uno),
se publican con `@joeblew999/remy-ui` bajo la misma versión; en una app se ejecutan como `pnpm remy …`, y las
tareas de remy-auth los ejecutan desde el código fuente (`node packages/remy-cli/src/remy.ts`). `pnpm remy help` lista todos los comandos, una línea
cada uno, y un comando ejecutado sin argumentos dice los suyos (`pnpm remy docs`). Cada uno hace el único trabajo que nombra; ninguno
envuelve git, GitHub ni un despliegue (propietario, 2026-10-18: "No more crazy magic stuff").

Todos los scripts y comandos, con lo que hace cada uno, están en **[Comandos](./commands.mdx)**, generada a partir de la
propia línea de comandos, así que no puede quedar desactualizada; ninguna página los lista a mano. Dónde se explica cada área:

- El flujo y quién ejecuta cada paso: [cómo trabajamos](./how-we-work.md#the-flow-the-standard-way-in-plain-sight)
- La app, las comprobaciones locales y remotas, las previsualizaciones: [la GUI](./run-and-test.md)
- La estructura del proyecto, una app nueva, las traducciones, un repositorio que publica paquetes: [proyectos](./projects.md)
- El Worker de documentación sobre el `docs/` de una app: [escribir docs](./writing-docs.mdx)
- Planes: [planes](./how-we-work.md#plans-few-short-closed); las traducciones como regla: [en el cambio](./how-we-work.md#translations-in-the-change)
- Skills de agentes, MCP, capturas de pantalla y el navegador propio de los agentes: más abajo

### Actualizaciones de paquetes [#package-upgrades]

`pnpm remy packages upgrade` usa el `npm-check-updates` fijado para mover todas las dependencias (las de la raíz y las de cada
paquete del workspace) a su última versión, incluidas las mayores, guarda las versiones exactas y luego las instala
(`vp install`, que refresca `pnpm-lock.yaml`); después, `vp run setup` comprueba la instalación.
Los conflictos de peer fallan visiblemente; nada los fuerza. Revisa el diff del manifiesto/lockfile y cualquier requisito de migración
de versión mayor. Si la instalación falla tras actualizar el manifiesto, resuelve el
conflicto reportado antes de usar `vp run setup`; ningún rollback automático descarta tus cambios.
Los paquetes propios del repositorio y los dos de la plataforma (`@joeblew999/remy-ui`, `@joeblew999/remy-cli`) nunca se tocan. Los pins de Node, pnpm y de las
fuentes de skills se gestionan por separado.

### Verificación [#verification]

El flujo, sus pasos y quién ejecuta cada uno: [cómo trabajamos](./how-we-work.md#the-flow-the-standard-way-in-plain-sight).

Una instalación termina con `pnpm remy verify` (sus comprobaciones de `setup`; `vp run setup` y `vp run upgrade` lo ejecutan): alrededor de un
minuto, sin navegador. Son las dependencias frente al lockfile (`pnpm ls`), el registro de MCP, las versiones de las CLI
y los invariantes de las herramientas (`pnpm remy verify tooling`); usan la instalación local existente y no aprovisionan
nada en Cloudflare. `vp run setup` ejecuta `vp run ready` después de ellas.

La puerta antes de un push o un release es `vp run ci`, la misma aquí que en GitHub (el hook del push la ejecuta): `vp run ready`, nuestras comprobaciones
de navegador contra el build de producción en Workers locales (`vp run test:browser`; todos los idiomas en un release),
las auditorías de Google (`vp run test:audits`) y, en remy-auth, una app nueva (`vp run new-app`). Un release añade Core
Web Vitals en producción (`pnpm remy test cwv`). Ninguna de ellas despliega nada: desplegar es hacer push. Consulta
[la prueba de la GUI](./run-and-test.md) para el alcance y los comandos.


## Iniciar o recargar tu agente [#start-or-reload-your-agent]

### Extensión de Codex para VS Code [#vs-code-codex-extension]

Abre este repositorio en VS Code y usa la barra lateral de Codex. La extensión incluye
su propio ejecutable; la CLI de Codex fijada del proyecto (`@openai/codex`, una dependencia de `@joeblew999/remy-cli`)
sirve a los usuarios de terminal.
[La CLI de Codex y la extensión de IDE comparten la configuración de MCP](https://developers.openai.com/learn/docs-mcp).
Nuestro registro de proyecto escribe `.codex/config.toml`; confía en el proyecto en Codex
para que la configuración del proyecto pueda cargarse. El `.vscode/mcp.json` de VS Code configura
su propio cliente MCP y no es el archivo de configuración de la extensión de Codex.

Después de cambiar los skills o la configuración de MCP:

1. Ejecuta `pnpm remy mcp register` en la terminal del repositorio.
2. Guarda tu trabajo, abre la paleta de comandos (`Cmd+Shift+P` en macOS) y ejecuta
   **Developer: Reload Window**.
3. Vuelve a abrir la barra lateral de Codex y continúa la conversación. Verifica que el agente
   pueda llamar a las herramientas recién configuradas; el registro por sí solo no demuestra una conexión.

`codex resume --last` lanza una sesión de terminal; no recarga la extensión.
La CLI `code` instalada no tiene un flag documentado de reload-window, así que la recarga usa
el comando integrado de VS Code en lugar de un wrapper de shell que simule reiniciarla.

### Agentes de terminal [#terminal-agents]

Después de `vp run setup`, usa la CLI instalada de Codex o Claude Code. El Codex fijado es una dependencia de remy-cli, así que
en remy-auth se ejecuta desde ese paquete (`vp -C packages/remy-cli exec codex`):

```sh
vp -C packages/remy-cli exec codex                 # New Codex conversation
vp -C packages/remy-cli exec codex resume --last   # Resume latest Codex conversation
claude                                             # New Claude conversation
claude --continue                                  # Resume latest Claude conversation in this project
```

Para recargar los skills y la configuración de MCP, sal del agente actual con `/exit` y luego
retómalo desde tu terminal como arriba. Usa `/mcp` dentro del agente para comprobar la
conexión. La configuración instala localmente la
[`@openai/codex` CLI](https://learn.chatgpt.com/docs/codex/cli) oficial y fijada, y los comandos `remy`
que la llaman encuentran ese ejecutable por sí mismos en lugar de depender del PATH de tu shell.
`pnpm remy packages upgrade` la actualiza junto con las demás dependencias. Autentícate cuando
se te solicite. Claude Code se instala por separado; lanzar Codex no lo requiere.


## Skills de agentes [#agent-skills]

Las fuentes de los skills son los `pins` de
[packages/remy-cli/src/skills.ts](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-cli/src/skills.ts): Better Auth, Cloudflare, Chrome DevTools, Modern Web
Guidance, shadcn, Playwright CLI, GitHub release y TanStack Router/Start. Los skills de TanStack están
nombrados uno por uno, incluido su skill `react-router` (los bindings de React), que reemplazó al
skill de Remix con el mismo nombre: los skills se instalan planos por nombre, así que los dos no pueden
coexistir. Los skills de TanStack Form no están instalados: solo existen en sus ramas alpha de v2 y
describen la API alpha 2.0, no la 1.x que fijamos; añádelos cuando pasemos a Form 2. Instala los skills localmente:

```sh
pnpm remy skills install
pnpm remy skills list
```

Para reinstalar desde cero, ejecuta `pnpm remy skills remove` y luego `pnpm remy skills install`.

Skills viven en `.agents/skills/`; `.claude/skills/` enlaza a los mismos archivos.

### El skill `remy`: las reglas de la plataforma para los agentes de cada repositorio [#the-remy-skill-the-platforms-rules-for-every-repos-agents]

Además de los skills fijados, `remy skills install` instala `remy` desde el paquete instalado
(`./node_modules/@joeblew999/remy-ui/skills`), así que su versión es la del paquete: las reglas de la
versión que ejecuta una app, sin conexión. Es cada página de estos docs de desarrollo tal como el Worker de docs las sirve a
las herramientas de IA (`/dev/llms.txt`, el `.md` de cada página: con los includes resueltos y los componentes como texto), generado por `remy skills build`
(la tarea `skills:build` de la raíz, que la prueba de la app nueva y la publicación ejecutan primero; nunca `vp run ready`). Así, el skill, `llms.txt`, el
Markdown de cada página y los servidores MCP son un mismo texto de una misma fuente: una página no puede llegar a uno y faltar en otro. Los docs
en vivo (`/dev/llms.txt`, `/api/mcp/dev`) siempre tienen lo más reciente; el skill lo indica. En una app, `pnpm remy rules` mantiene un bloque
marcado en `AGENTS.md` que dirige a sus agentes hacia el skill y nombra la versión; `vp run setup` y
`vp run upgrade` lo ejecutan, así que una actualización cambia las reglas que leen los agentes en el mismo paso.
El propio `AGENTS.md` de remy-auth es un puntero a [Agentes: empieza aquí](./agents.md).
El instalador registra la procedencia en `skills-lock.json`. Volver a ejecutar la instalación
restaura los skills seleccionados desde las fuentes fijadas; actualiza sus commits de fuente deliberadamente
para adoptar cambios upstream. Solo se hace commit de `skills-lock.json`; los skills instalados y sus
enlaces de Claude están ignorados y se recrean con `vp run setup` o `pnpm remy skills install`.
`pnpm remy skills list` muestra lo que está instalado; [el plan de skills](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/agent-skills.md)
hace seguimiento de las dependencias sin un skill oficial. Recarga una sesión de agente existente
si los skills recién instalados aún no son visibles.

Para añadir una fuente, solo de los propios mantenedores de la biblioteca:

1. Fíjala en `pins` en `packages/remy-cli/src/skills.ts` como
   `https://github.com/<owner>/<repo>/tree/<commit>`, usando el
   commit de `git ls-remote https://github.com/<owner>/<repo> HEAD`, nombrando los skills que se van a tomar
   en lugar de `'*'` cuando el repositorio también incluya skills solo para contribuidores.
2. Ejecuta `pnpm remy skills remove`, `pnpm remy skills install` y `pnpm remy verify tooling`
   (segundos), que lee los pins y rechaza los skills instalados desde fuentes no fijadas.


## Registro de MCP [#mcp-registration]

Los skills proporcionan instrucciones y flujos de trabajo; MCP proporciona herramientas invocables. Chrome
DevTools usa ambos. Modern Web Guidance usa su CLI, y muchos skills de auth/Cloudflare
también funcionan a través de las CLI existentes; un skill no requiere automáticamente
un servidor MCP.

El registro (`packages/remy-cli/src/mcp.ts`) escribe la entrada `chrome-devtools` en
`.codex/config.toml` y `.mcp.json`, locales del proyecto. Cada cliente lanza el `chrome-devtools-mcp`
propio de la app (aislado, headless, telemetría desactivada) con una ruta absoluta. Los archivos generados
contienen rutas específicas de la máquina y están en gitignore; vuelve a ejecutar el registro después de mover el checkout.
Los ajustes y servidores no relacionados se conservan. Los archivos existentes modificados
reciben una copia de recuperación `.bak`; la serialización TOML puede normalizar el formato y los comentarios.

El servidor usa el paquete `chrome-devtools-mcp` fijado, un perfil de Chrome headless aislado, y tiene
desactivadas la telemetría de herramientas y las subidas a CrUX. El proceso MCP es independiente de la
sesión `chrome-devtools start`/`stop` de más abajo; el cliente del agente gestiona su ciclo de vida.

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
del proyecto no instala el navegador. La CLI (`chrome-devtools`, del paquete `chrome-devtools-mcp`)
es experimental y es una dependencia de `@joeblew999/remy-cli` junto con las demás herramientas, así que `pnpm remy packages upgrade`
también la actualiza; en remy-auth se ejecuta desde ese paquete:

```sh
vp -C packages/remy-cli exec chrome-devtools start --isolated --usageStatistics=false --performanceCrux=false
vp -C packages/remy-cli exec chrome-devtools new_page http://localhost:5173/en
vp -C packages/remy-cli exec chrome-devtools list_pages
vp -C packages/remy-cli exec chrome-devtools take_snapshot 1              # Use the returned page ID
vp -C packages/remy-cli exec chrome-devtools click 1 "UID_FROM_SNAPSHOT"
vp -C packages/remy-cli exec chrome-devtools stop
```

`start` es headless por defecto; añade `--headless=false` para una ventana visible. Inícialo una vez
por sesión; las llamadas posteriores a la CLI reutilizan el daemon en segundo plano. Volver a iniciarlo
reinicia ese daemon. `--isolated` da a la sesión un perfil temporal de Chrome; los dos flags `false`
desactivan la telemetría de uso de herramientas y las subidas de URL a CrUX. Detén la sesión cuando termines.
`chrome-devtools --help` lista los comandos originales.


## Guía de implementación web moderna [#modern-web-implementation-guidance]

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) de Google
complementa la inspección del navegador con guías de implementación para HTML/CSS nativos,
formularios, accesibilidad, rendimiento, passkeys y compatibilidad entre navegadores. El skill
principal `modern-web-guidance` está instalado para ambos agentes. El skill separado
`chrome-extensions` se omite porque este proyecto es un servicio web y una UI.

```sh
vp -C packages/remy-cli exec modern-web-guidance search "animate a dialog modal backdrop"
vp -C packages/remy-cli exec modern-web-guidance retrieve "GUIDE_ID_FROM_SEARCH"
vp -C packages/remy-cli exec modern-web-guidance list
```

Usa la CLI fijada (dependencia de remy-cli, como arriba) en lugar de los ejemplos
`modern-web-guidance@latest` del skill original. `pnpm remy packages upgrade` actualiza la CLI;
`pnpm remy skills install` restaura el skill fijado por commit. El instalador `skills` alternativo de Google
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
pnpm wrangler tail --format json -- --help
pnpm wrangler tail --format json --status error -- --help
```

Ambos usan el Worker configurado; `pnpm wrangler tail --format json` también acepta un nombre de Worker explícito.
`pnpm wrangler tail --format json --status error` filtra los fallos de invocación del Worker, no todas las respuestas de error HTTP. El almacenamiento
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
  docs. Los límites de gasto y de tasa viven aquí; `pnpm remy docs observe ai-usage` y `ai-check` lo leen.

Local o remoto: las páginas de docs, la página de Ask AI y todas las comprobaciones se ejecutan
localmente; las respuestas solo existen en Cloudflare (AI Search no tiene versión local).
Cada comando indica en su comentario de cabecera si es local o remoto (y si es de producción).

Los comandos de la documentación (`pnpm remy docs …`: publish, questions, answers, observe) están en [Comandos](./commands.mdx).
Hay dos cosas que esa lista no puede decir: los comandos `observe` necesitan el token del gateway, así que ejecútalos como
`fnox exec -- pnpm remy docs observe …`; y `CLOUDFLARE_ENV=ask vp -C apps/remy-auth-docs dev` (el de una app:
`vp -C docs dev`) ejecuta el Worker de docs local con respuestas del índice real (el `env.ask` de su `wrangler.jsonc`).
Después de que un cambio de docs llegue a producción, `pnpm remy docs publish`, en una máquina con sesión iniciada en Cloudflare, da al
índice las páginas nuevas.

Tokens: consulta [secretos](#secrets-fnox) más abajo.

Costos: la indexación son unos pocos embeddings (una reindexación completa, unos $0.0005); una búsqueda
sin respuesta, casi nada; una respuesta entre $0.0001 y $0.0007, y $0 cuando la caché de AI Search ya la tiene.

Ask AI es una decisión de cada app: el `ask` de `docs.config.ts` nombra su instancia de AI Search, su
bucket R2, su AI Gateway y su espacio de nombres de límite de tasa, y el `wrangler.jsonc` propio del Worker de docs declara la
misma instancia y el mismo límite de tasa como sus bindings (`ai_search`, `ratelimits`). Sin `ask`, la documentación no
tiene página ni botón de Ask AI, y su `wrangler.jsonc` no tiene esos bindings (el de la app en blanco no tiene ninguno).
`pnpm remy docs provision` imprime los comandos que crean los recursos de una app y no crea nada:
eso cuesta dinero y es cosa del propietario.

Historial almacenado y las respuestas de IA, de solo lectura, desde las propias APIs de Cloudflare. El
Worker, su instancia de AI Search y el AI Gateway de esa instancia provienen de su configuración de Wrangler, así que
una app que lo incluya obtiene el suyo propio:

Los comandos `observe` (en [Comandos](./commands.mdx)) leen Workers Logs y AI Gateway; ejecútalos como
`fnox exec -- pnpm remy observe …`, para el token.

### Secretos: fnox [#secrets-fnox]

El login de Wrangler cubre los despliegues, AI Search y los secretos del Worker, pero no se le puede
otorgar acceso a AI Gateway ni a Workers Logs. Para eso, los comandos leen tokens del entorno:

- `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`: el token y la cuenta de Cloudflare compartidos, los
  mismos elementos del llavero en todos los repositorios de joeblew999. [`fnox.toml`](https://github.com/joeblew999/remy-auth/blob/main/fnox.toml) los
  nombra (los valores se quedan en el llavero de macOS, nunca en el archivo); `fnox` es el de la máquina.
  Ejecuta un comando con ellos: `fnox exec -- pnpm remy observe ai-usage`. Guarda uno con
  `fnox set -p keychain CLOUDFLARE_API_TOKEN <token>` (nunca omitas `-p keychain`: sin él el valor se
  escribe en `fnox.toml` en texto plano). Lee Workers Logs y AI Gateway, así que necesita
  **Workers Observability Read** y **AI Gateway Edit**; AI Search se lee con el login de Wrangler.

Un solo token lo hace todo (el token `dev` en <https://dash.cloudflare.com/profile/api-tokens>): **AI Gateway
Edit** (que incluye lectura) y **Workers Observability Read** son los que estos comandos necesitan; cambiar
el gateway con `observe gateway` usa el mismo token, y cada cambio se lee de vuelta.
