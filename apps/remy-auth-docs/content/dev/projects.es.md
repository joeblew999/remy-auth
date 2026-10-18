---
title: "Proyectos: estructura, apps nuevas y publicación"
description: "Qué guarda todo proyecto de Remy en el mismo lugar, cómo empezar una app nueva, la publicación de paquetes, las traducciones, Cloudflare y los planes. Todos los comandos están en Comandos."
translatedFrom: "76024556 ae418fe2 a5d3acab b93fcb78 ebcccdb4 335e995b de907ca6 bf100d42"
---

La herramienta es `remy` (y `remy-check`), los bins de `@joeblew999/remy-cli` (`packages/remy-cli/src`, un
módulo de TypeScript por comando), publicados junto con `@joeblew999/remy-ui` bajo la misma versión. Una app obtiene
ambos con `vp install`, en la versión de su catálogo, ejecuta el comando como `pnpm remy …` y lo nombra en los
scripts de su `package.json` y en las tareas de su `vite.config.ts`, los mismos en todas las apps (`"ci": "vp run ready && vp run test:browser && vp run test:audits"`).
Cada valor vive en el archivo de la herramienta que lo lee, nunca en uno nuestro: dónde se despliegan la app y su
documentación es el `.env` de Vite (la línea de comandos lo lee con el `loadEnv` de Vite), los ajustes de cada Worker
su `wrangler.jsonc`, y el entorno de cada despliegue los `vars` de Wrangler (producción, la sección `previews`, un
`.dev.vars` local):

```sh
# .env
VITE_DEPLOY_ORIGIN=https://your-app.your-subdomain.workers.dev
VITE_DOCS_ORIGIN=https://your-app-docs.your-subdomain.workers.dev
```

