# Tareas compartidas de mise [#shared-mise-tasks]

Un archivo por espacio de nombres de tarea (`skills`, `mcp`, `browser`, `web`, `codex`, `claude`, `project`,
`cf`, `api`); `mcp/register`, `cf/preview` y `api/spec` son tareas de archivo en sus directorios de espacio de nombres. remy-auth incluye este
directorio localmente; cualquier otro proyecto lo incluye mediante una referencia de git fijada a un commit:

```toml
[task_config]
includes = ["git::https://github.com/joeblew999/remy-auth.git//tasks?ref=<commit>"]

[env]
PREVIEW_PORT = "4174"                                   # local host port for preview and tests
PUBLIC_ORIGIN = "http://127.0.0.1:4174"                 # origin in prerendered links for local tests
DEPLOY_ORIGIN = "https://your-app.your-subdomain.workers.dev"   # origin used by cf:deploy
```

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

El proyecto que incluye estas tareas aporta los paquetes npm que las tareas ejecutan: `vite` con `@tanstack/react-start`,
`wrangler`, `@playwright/test`, `chrome-devtools-mcp`, `modern-web-guidance`, `smol-toml`
(y `@openai/codex` para las tareas de Codex). Una tarea definida en el propio `mise.toml` del proyecto
sobrescribe la tarea incluida del mismo nombre; remy-auth sobrescribe `project:typecheck` y
`project:verify` porque es el dueño del paquete compartido.

Las pruebas se ejecutan en niveles, elegidos por costo y por lo que un cambio puede romper, nunca omitiendo comprobaciones:

| Nivel | Tarea | Ejecuta | Cuándo |
| --- | --- | --- | --- |
| Rápido | `project:test:quick` | todas nuestras comprobaciones en `QUICK_LOCALES` (por defecto `en,ar`: un idioma por sistema de escritura) | mientras se edita; no es un gate |
| Nivel 1 | `project:test`, dentro de `project:verify` | todas nuestras comprobaciones en todos los idiomas | antes de cada push, release y deploy |
| Nivel 2 | `project:test:google` (auditorías, local) y `project:test:cwv` (Core Web Vitals, en un preview de Cloudflare) | las auditorías de Lighthouse de Google; los umbrales de velocidad de Google evaluados donde Google y las personas visitantes se encuentran con el sitio | antes de cada release (`ui:release` ejecuta ambas); las auditorías también en CI en cada push y tag |

Dónde se ejecutan las comprobaciones: el comportamiento propio del paquete compartido se comprueba una vez, en remy-auth, antes de cada
release. Una app construida sobre el paquete ejecuta un conjunto de contrato (sus páginas renderizan, las páginas de sitio y de app se mantienen
separadas, sus propias funcionalidades funcionan) más el nivel de Google en sus propias páginas de sitio, no toda la suite del paquete
de nuevo. Una comprobación que ya se ha vuelto estable sigue ejecutándose en el nivel 1: las regresiones vienen del código nuevo, no de
la comprobación. Mantén el nivel 1 rápido haciendo que las comprobaciones sean baratas en su lugar (el reloj de Playwright en lugar de esperas
reales, una página de navegador por comprobación, workers en paralelo). Las comprobaciones recorren `checkedLocales` de
`@joeblew999/remy-ui/checks`, que respeta `CHECK_LOCALES`. `project:test:remote` ejecuta ambas contra un deployment. `cf:preview` sube la rama actual como
preview de Cloudflare junto a producción y ejecuta el nivel 1 contra ella; ejecuta las tareas de archivo a través de mise,
porque fuera de una tarea, el shim de Node de mise vuelve a aplicar `[env]` y reemplazaría el `PUBLIC_ORIGIN` del preview. Define `[settings] task.timings = true` en el
`mise.toml` que incluye, para que cada nivel imprima duraciones por tarea y totales.
