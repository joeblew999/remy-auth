---
title: "Tareas compartidas de mise"
description: "Las tareas compartidas de mise que toda app de Remy incluye mediante una referencia de git: un archivo por espacio de nombres y lo que hace cada tarea."
---

Un archivo por espacio de nombres de tarea (`skills`, `mcp`, `browser`, `web`, `codex`, `claude`, `project`, `i18n`,
`cf`, `api`); las tareas de archivo viven en el directorio de su espacio de nombres (`mcp/`, `cf/`, `api/`, `project/`, `i18n/`). remy-auth incluye este
directorio localmente; cualquier otro proyecto lo incluye mediante una referencia de git fijada a la tag de publicación
que coincide con su versión de `@joeblew999/remy-ui`:

```toml
min_version = "2026.9.12"   # the tasks rely on it; an include cannot set it

[task_config]
includes = ["git::https://github.com/joeblew999/remy-auth.git//tasks?ref=vX.Y.Z"]

[env]
# Local host port for preview and tests, from the shell so each worktree or agent picks its own.
PREVIEW_PORT = "{{ get_env(name='PREVIEW_PORT', default='4174') }}"
# Origin in prerendered links for local tests; follows the port.
PUBLIC_ORIGIN = "http://127.0.0.1:{{ env.PREVIEW_PORT }}"
# Origin cf:deploy builds with.
DEPLOY_ORIGIN = "https://your-app.your-subdomain.workers.dev"
```

### La estructura [#the-layout]

Todo repositorio de Remy, remy-auth incluido, tiene los mismos archivos en los mismos lugares; lo que hay
dentro de los archivos del producto es diferente. La estructura son las rutas que leen las tareas
compartidas, sus scripts y el paquete, así que un archivo en cualquier otro lugar simplemente no se
encuentra; ninguna comprobación propia lo mantiene.