Un repositorio que publica paquetes guarda su release en el `.changeset/` de Changesets ([más abajo](#a-repository-that-publishes-packages)).

### La estructura [#the-layout]

Toda app de Remy tiene los mismos archivos en los mismos lugares; lo que hay dentro de los archivos del
producto es diferente. La estructura son las rutas que leen los comandos y el paquete, así que un archivo
en cualquier otro lugar simplemente no se encuentra; ninguna comprobación propia la mantiene. Una app es
una carpeta: en su propio repositorio, la raíz del repositorio. remy-auth, que además es dueño de los
paquetes, es un workspace con las mismas piezas lado a lado: los archivos de la app que se listan abajo
están en `apps/remy-auth/`, la documentación en `apps/remy-auth-docs/` (no `docs/`), los paquetes en `packages/*` (`remy-ui`, `remy-cli`, el contrato y el showcase), cada carpeta con el nombre de su
paquete, y la raíz contiene los scripts de `package.json`, `pnpm-workspace.yaml` (los paquetes y el catálogo), `.changeset/`, el `vite.config.ts` raíz (el estilo compartido y las comprobaciones del repositorio, `ready`) y
los archivos del repositorio (`.plans/`, `.github/`, `template/`), tal como `vp create vite:monorepo` organiza un workspace. Los comandos encuentran la app por su
`wrangler.jsonc` y la documentación por su `docs.config.ts`, así que se ejecutan desde la raíz en ambos
casos.

| Ruta | Leído por | Contiene |
| --- | --- | --- |
| `package.json`'s `scripts`, `.node-version` (el de remy-auth) | Vite Plus (`vp run`) | los scripts que componen las tareas (`ci`, `translate`, `release`, `setup`; el `upgrade` de una app); la versión de Node |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc` | pnpm (a través de `vp install`) | lo que importa cada paquete (`catalog:`, `workspace:*`), la versión de pnpm (`devEngines`); los paquetes del workspace, el catálogo de versiones, los overrides de copia única; GitHub Packages como registro de `@joeblew999` |
| `.env` | Vite (`import.meta.env`), `remy` (`loadEnv`) | dónde se despliegan la app y su documentación (`VITE_DEPLOY_ORIGIN`, `VITE_DOCS_ORIGIN`) |
| `.changeset/` (`config.json`, un archivo Markdown por cada cambio pendiente) | Changesets (`pnpm changeset`, `vp run release`) | cómo se versionan los paquetes en conjunto y los cambios aún sin publicar, en un repositorio que publica paquetes |
| `wrangler.jsonc` | wrangler, el plugin de Vite de Cloudflare, los builds Git de Cloudflare, `remy cloudflare` | el nombre del Worker, los bindings, los assets y el entorno (`vars`, `previews`) |
| `vite.config.ts`, `tsconfig.json`, `playwright.config.ts` | Vite Plus (las tareas escritas ahí, `vp check`), Playwright (`vp run test:browser`) | el build (`remyApp()`), cada tarea, los tipos y las comprobaciones de navegador |
| `.vite-hooks/` (`pre-commit`, `pre-push`) | Git, a través de Vite Plus (`vp config`, el script `prepare`) | los hooks: `vp staged` antes de un commit, `vp run ci` antes de un push (`VP_GIT_HOOKS=0` los omite); los copia `remy upgrade` |
| `fnox.toml`, `skills-lock.json` | fnox; la CLI `skills` | los nombres de los secretos; las skills fijadas |
| `src/routes/`, `src/routeTree.gen.ts` | TanStack Start (el árbol se genera) | las páginas del producto |
| `src/parts.json` | el `remyParts()` del paquete | las partes compartidas que lista la app (ninguna sin el archivo; la app en blanco lista `seo-routes`) |
| `src/api/` | la ruta `api.$` de la app | los procedimientos del producto, si tiene API |
| `tests/` (`smoke.spec.ts` por nombre) | `remy test` (`remy test live`: el smoke contra un despliegue) | las comprobaciones compartidas con los ajustes de la app, y las propias |
| `public/` | Vite | favicon, `_headers` |
| `dist/` (`dist/client/assets`) | Wrangler (el despliegue, su simulacro), las comprobaciones | resultado del build, nunca en commit |
| `docs/` (`docs.config.ts` con su `contract`, `collections.ts`, `wrangler.jsonc`, `vite.config.ts`, `tsconfig.json`, `package.json`, `content/{users,dev,ui}/` con `i18n.json` y `meta.json`, `content/questions.json`; `dist/` generado) | sus propias tareas, `remy docs`, `remy i18n` | la documentación de la app: su identidad y sus páginas, las colecciones de Fumadocs (en commit), los ajustes del Worker de la documentación; el código del Worker es del paquete |
| `packages/<name>/` con `README.md` (y `CHANGELOG.md`, de Changesets) | pnpm, Changesets | los paquetes que publica el repositorio, si los hay |
| `messages/`, `project.inlang/` | el preset de la app, la tarea `generate` de la app, `remy i18n` | las cadenas propias de la app, si las hay (compiladas en `src/paraglide/`) |
| `.plans/` (`now.md`, `done/`, `parked/`) | `remy plans` | los planes del repositorio |
| `AGENTS.md`, `.mcp.json`, `.codex/config.toml`, `.github/workflows/` | agentes; Claude y Codex; GitHub | el puntero de los agentes a la documentación; los servidores MCP; CI |
| `packages/remy-cli/src/`, `template/`, `fixtures/consumer/` | el paquete; `giget`; `vp run new-app` | solo remy-auth: la propia línea de comandos, la app en blanco desde la que arranca un repositorio nuevo, y el fixture de consumidor que prueba ambos tal como los recibiría otro repositorio |

### Un consumidor nuevo [#a-new-consumer]

La receta única. Una app nueva arranca desde la app en blanco, [`template/`](https://github.com/joeblew999/remy-auth/tree/main/template)
en remy-auth en la tag de la versión: la estructura de arriba con solo los archivos propios del repositorio
dentro (sus nombres, una página de inicio en cada idioma, un índice de documentación por sitio, los
archivos de configuración de la estructura con apenas unas líneas cada uno). Todo lo demás es el paquete,
que un solo cambio de versión actualiza.

1. Requisitos: el `vp` de la máquina en modo gestionado ([herramientas para desarrollo](./tooling.md#vite-plus-the-machines-vp-in-managed-mode)),
   Node 26, `gh auth login` con un token que tenga `read:packages` y, en Linux, la fuente `fonts-noto-cjk` (las comprobaciones de navegador instalan el Chromium propio de Playwright).
2. `vpx giget@3.3.1 gh:joeblew999/remy-auth/template#vX.Y.Z <name>`, luego `cd <name>` y `git init`
   (las herramientas de traducción y de planes leen el historial de git; `vp run setup` lo indica si falta).
3. Nombra la aplicación: sustituye `my-app` y `My app` (`grep -rn -i "my.app" --exclude-dir=node_modules .`):
   `package.json`, `wrangler.jsonc`, `src/service.ts`, los orígenes de `.env`, `docs/wrangler.jsonc`,
   `docs/docs.config.ts` (el nombre y la fuente del producto, que también lee el marco de la app) y `messages/en.json`.
4. El token de GitHub Packages en la configuración de pnpm de esta máquina, una sola vez (pnpm no lee ningún token del
   `.npmrc` de un repositorio, que solo nombra el registro): `pnpm config set --location user //npm.pkg.github.com/:_authToken "$(gh auth token)"`.
   Luego `vp install` una vez para escribir `pnpm-lock.yaml`, y después `vp run setup` (el token otra vez, la instalación, las skills
   fijadas de `skills-lock.json` y la skill `remy` del paquete, el bloque de reglas de `AGENTS.md` y, por último,
   `vp run ready`).
5. Haz commit de todo, `pnpm-lock.yaml`, `skills-lock.json` y `src/routeTree.gen.ts` incluidos. Las
   cadenas de la app en blanco ya vienen traducidas; cuando el inglés cambie (`messages/en.json`, la
   documentación), ejecuta `vp run translate`, que escribe los demás idiomas (nunca hace commit: haz commit de ellos junto con el resto);
   a partir de entonces se ejecuta antes de cada commit que cambie texto.
6. Desplegar es un push: conecta el repositorio a los builds Git de Cloudflare, uno por Worker (la app en la raíz, la
   documentación en `docs/`), con los ajustes de build de remy-auth ([en Cloudflare](./run-and-test.md#on-cloudflare); `remy upgrade`
   imprime el comando de build). Crear las bases de datos y los secretos que nombra un binding corresponde a quien es
   dueño (`pnpm remy cloudflare provisioned` indica qué falta). A partir de ahí el trabajo pasa por
   [el flujo](./how-we-work.md#the-flow-the-standard-way-in-plain-sight): cada cambio terminado se sube a `main`,
   y cada push a `main` despliega.
7. CI: `.github/workflows/ci.yml` llama al flujo de trabajo compartido de remy-auth en la misma tag. Da al repositorio nuevo acceso de lectura
   en la configuración de los paquetes `@joeblew999/remy-ui` y `@joeblew999/remy-cli` ("Manage Actions access"), o
   su instalación falla allí.

Después, la app crece en sus propios archivos: páginas en `src/routes/` (una página junto a la ruta de un
padre, como `videos.$videoId` al lado de `videos`, es `videos_.$videoId.tsx`: TanStack anida
`videos.$videoId` dentro de `videos`, que entonces necesita un `<Outlet />`), sus enlaces en
`src/remy-app.tsx`, cadenas en `messages/en.json` (`m` desde `src/paraglide/messages.js`), una API como
paquete de contrato y `src/api/` (todo procedimiento que recibe entrada documenta un error, o `apiChecks`
falla: la regla `api/coverage` del paquete), documentación en `docs/content/`. Pasa a una versión nueva con
`vp run upgrade <version>`: `@joeblew999/remy-ui` y `@joeblew999/remy-cli` en esa versión (`vp add`), la tag del
flujo de trabajo de CI, los scripts, los archivos de `.vite-hooks/` y `vite.config.ts` de la app en blanco (uno antiguo se conserva como
`vite.config.ts.before-upgrade`, para volver a mover a él sus propios plugins y opciones), `pnpm-workspace.yaml`, el
`collections.ts` y el `wrangler.jsonc` de la documentación donde la app no los tenga, y los orígenes de un
`remy.config.ts` antiguo movidos a `.env` y el archivo eliminado; imprime el comando de build de Cloudflare, que
vive en Cloudflare, y termina indicando que ejecutes `vp run setup` (las skills, las reglas, todas las comprobaciones), cosa que no
hace por sí mismo. Una app en la 0.15.1 instala primero a mano los dos paquetes
en la versión nueva, porque el upgrade de la 0.15.1 no puede. Dos ejecuciones de navegador locales a la vez comparten
`PREVIEW_PORT` y la segunda falla al iniciar su servidor: dale a cada shell el suyo (`PREVIEW_PORT=4232 vp run …`).

### Un repositorio que publica paquetes [#a-repository-that-publishes-packages]

Un repositorio también puede publicar paquetes propios (un contrato, un paquete de UI), como hace
remy-auth; eso no cuesta ningún comando propio: es [Changesets](https://github.com/changesets/changesets) (`@changesets/cli`, configurado
en `.changeset/config.json`). Sus paquetes son los del workspace (`packages/<name>/`, listados en
`pnpm-workspace.yaml`), y cada uno que no es `private` se publica con `changeset publish` (el publish de pnpm, que
escribe cada versión de `catalog:` y `workspace:`). Un cambio en un paquete publicado lleva un changeset:
`pnpm changeset` pregunta qué paquetes y hasta dónde (patch, minor, major) y escribe `.changeset/<name>.md`, que se
hace commit junto con el cambio. El `config.json` de remy-auth hace de remy-ui y remy-cli un grupo `fixed`, siempre publicado bajo una
sola versión; el showcase y el contrato se versionan por su cuenta. En un release, `changeset version` convierte los
changesets pendientes en las versiones nuevas y en la sección de `CHANGELOG.md` de cada paquete. Para probar en otro lugar los paquetes de un checkout,
`pnpm -r pack` (o `pnpm pack` en un solo paquete) genera el tarball que haría el publish.

El `exports` de un paquete nombra cada subruta que sus usuarios importan (`"./video": "./src/video.ts"`);
cualquier otra cosa se rechaza en tiempo de build y en Playwright, cuyo mensaje nombra el archivo que importa, no el
mapa de exports. Las cadenas propias de un paquete son su propio proyecto inlang, compilado por su build, cuyo runtime
sigue el idioma de la plataforma con una sola llamada, `followLocale(runtime)` (`locale`); las herramientas de traducción encuentran
el proyecto inlang del repositorio a través de git. Las comprobaciones que el repositorio añade a un release son pasos de su propio
script `release`, después de `vp run ci` (remy-auth: `vp run ui:verify`). El `scripts/version.ts` de remy-auth, que se ejecuta después de
`changeset version`, vuelve a fijar la app en blanco a la versión nueva de remy-ui (el catálogo de `template/pnpm-workspace.yaml` y la tag de
`template/.github/workflows/ci.yml`), y después el lockfile.

### Elegir la versión: publicada, de desarrollo o local [#choosing-the-version-released-development-or-local]

El `vp run release` de remy-auth versiona los paquetes a partir de sus changesets, comprueba, hace commit ("Release vX.Y.Z") y
etiqueta el commit como `vX.Y.Z` (`vp run release:tag`, que sube main y la tag); después el job de release de GitHub publica
`@joeblew999/remy-ui` X.Y.Z y, a su lado, la línea de comandos, `@joeblew999/remy-cli` (los comandos `remy` y `remy-check`),
siempre en la misma versión, junto con el showcase y el contrato cuando un changeset subió su versión. Todavía no se
publica ninguno de los dos de esta forma, y publicar es cosa del job de release, nunca de una sesión en la nube. Quien consume
fija ambos en su catálogo (`pnpm-workspace.yaml`, y la tag de su flujo de trabajo de CI), y `vp run upgrade X.Y.Z` los mueve, junto con los
scripts, los hooks y la configuración de la app en blanco en esa tag. Para probar el checkout propio de remy-auth en una app, haz lo que
hace la prueba de app nueva: `pnpm pack` de los paquetes en remy-auth (`pnpm -r pack` para todos) y apunta el catálogo y los overrides de la app a los
tarballs (`file:./vendor/remy-ui.tgz`).

Cada paquete lista lo que importa, en la versión del catálogo (`catalog:`): el `package.json` de una app nombra los dos
paquetes de la plataforma, los paquetes del framework que importan sus propios archivos, las herramientas que llaman sus tareas (Wrangler, Playwright,
Vite Plus), sus propios paquetes y lo que añada su producto. Las herramientas que ejecutan las tareas compartidas son
dependencias de remy-cli. Un paquete que se rompe si se instala por duplicado (React, TanStack Router y Query, el stringifier de MDX)
tiene una sola copia mediante los `overrides` de `pnpm-workspace.yaml`, en la versión del catálogo: el propio pnpm lo mantiene en una. La preparación propia de una app es una tarea en su propio `vite.config.ts`: una tarea `local` (el estado local que necesita antes de ejecutarse, que sus
`dev` y `build` nombran primero; remy-auth escribe ahí su `.dev.vars` y migra su D1 local) y su `generate`
(su propio catálogo, `project.inlang`, compilado con los tipos del Worker). Sus propias comprobaciones de release son pasos de su
script `release`.

El flujo son los scripts y las tareas de Vite Plus; cada paso y quién lo ejecuta: [cómo trabajamos](./how-we-work.md#the-flow-the-standard-way-in-plain-sight); todos los comandos: [Comandos](./commands.mdx).

`vp run release` ejecuta, después de `vp run ci`, la prueba de app nueva de remy-auth
(`vp run new-app`, `fixtures/consumer/run.sh`; no forma parte de `vp run ci`, así que un push no la espera): los demás repositorios a los que este sirve, probados tal como los reciben. Copia
`template/` a una carpeta temporal y le superpone `fixtures/consumer/files` (archivos terminados: un paquete propio de la app,
su API y una parte del showcase; una comprobación unitaria los contrasta con la app en blanco), empaqueta remy-ui, remy-cli y el
showcase en su `vendor/` con `pnpm pack` (cada uno con una versión que ningún registro tiene), y luego instala y ejecuta las
skills (`skills experimental_install` y `experimental_sync`, una vez por `skills-lock.json` y luego reutilizadas), la comprobación de
`wrangler.jsonc` (`remy-check wrangler`), el `vp run ready` de la app, las comprobaciones rápidas de
navegador y las de la documentación (unos 93 s); Vite Plus lo guarda en caché según de qué está hecha una app nueva, así que un cambio en
la app propia de remy-auth o en la documentación de su producto ya no lo ejecuta.
Un cambio que rompería otro repositorio falla ahí, no en ese repositorio. Las pruebas se comprueban con tipos junto
con la app (`tsconfig.json` incluye `tests/`). Las auditorías de Google son
`vp run test:audits` (Lighthouse, local; parte de `vp run ci`, así que de cada push) y Core Web Vitals es
`pnpm remy test cwv` (en un despliegue: producción, o el Preview de una rama), que se ejecuta a mano después de un despliegue.

Dónde se ejecutan las comprobaciones: el comportamiento propio del paquete compartido se comprueba una vez, en remy-auth, antes de cada
release. Una app construida sobre el paquete ejecuta un conjunto de contrato (sus páginas renderizan, las páginas de sitio y de app se mantienen
separadas, sus propias funcionalidades funcionan) más el nivel de Google en sus propias páginas de sitio, no toda la suite del paquete
de nuevo. Mantén las comprobaciones baratas en lugar de quitarlas (el reloj de Playwright en lugar de esperas
reales, una página de navegador por comprobación, workers en paralelo). Las comprobaciones recorren `checkedLocales` de
`@joeblew999/remy-ui/checks`: un idioma por cada forma en que la app dibuja el texto por defecto, todos los idiomas con
`CHECK_LOCALES=all` (el release), `quick` para el idioma base y el primero de derecha a izquierda, o una lista separada por comas; las propias comprobaciones determinan los idiomas, así que ningún comando los nombra ([cuáles y por qué](./run-and-test.md)). Cada paso indica cuánto tardó.

### Traducciones [#translations]

Una misma estructura en cada app, para que los mismos comandos `remy i18n` funcionen en todas partes (la regla sobre quién traduce es
[en el cambio](./how-we-work.md#translations-in-the-change)):

| Qué | Inglés | Traducción |
| --- | --- | --- |
| Docs | `docs/content/<site>/<page>.md` o `.mdx` (estructura de Fumadocs) | a su lado: `<page>.<locale>.md` o `.mdx` |
| Catálogos de UI | el catálogo del idioma base de cada proyecto inlang (`<dir>/project.inlang`) | el catálogo de cada idioma, según el `pathPattern` propio del proyecto (p. ej. `messages/<locale>.json`) |

Dos flujos, uno para cada tipo de texto, con el mismo patrón en ambos: detectar sin conexión a partir del
registro de cada traducción sobre lo que se tradujo, traducir con el Claude Code de la máquina (headless, sin
herramientas) y escribir las traducciones y sus registros (el commit del cambio los incluye). Ambos son
TypeScript en el paquete (`packages/remy-cli/src/i18n.ts`, `translate.ts`: `remy i18n check`,
`remy i18n translate`); la tarea `check:translations` y el script `translate` los ejecutan.

- **Mensajes de UI** (Paraglide): los catálogos, los idiomas y el idioma base vienen del propio
  `settings.json` de inlang (el único proyecto que git conoce). Se detectan (`packages/remy-cli/src/i18n.ts`): catálogos y claves
  que faltan, `{placeholders}` perdidos o inventados, claves cuyo inglés difiere del
  registro del catálogo (`translated-from/<locale>.json` a su lado), y las categorías de plural que necesita el idioma (`Intl.PluralRules`: ninguna herramienta externa las comprueba).
- **Docs** (Fumadocs): la carpeta es el `content/` del paquete de documentación (`docs/content`, o `apps/remy-auth-docs/content` en remy-auth); cada sitio con un
  `i18n.json` traduce cada página en inglés a cada uno de sus idiomas. Se detectan: páginas que faltan,
  desactualizadas (su frontmatter `translatedFrom`: una huella por sección en inglés), huérfanas, y el propio texto de Fumadocs UI (`ui/<lang>.json` frente a `ui/en.json`).
- **El traductor** es el Claude Code en modo headless de la máquina (`claude -p`), sin herramientas, sin servidores
  MCP, skills ni ajustes de proyecto, y con salida estructurada: las claves de un catálogo vuelven como JSON y
  se combinan en el orden de claves del inglés; de una página desactualizada vuelven las secciones que cambiaron y se
  insertan en su sitio (una página que ya no encaja con su registro, o una que falta, vuelve completa), y solo se escribe cuando es una
  página (`page.ts`). Los prompts están en `packages/remy-cli/src/prompts.ts`. Una llamada por idioma
  (mensajes) o por página (docs), ocho a la vez (`--jobs`).
- Las comprobaciones no necesitan clave, ni red, ni historial de git (un clon superficial da la misma respuesta).
  Traducir usa el login de Claude de la máquina.
- Una app sin proyecto inlang ni sitios de documentación recibe "nothing to check" y sale con 0.

Los dos comandos, `pnpm remy i18n check` y `pnpm remy i18n translate`, con sus opciones: [Comandos](./commands.mdx).


### Cloudflare [#cloudflare]

Todos los comandos `pnpm remy cloudflare …`, y `pnpm remy test remote`, `pnpm remy observe` y `pnpm remy upgrade`, con lo que hace y lo que rechaza cada uno: [Comandos](./commands.mdx). Cada uno indica en su comentario de cabecera si es local o remoto (y de producción).

Las credenciales vienen del login de Wrangler, o del llavero a través de fnox
([herramientas](./tooling.md#secrets-fnox)).

### Planes [#plans]

La regla de los planes ([cómo trabajamos](./how-we-work.md#plans-few-short-closed)) como comandos (`pnpm remy plans …`), igual en
todos los proyectos: `.plans/now.md` es la única lista ordenada, `.plans/*.md` los pocos archivos de plan abiertos,
`.plans/done/` y `.plans/parked/` el resto, `.plans/stability-log.md` opcional. Un proyecto sin
`.plans/` pasa `plans check` y no tiene nada que listar.

Los comandos, con lo que hace cada uno, están en [Comandos](./commands.mdx).

`close` y `park` cambian archivos y preparan el movimiento, pero nunca hacen commit: lee `git diff` y luego `vp run ready`.
