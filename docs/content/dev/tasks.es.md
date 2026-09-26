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

### Un consumidor nuevo [#a-new-consumer]

La receta única. [remy-auth-app](https://github.com/joeblew999/remy-auth-app) es el consumidor de
referencia y el punto de partida: convertido en repositorio plantilla de GitHub, una aplicación nueva no
copia ningún archivo a mano.

1. Requisitos: mise >= 2026.9.12, `gh auth login` con un token que tenga `read:packages`, Google
   Chrome (lo usan las comprobaciones) y `wrangler login` antes del primer despliegue.
2. `gh repo create <name> --private --template joeblew999/remy-auth-app --clone`, luego `cd <name>`.
3. Nombra la aplicación: `name` en `wrangler.jsonc` y `package.json`, el nombre del Worker de prerender en
   `vite.config.ts`, el nombre del servicio en `workers/app.ts`, `src/server.ts` y `tests/gui.spec.ts`
   (`grep -rn remy-auth-app --exclude-dir=node_modules .` los lista), y `DEPLOY_ORIGIN` en
   `mise.toml` (`https://<name>.<your-subdomain>.workers.dev`).
4. `mise install`, luego `GITHUB_TOKEN=$(gh auth token) npm install` una vez para escribir el
   `package-lock.json` de la aplicación nueva (`project:setup` ejecuta `npm ci`, que lo necesita), luego
   `GITHUB_TOKEN=$(gh auth token) mise run project:setup` (npm ci, skills fijadas, registro MCP,
   `project:verify`).
5. Haz commit de `package-lock.json`, `skills-lock.json` y `src/routeTree.gen.ts`.
6. `mise run cf:deploy`.
7. CI: el `.github/workflows/google.yml` de la plantilla ejecuta los tipos y las auditorías de Google en
   cada push a `main`. Da al repositorio nuevo acceso de lectura en la configuración del paquete
   `@joeblew999/remy-ui` ("Manage Actions access"), o `npm ci` falla allí.

La plantilla ya trae `min_version`, las tres entradas de arriba, `preview_urls: false` y
`observability.redact_query_string` en `wrangler.jsonc`, el `.npmrc` para GitHub Packages, el
`.gitignore`, las comprobaciones en `tests/` y un archivo de Dependabot que mantiene al día las acciones
fijadas por SHA. Pasa a una versión nueva con `mise run project:upgrade-ui -- <version>` (paquete y
`ref` de las tareas a la vez). `ref=main` (`mise.dev.toml`) queda en caché y nunca se refresca solo:
ejecuta con `MISE_TASK_REMOTE_NO_CACHE=true` cuando `main` avance.

### Elegir la versión: publicada, de desarrollo o local [#choosing-the-version-released-development-or-local]

Las tareas y el paquete se publican juntos: `mise run ui:release` publica
`@joeblew999/remy-ui` X.Y.Z y etiqueta ese mismo commit como `vX.Y.Z`. Por eso, quien consume el paquete fija ambos a
un mismo número, y lo cambia en dos lugares a la vez:

| Quieres | Cómo | Dónde |
| --- | --- | --- |
| Publicada (por defecto, estable) | `ref=vX.Y.Z`, que coincide con la versión de `@joeblew999/remy-ui` en `package.json` | `mise.toml`, incluido en el commit |
| Línea de desarrollo | `MISE_ENV=dev mise run …` con `ref=main` | `mise.dev.toml`, incluido en el commit |
| Tu propio checkout, editando las tareas | la ruta hermana `../remy-auth/tasks` | `mise.local.toml`, en gitignore |

mise usa el `includes` del archivo más específico en lugar del predeterminado (verificado con mise
2026.9.12), así que las sobrescrituras nunca se combinan con la versión publicada. Los includes remotos se cachean: después de
que `main` avance, refresca con `MISE_TASK_REMOTE_NO_CACHE=true`. Fija un SHA de commit solo mientras una rama
está en pruebas antes de publicarla; vuelve a una tag al publicar.

El proyecto que incluye estas tareas aporta los paquetes npm que las tareas ejecutan; la lista completa es el
`package.json` de remy-auth-app (`vite` con `@tanstack/react-start` y sus plugins, `wrangler`, `@playwright/test`,
`lighthouse`, `chrome-devtools-mcp`, `modern-web-guidance`, `smol-toml`, y `@openai/codex` para
las tareas de Codex). Una tarea definida en el propio `mise.toml` del proyecto
sobrescribe la tarea incluida del mismo nombre; remy-auth sobrescribe `project:typecheck` y
`project:verify` porque es el dueño del paquete compartido.

Las pruebas se ejecutan en niveles, elegidos por costo y por lo que un cambio puede romper, nunca omitiendo comprobaciones. Los
niveles y cuándo usar cada uno son una regla en
[cómo trabajamos](./how-we-work.md#gates-before-anything-leaves-the-machine); las tareas son:

| Nivel | Tarea |
| --- | --- |
| 0 | `project:check` (comprobación de tipos y build, sin navegador; después `i18n:check`, como aviso) |
| 1 | `project:test:smoke` (`tests/smoke.spec.ts`, construido sobre las comprobaciones `./smoke` del paquete) |
| 2 | `project:test:only -- <words>` (las comprobaciones cuyo título coincide, en `QUICK_LOCALES`) |
| 3 | `project:test:quick` (todas las comprobaciones en `QUICK_LOCALES`, por defecto `en,ar`) |
| 4 | `project:verify` (todo, en todos los idiomas; `ui:release` lo ejecuta) |

`project:test` es cada una de nuestras comprobaciones en todos los idiomas (dentro de `project:verify`). El
nivel de Google es `project:test:google` (auditorías de Lighthouse, local; CI en cada push y tag) y
`project:test:cwv` (Core Web Vitals en un Worker de Cloudflare desechable); `ui:release` ejecuta ambas.

Dónde se ejecutan las comprobaciones: el comportamiento propio del paquete compartido se comprueba una vez, en remy-auth, antes de cada
release. Una app construida sobre el paquete ejecuta un conjunto de contrato (sus páginas renderizan, las páginas de sitio y de app se mantienen
separadas, sus propias funcionalidades funcionan) más el nivel de Google en sus propias páginas de sitio, no toda la suite del paquete
de nuevo. Mantén las comprobaciones baratas en lugar de quitarlas (el reloj de Playwright en lugar de esperas
reales, una página de navegador por comprobación, workers en paralelo). Las comprobaciones recorren `checkedLocales` de
`@joeblew999/remy-ui/checks`, que respeta `CHECK_LOCALES`. Define `[settings] task.timings = true` en el
`mise.toml` que incluye, para que cada nivel imprima duraciones por tarea y totales.

### Traducciones [#translations]

Una misma estructura en cada app, para que las mismas tareas `i18n:*` funcionen en todas partes (la regla sobre quién traduce es
[un solo redactor](./how-we-work.md#translations-one-writer)):

| Qué | Inglés | Traducción |
| --- | --- | --- |
| Docs | `docs/content/<site>/<page>.md` o `.mdx` (estructura de Fumadocs) | a su lado: `<page>.<locale>.md` o `.mdx` |
| Catálogos de UI | el catálogo del idioma base de cada proyecto inlang (`<dir>/project.inlang`) | el catálogo de cada idioma, según el `pathPattern` propio del proyecto (p. ej. `messages/<locale>.json`) |

- Un archivo de documentación traducido registra, en la línea bajo su frontmatter, la versión en inglés de la que se
  tradujo, como el blob sha de git del archivo en inglés (`git hash-object`): basado en el contenido, así que todas
  las ramas coinciden en él.
  `i18n:translate -- --mark <file>` lo escribe; nadie lo teclea.

  ```md
  <!-- translated-from: docs/content/dev/tooling.md @ 9b4c91affd910033e83bf7fb52e64b4d69fbdbc2 -->
  ```

- La carpeta de documentación es `I18N_DOCS_DIR` (por defecto `content/docs`; remy-auth usa `docs/content`). Todo
  `.md`/`.mdx` sin sufijo de idioma es inglés; un idioma participa en la documentación al tener cualquier página
  traducida. Los idiomas que ofrece cada sitio están en el `i18n.json` del sitio.
- Los catálogos, los idiomas y el idioma base vienen del propio `settings.json` de inlang; la CLI de inlang
  (`lint`, `validate`) solo comprueba el archivo de ajustes, así que la paridad de claves y placeholders es nuestra.
- Una app sin documentación traducida ni `project.inlang` propio recibe "nothing to translate" y
  sale con 0.

| Tarea | Hace |
| --- | --- |
| `i18n:status` | Por idioma: documentación que falta, desactualizada (el inglés cambió desde el sha registrado), sin marcar, huérfana, o marcada como actual con otros encabezados que el inglés; claves de catálogo que faltan, sobran o tienen otros `{placeholders}`. `--json` para agentes |
| `i18n:check` | Lo mismo; un WARNING y salida 0 mientras se programa (`project:check` lo ejecuta), salida 1 con `I18N_STRICT=1` (`ui:release`) |
| `i18n:translate [locale]` | El trabajo: para cada archivo de documentación desactualizado, `git diff <recorded>..<current>` de su inglés, archivos completos para los que faltan, claves que faltan con sus valores en inglés. Sin llamadas a modelos |
| `i18n:translate -- --mark <file>…` | Registra la versión actual en inglés en los archivos de documentación traducidos |

### Tareas de Cloudflare [#cloudflare-tasks]

Cada tarea `cf:*` indica LOCAL o REMOTE (y PRODUCTION) en `mise tasks`. Ejecuta las tareas de archivo a
través de mise: fuera de una tarea, el shim de Node de mise vuelve a aplicar `[env]` y reemplazaría `PUBLIC_ORIGIN`.

| Tarea | Hace |
| --- | --- |
| `cf:deploy` | Construye con `DEPLOY_ORIGIN`, sube, espera a la nueva versión (`cf:wait`) y luego ejecuta su comprobación smoke en vivo. Sin pruebas salvo que `GATE=smoke\|quick\|full` elija un nivel |
| `cf:preview` | Despliega este commit como un Worker desechable `<worker>-check-<commit>` (producción intacta), ejecuta el nivel 1 contra él y lo elimina; `KEEP_PREVIEW=1` lo conserva |
| `cf:preview-delete` | Lista los Workers de comprobación, o elimina uno por nombre; nunca el Worker de producción |
| `cf:urls` | Imprime las páginas y `/healthz` del origen de producción (o de uno dado), para informes |
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

`close` y `park` cambian archivos y preparan el movimiento, pero nunca hacen commit: lee `git diff` y luego haz commit.