| Ruta | Leído por | Contiene |
| --- | --- | --- |
| `mise.toml` | mise | `min_version`, las herramientas, el include de tareas, `[env]` (`DEPLOY_ORIGIN`, `PREVIEW_PORT`, orígenes de la documentación) |
| `package.json`, `package-lock.json` | npm, `project:*`, `packages:*` (workspaces) | las dependencias de la app; `workspaces` cuando es dueña de paquetes |
| `wrangler.jsonc` | wrangler, el plugin de Vite de Cloudflare, `cf:*` | el nombre del Worker, los bindings y los assets |
| `vite.config.ts`, `tsconfig.json`, `playwright.config.ts` | Vite, `project:typecheck`, `project:test:*` | el build, los tipos y las comprobaciones de navegador |
| `fnox.toml`, `skills-lock.json` | fnox, `skills:*` | los nombres de los secretos; las skills fijadas |
| `src/routes/`, `src/routeTree.gen.ts` | TanStack Start (el árbol se genera) | las páginas del producto |
| `src/parts.json` | el `remyParts()` del paquete | las partes compartidas que lista la app (ninguna sin el archivo; la app en blanco lista `seo-routes`) |
| `src/api/` | la ruta `api.$` de la app | los procedimientos del producto, si tiene API |
| `tests/` (`smoke.spec.ts` por nombre) | `project:test:*`, `project:test:live` | las comprobaciones compartidas con los ajustes de la app, y las propias |
| `public/` | Vite | favicon, `_headers` |
| `dist/` (`dist/client/assets`) | `cf:deploy`, las comprobaciones | resultado del build, nunca en commit |
| `docs/` (`docs.config.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `content/{users,dev,ui}/` con `i18n.json` y `meta.json`, `content/questions.json`; generados `.remy-docs/`, `dist/`) | `docs:*`, `i18n:docs:*` (`I18N_DOCS_DIR`) | la documentación de la app: su identidad y sus páginas; el Worker es del paquete |
| `packages/<name>/` con `README.md` | `plans:*`, `packages:*` | los paquetes que publica el repositorio, si los hay |
| `messages/`, `project.inlang/` | el preset de la app, `project:generate`, `i18n:messages:*` | las cadenas propias de la app, si las hay (compiladas en `src/paraglide/`) |
| `.plans/` (`now.md`, `done/`, `parked/`) | `plans:*` | los planes del repositorio |
| `AGENTS.md`, `.github/workflows/` | agentes; GitHub | el puntero de los agentes a la documentación; CI |
| `tasks/`, `template/`, `fixtures/consumer/` | el include; `giget`; `template:test` | solo remy-auth: las propias tareas compartidas, la app en blanco desde la que arranca un repositorio nuevo, y el fixture de consumidor que prueba ambos tal como los recibiría otro repositorio |

### Un consumidor nuevo [#a-new-consumer]

La receta única. Una app nueva arranca desde la app en blanco, [`template/`](https://github.com/joeblew999/remy-auth/tree/main/template)
en remy-auth en la tag de la versión: la estructura de arriba con solo los archivos propios del repositorio
dentro (sus nombres, una página de inicio en cada idioma, un índice de documentación por sitio, los
archivos de configuración de la estructura con apenas unas líneas cada uno). Todo lo demás es el paquete y
las tareas, que un solo cambio de versión actualiza.

1. Requisitos: mise >= 2026.9.12, `gh auth login` con un token que tenga `read:packages`, Google
   Chrome (lo usan las comprobaciones) y `wrangler login` antes del primer despliegue.
2. `npx -y giget@3.3.1 gh:joeblew999/remy-auth/template#vX.Y.Z <name>`, luego `cd <name>` y `git init`
   (las tareas de i18n y de planes leen el historial de git; `project:setup` lo indica si falta).
3. Nombra la aplicación: sustituye `my-app` y `My app` (`grep -rn -i "my.app" --exclude-dir=node_modules .`):
   `package.json`, `wrangler.jsonc`, `src/service.ts`, los orígenes de `mise.toml`, `docs/docs.config.ts` (el
   nombre y la fuente del producto, que también lee el marco de la app) y `messages/en.json`.
4. `mise install`, luego `GITHUB_TOKEN=$(gh auth token) npm install` una vez para escribir `package-lock.json`,
   luego `mise run project:setup` (npm ci, las skills fijadas y la skill `remy`, el bloque de reglas de
   `AGENTS.md`, registro MCP, `project:verify`).
5. Haz commit de todo, `package-lock.json`, `skills-lock.json` y `src/routeTree.gen.ts` incluidos. Las
   cadenas de la app en blanco ya vienen traducidas; cuando el inglés cambie (`messages/en.json`, la
   documentación), haz commit de ello y ejecuta `mise run i18n:translate`, que escribe y hace commit de los
   demás idiomas.
6. `mise run cf:deploy`, y `mise run docs:deploy` para la documentación.
7. CI: `.github/workflows/google.yml` llama al flujo de trabajo compartido de remy-auth en la misma tag (todos los
   idiomas, las auditorías de Google en cada push a `main`). Da al repositorio nuevo acceso de lectura en la
   configuración del paquete `@joeblew999/remy-ui` ("Manage Actions access"), o `npm ci` falla allí.

Después, la app crece en sus propios archivos: páginas en `src/routes/` (una página junto a la ruta de un
padre, como `videos.$videoId` al lado de `videos`, es `videos_.$videoId.tsx`: TanStack anida
`videos.$videoId` dentro de `videos`, que entonces necesita un `<Outlet />`), sus enlaces en
`src/remy-app.tsx`, cadenas en `messages/en.json` (`m` desde `src/paraglide/messages.js`), una API como
paquete de contrato y `src/api/` (todo procedimiento que recibe entrada documenta un error, o `apiChecks`
falla: la regla `api/coverage` del paquete), documentación en `docs/content/`. Pasa a una versión nueva con
`mise run project:upgrade-ui -- <version>` (el paquete, el `ref` de las tareas y la tag del flujo de trabajo
de CI, juntos). `ref=main` (`mise.dev.toml`) queda en caché y nunca se refresca solo: `mise run
project:refresh-tasks` cuando `main` avance. Dos ejecuciones de navegador locales a la vez comparten
`PREVIEW_PORT` y el segundo falla al iniciar su servidor: dale a cada shell el suyo (`PREVIEW_PORT=4232
mise run …`).

### Un repositorio que publica paquetes [#a-repository-that-publishes-packages]

Un repositorio también puede publicar paquetes propios (un contrato, un paquete de UI), como hace
remy-auth; eso no cuesta ninguna tarea propia. Sus paquetes son workspaces de npm (`packages/<name>/`,
`workspaces` de `package.json`), y cada uno que no es `private` se publica mediante las tareas compartidas
`packages:*`:

| Tarea | Hace |
| --- | --- |
| `packages:check`, `packages:upgrade` | Versiones npm más nuevas de las dependencias propias del repositorio (raíz y workspaces; nunca sus propios paquetes ni `@joeblew999/remy-ui`), previsualizadas (`check`) o aplicadas, y luego `project:verify` (`upgrade`) |
| `packages:pack` | Un tarball de cada paquete publicado, para que una app de prueba lo instale antes de cualquier release |
| `packages:release` | Las puertas de control (traducciones en modo estricto, `project:verify`, `project:release-checks`, auditorías de Google, Core Web Vitals), y luego `packages:tag` |
| `packages:tag` | Sobre un `main` limpio: etiqueta la versión de `RELEASE_PACKAGE`, hace push y luego `packages:publish --release` |
| `packages:publish` | Publica cada paquete cuya versión es nueva en su registro; con `--release vX.Y.Z` también el release de GitHub a partir de `CHANGELOG.md` (`packages:notes`). El job de CI de la tag ejecuta la misma tarea |

En el `[env]` de `mise.toml`: `RELEASE_PACKAGE` (el paquete cuya versión da nombre al release) y
`RELEASE_TITLE`. El `exports` de un paquete nombra cada subruta que sus usuarios importan
(`"./video": "./src/video.ts"`); cualquier otra cosa se rechaza en tiempo de build y en Playwright, cuyo
mensaje nombra el archivo que importa, no el mapa de exports. Las cadenas propias de un paquete son su
propio proyecto inlang, compilado por su build, cuyo runtime sigue el idioma de la plataforma con una sola
llamada, `followLocale(runtime)` (`locale`); las tareas de i18n lo leen a través de `I18N_INLANG`. Las
comprobaciones que el repositorio añade a un release van en `project:release-checks` (remy-auth:
`template:check`, `ui:verify`). remy-auth fija la versión de un release con `mise run ui:version -- X.Y.Z`,
que la escribe en todos los lugares donde aparece (el paquete y los tres pines de la app en blanco).

### Elegir la versión: publicada, de desarrollo o local [#choosing-the-version-released-development-or-local]

Las tareas y el paquete se publican juntos: el `mise run ui:release` de remy-auth (el `packages:release`
compartido) publica `@joeblew999/remy-ui` X.Y.Z y etiqueta ese mismo commit como `vX.Y.Z`. Por eso, quien
consume el paquete fija ambos a un mismo número, y `project:upgrade-ui` los cambia a la vez:

| Quieres | Cómo | Dónde |
| --- | --- | --- |
| Publicada (por defecto, estable) | `ref=vX.Y.Z`, que coincide con la versión de `@joeblew999/remy-ui` en `package.json` | `mise.toml`, incluido en el commit |
| Línea de desarrollo | `MISE_ENV=dev mise run …` con `ref=main` | `mise.dev.toml`, incluido en el commit |
| Tu propio checkout, editando las tareas | la ruta hermana `../remy-auth/tasks` | `mise.local.toml`, en gitignore |

mise usa el `includes` del archivo más específico en lugar del predeterminado (verificado con mise
2026.9.12), así que las sobrescrituras nunca se combinan con la versión publicada. Los includes remotos se
cachean: después de que `main` avance, `mise run project:refresh-tasks`. Fija un SHA de commit solo
mientras una rama está en pruebas antes de publicarla; vuelve a una tag al publicar.

La plataforma aporta todos los paquetes npm que necesitan la app y las tareas, en una sola versión: son
dependencias propias de `@joeblew999/remy-ui` (el framework, la cadena de herramientas, las herramientas de
las comprobaciones), así que el `package.json` de una app nombra el paquete, sus propios paquetes y lo que
su producto añada. `project:single-copies` (dentro de `project:check`) falla cuando un paquete que se
rompe si se instala por duplicado (React, TanStack Router y Query, el stringifier de MDX; la lista
`remy.singleCopy` del paquete) está presente: quita el pin propio de la app. Una tarea definida en el
propio `mise.toml` del proyecto sobrescribe la tarea incluida del mismo nombre; los ganchos pensados para
ello son `project:generate` (código generado antes de comprobar los tipos; por defecto, el catálogo propio
de la app), `project:prepare` (el estado local que una app necesita antes de ejecutarse, que `project:dev`
y `project:build` ejecutan primero; nada por defecto, y remy-auth escribe ahí su `.dev.vars` y migra su D1
local) y `project:release-checks`.

El flujo de desarrollo es código, `tasks/dev/flow.ts`, con tres comandos y un guardián
([cómo trabajamos](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest)):

| Paso | Tarea |
| --- | --- |
| Primero | `dev:status` (main con los veredictos de GitHub, los despliegues, los worktrees por delante y por detrás, las traducciones, las pull requests; un hook `SessionStart` lo ejecuta para los agentes) |
| Un trabajo | `dev:start -- <name>` (un worktree propio desde main, `npm ci`, puertos en `mise.local.toml`, `dev:guard`); `dev:done` lo elimina una vez fusionado |
| Cada cambio | `dev:change` (`project:check`: planes, `project:routes` cuando cambia un archivo de ruta, tipos con `project:typecheck-tasks`, `project:test:unit`, `i18n:check` como aviso, `project:check:docs` cuando cambia la documentación) |
| Sale de la máquina | `dev:land -- "<message>"` (la comprobación, commit, main, push, traduce cuando está desactualizado, `cf:staging`; GitHub ejecuta entonces `project:test`, `project:test:google` y `project:test:consumers` en paralelo, y una ejecución en rojo comenta en el commit. Las mismas tres en local, a propósito: `REMY_FLOW=hand mise run <task>`) |
| Producción | `dev:promote` (se niega ante un commit que GitHub no ha aprobado; luego `cf:deploy`, `docs:deploy`, `cf:versions`) |
| Un release | `dev:release` (`packages:release`, que ejecuta `project:verify`) |
| Un área | `project:test:only -- <words>` |
| El guardián | `dev:guard` lo registra (`project:setup` lo hace); `dev:guard -- --check` lo verifica (`project:verify` lo hace) |

`project:test` es cada una de nuestras comprobaciones en todos los idiomas (dentro de `project:verify`).
`project:verify` y CI terminan con `project:test:consumers`, los demás repositorios a los que este sirve,
probados tal como los reciben: nada por defecto; en remy-auth, `template:test`, que construye la app en
blanco y un paquete propio a partir de la plataforma de este commit (el paquete desde un tarball con
versión propia, las tareas desde una copia fuera de cualquier `node_modules`, el `.npmrc` de la plantilla)
y ejecuta la instalación, las skills (instaladas una vez por lista fijada y luego reutilizadas), las
herramientas, la comprobación, las comprobaciones rápidas de navegador, la documentación y una publicación
de prueba (dry-run) (~1,5 a 3 min, sobre todo la red). Un cambio que rompería otro repositorio falla ahí, no
en ese repositorio. Las pruebas se comprueban con tipos junto con la app (`tsconfig.json` incluye
`tests/`). El nivel de Google es `project:test:google` (auditorías de Lighthouse, local; CI en cada push y
tag) y `project:test:cwv` (Core Web Vitals en un Worker de Cloudflare desechable); `packages:release`
ejecuta ambas.

Dónde se ejecutan las comprobaciones: el comportamiento propio del paquete compartido se comprueba una vez, en remy-auth, antes de cada
release. Una app construida sobre el paquete ejecuta un conjunto de contrato (sus páginas renderizan, las páginas de sitio y de app se mantienen
separadas, sus propias funcionalidades funcionan) más el nivel de Google en sus propias páginas de sitio, no toda la suite del paquete
de nuevo. Mantén las comprobaciones baratas en lugar de quitarlas (el reloj de Playwright en lugar de esperas
reales, una página de navegador por comprobación, workers en paralelo). Las comprobaciones recorren `checkedLocales` de
`@joeblew999/remy-ui/checks`, que respeta `CHECK_LOCALES`. Define `[settings] task.timings = true` en el
`mise.toml` que incluye, para que cada paso imprima duraciones por tarea y totales.

### Traducciones [#translations]

Una misma estructura en cada app, para que las mismas tareas `i18n:*` funcionen en todas partes (la regla sobre quién traduce es
[un solo redactor](./how-we-work.md#translations-one-writer)):

| Qué | Inglés | Traducción |
| --- | --- | --- |
| Docs | `docs/content/<site>/<page>.md` o `.mdx` (estructura de Fumadocs) | a su lado: `<page>.<locale>.md` o `.mdx` |
| Catálogos de UI | el catálogo del idioma base de cada proyecto inlang (`<dir>/project.inlang`) | el catálogo de cada idioma, según el `pathPattern` propio del proyecto (p. ej. `messages/<locale>.json`) |

Dos flujos, uno para cada tipo de texto, con el mismo patrón en ambos: detectar sin conexión con git y pequeñas
herramientas, traducir con el agente Claude fijado y hacer commit.

- **Mensajes de UI** (Paraglide): los catálogos, los idiomas y el idioma base vienen del propio
  `settings.json` de inlang (`I18N_INLANG`, o si no, el único proyecto que git conoce). Se detectan: catálogos y claves
  que faltan (`jq`), `{placeholders}` perdidos o inventados (`@lingual/i18n-check`), claves cuyo inglés cambió desde
  el último commit del catálogo (`git`, `jq`), y las categorías de plural que necesita el idioma (`Intl.PluralRules`,
  `tasks/i18n/messages/plurals.mjs`: ninguna herramienta externa las comprueba).
- **Docs** (Fumadocs): la carpeta es `I18N_DOCS_DIR` (por defecto `docs/content`); cada sitio con un
  `i18n.json` traduce cada página en inglés a cada uno de sus idiomas. Se detectan: páginas que faltan y
  desactualizadas (`git`), huérfanas, y el propio texto de Fumadocs UI (`ui/<lang>.json` frente a `ui/en.json`).
- **El traductor** es Claude Code en modo headless (`claude -p`), fijado en las tareas, sin herramientas, sin servidores
  MCP, skills ni ajustes de proyecto, y con salida estructurada: las claves de un catálogo vuelven como JSON y
  `jq` las combina en el orden de claves del inglés; una página vuelve completa. Los prompts están en
  `tasks/i18n/prompts/`. Una llamada por idioma (mensajes) o por página (docs), `I18N_JOBS` a la vez.
- Las comprobaciones no necesitan clave, ni red, pero sí el historial completo de git (un clon superficial se rechaza).
  Traducir usa el login de Claude de la máquina.
- Una app sin proyecto inlang ni sitios de documentación recibe "nothing to check" y sale con 0.

| Tarea | Hace |
| --- | --- |
| `i18n:check` | Ambas comprobaciones en paralelo; un WARNING y salida 0 mientras se programa (`project:check` la ejecuta), salida 1 con `I18N_STRICT=1` (`packages:release`) |
| `i18n:messages:check` | Los huecos de los catálogos, y los idiomas que difieren de los de la plataforma (`de unlisted`); `-- --list` una línea por hueco (`es missing nav_more`) |
| `i18n:docs:check` | Los huecos de la documentación; `-- --list` una línea por hueco (`es stale docs/content/dev/gui.es.md`) |
| `i18n:translate` | En main: mensajes y luego documentación, un commit para cada uno |
| `i18n:messages:translate` | Los huecos de los catálogos, un idioma por llamada al agente |
| `i18n:docs:translate [files]` | Los huecos de la documentación, una página por llamada al agente; los archivos de traducción indicados se rehacen por completo |

Ajustes: `I18N_MODEL` (por defecto `sonnet`), `I18N_JOBS` (4), `I18N_COMMIT=0` (deja el cambio
sin commit para revisarlo), `I18N_BRANCH` (`main`).

### Tareas de Cloudflare [#cloudflare-tasks]

Cada tarea `cf:*` indica LOCAL o REMOTE (y PRODUCTION) en `mise tasks`. Ejecuta las tareas de archivo a
través de mise: fuera de una tarea, el shim de Node de mise vuelve a aplicar `[env]` y reemplazaría `PUBLIC_ORIGIN`.

| Tarea | Hace |
| --- | --- |
| `cf:deploy` | Construye con `DEPLOY_ORIGIN`, sube, espera a la nueva versión (`cf:wait`) y luego ejecuta su comprobación smoke en vivo. Sin pruebas antes: `dev:promote` lo ejecuta después de las comprobaciones del flujo. Se niega cuando un binding de D1, KV o R2 nombra un recurso que no existe: Wrangler crearía uno durante el despliegue, y crear recursos corresponde al propietario (`cf:preview` se niega del mismo modo) |
| `cf:preview` | Despliega este commit como un Worker desechable `<worker>-check-<commit>` (producción intacta), ejecuta el nivel 1 contra él y lo elimina; `KEEP_PREVIEW=1` lo conserva |
| `cf:preview-delete` | Lista los Workers de comprobación, o elimina uno por nombre; nunca el Worker de producción |
| `cf:urls` | Imprime las páginas y `/healthz` del origen de producción (o de uno dado), para informes |
| `cf:staging` | `cf:deploy` para el entorno de staging: construye con `CLOUDFLARE_ENV=staging` (`env.staging` en la configuración de Wrangler) y sube su propio Worker en `STAGING_ORIGIN`; producción queda intacta. Lo que staging permite más allá de producción está en la [tabla de entornos](./auth.md#environments-one-table) de la app |
| `cf:versions` | Pregunta a cada despliegue (`DEPLOY_ORIGIN`, `STAGING_ORIGIN` y `DOCS_ORIGIN`, o los orígenes dados) qué está ejecutando: servicio, entorno, commit, cuán lejos está eso de este checkout, cuándo se desplegó. [Se pregunta, nunca se recuerda](./gui.md#which-version-is-deployed) |
| `project:test:remote` | El nivel 1 contra `TEST_BASE_URL` |
| `cf:events`, `cf:ai-usage`, `cf:ai-check`, `cf:ai-gateway` | Workers Logs almacenados, uso de AI Gateway, comprobación de la configuración de IA, los ajustes del gateway ([herramientas](./tooling.md#the-docs-answers-on-cloudflare-ai-search-and-ai-gateway)) |
| `project:upgrade-ui` | Mueve una app a una misma publicación compartida: versión del paquete y `ref` de las tareas juntos, y luego `project:verify` |

Las credenciales vienen del login de Wrangler, o del llavero a través de fnox
([herramientas](./tooling.md#secrets-fnox)).

### Planes [#plans]

La regla de los planes ([cómo trabajamos](./how-we-work.md#plans-few-short-closed)) como tareas, igual en
todos los proyectos: `.plans/now.md` es la única lista ordenada, `.plans/*.md` los pocos archivos de plan abiertos,
`.plans/done/` y `.plans/parked/` el resto, `.plans/stability-log.md` opcional. Un proyecto sin
`.plans/` pasa `plans:check` y no tiene nada que listar.

| Tarea | Hace |
| --- | --- |
| `plans:status` | Los elementos abiertos de `now.md` por sección, los archivos de plan abiertos con su primera línea `Status:`/`Closed`/`Parked` y su último commit (STALE a los 14 días), los planes aparcados. `--json` para agentes |
| `plans:check` | `now.md` existe, cada enlace relativo a un `.md` bajo `.plans/` resuelve, ningún `.md` fuera de `.plans/`, `done/` y `parked/`, cada archivo de plan abierto enlazado desde `now.md`. Instantánea, sin red; `project:check` la ejecuta primero |
| `plans:close -- <plan> "<lo publicado>"` | Añade `Closed <hoy>: ...` bajo el título, lo mueve a `done/` (desde `.plans/` o `parked/`; `git mv` si está versionado), reapunta los enlaces relativos hacia él en `.plans/`, `docs/`, `tasks/`, `packages/*/README.md` y los `*.md` de la raíz, y sus propios enlaces desde la carpeta nueva, y tacha su elemento en `now.md` |
| `plans:park -- <plan> "<por qué>"` | Lo mismo hacia `parked/` con `Parked <hoy>: ...` |
| `plans:open -- <plan> "<por qué ahora>"` | Un plan aparcado que se retoma: lo mismo desde `parked/` de vuelta a `.plans/` con `Opened <hoy>: ...`; añade su elemento a `now.md` tú mismo |

`close` y `park` cambian archivos y preparan el movimiento, pero nunca hacen commit: lee `git diff` y luego haz commit.
