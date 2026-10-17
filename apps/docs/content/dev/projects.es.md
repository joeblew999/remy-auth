---
title: "Proyectos: estructura, apps nuevas y publicación"
description: "Qué guarda todo proyecto de Remy en el mismo lugar, cómo empezar una app nueva, la publicación de paquetes, las traducciones, Cloudflare y los planes. Todos los comandos están en Comandos."
translatedFrom: "114c19e8 180b034a dd9e60f8 72b80ae7 c0217a27 19dcbc6c 39363a65 b248b01b"
---

La herramienta es `remy`, el bin de `@joeblew999/remy-ui` (`packages/ui/src/cli`, un módulo de TypeScript por
comando); una app la obtiene con el paquete (`npm install`, en la versión del paquete) y la nombra en los
scripts de su `package.json`, los mismos en todas las apps (`"dev:change": "remy flow change"`). Una app indica una sola vez, en
`remy.config.ts`, dónde está desplegada y cuáles son sus puertos:

```ts
import type { RemyProject } from '@joeblew999/remy-ui/project';

export default {
  origins: { production: 'https://your-app.your-subdomain.workers.dev', docs: 'https://your-app-docs.your-subdomain.workers.dev' },
  ports: { preview: 4173, docsPreview: 4174 },   // the main checkout's; a worktree computes its own from its name
} satisfies RemyProject;
```

### La estructura [#the-layout]

Todo repositorio de Remy, remy-auth incluido, tiene los mismos archivos en los mismos lugares; lo que hay
dentro de los archivos del producto es diferente. La estructura son las rutas que leen los comandos y el
paquete, así que un archivo en cualquier otro lugar simplemente no se
encuentra; ninguna comprobación propia lo mantiene.

| Ruta | Leído por | Contiene |
| --- | --- | --- |
| `package.json`'s `scripts`, `remy.config.ts`, `.node-version` | npm, `remy` | la entrada: todos los comandos; los orígenes, los puertos y el paquete de release; la versión de Node |
| `package.json`, `package-lock.json` | npm, `remy` (workspaces) | las dependencias de la app; `workspaces` cuando es dueña de paquetes |
| `wrangler.jsonc` | wrangler, el plugin de Vite de Cloudflare, `remy cloudflare` | el nombre del Worker, los bindings y los assets |
| `vite.config.ts`, `tsconfig.json`, `playwright.config.ts` | Vite, `remy check types`, `remy test` | el build, los tipos y las comprobaciones de navegador |
| `fnox.toml`, `skills-lock.json` | fnox, `remy skills` | los nombres de los secretos; las skills fijadas |
| `src/routes/`, `src/routeTree.gen.ts` | TanStack Start (el árbol se genera) | las páginas del producto |
| `src/parts.json` | el `remyParts()` del paquete | las partes compartidas que lista la app (ninguna sin el archivo; la app en blanco lista `seo-routes`) |
| `src/api/` | la ruta `api.$` de la app | los procedimientos del producto, si tiene API |
| `tests/` (`smoke.spec.ts` por nombre) | `remy test`, el smoke en vivo tras un despliegue | las comprobaciones compartidas con los ajustes de la app, y las propias |
| `public/` | Vite | favicon, `_headers` |
| `dist/` (`dist/client/assets`) | los despliegues, las comprobaciones | resultado del build, nunca en commit |
| `docs/` (`docs.config.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `content/{users,dev,ui}/` con `i18n.json` y `meta.json`, `content/questions.json`; generados `.remy-docs/`, `dist/`) | `remy docs`, `remy i18n` (`I18N_DOCS_DIR`) | la documentación de la app: su identidad y sus páginas; el Worker es del paquete |
| `packages/<name>/` con `README.md` | `remy plans`, `remy packages` | los paquetes que publica el repositorio, si los hay |
| `messages/`, `project.inlang/` | el preset de la app, el script `generate` de la app, `remy i18n` | las cadenas propias de la app, si las hay (compiladas en `src/paraglide/`) |
| `.plans/` (`now.md`, `done/`, `parked/`) | `remy plans` | los planes del repositorio |
| `AGENTS.md`, `.github/workflows/` | agentes; GitHub | el puntero de los agentes a la documentación; CI |
| `packages/ui/src/cli/`, `template/`, `fixtures/consumer/` | el paquete; `giget`; `npm run ci -- new-app` | solo remy-auth: la propia línea de comandos, la app en blanco desde la que arranca un repositorio nuevo, y el fixture de consumidor que prueba ambos tal como los recibiría otro repositorio |

### Un consumidor nuevo [#a-new-consumer]

La receta única. Una app nueva arranca desde la app en blanco, [`template/`](https://github.com/joeblew999/remy-auth/tree/main/template)
en remy-auth en la tag de la versión: la estructura de arriba con solo los archivos propios del repositorio
dentro (sus nombres, una página de inicio en cada idioma, un índice de documentación por sitio, los
archivos de configuración de la estructura con apenas unas líneas cada uno). Todo lo demás es el paquete,
que un solo cambio de versión actualiza.

1. Requisitos: Node según indica `.node-version`, `gh auth login` con un token que tenga `read:packages`,
   Google Chrome (lo usan las comprobaciones) y `wrangler login` antes del primer despliegue.
2. `npx -y giget@3.3.1 gh:joeblew999/remy-auth/template#vX.Y.Z <name>`, luego `cd <name>` y `git init`
   (las herramientas de traducción y de planes leen el historial de git; `npm run setup` lo indica si falta).
3. Nombra la aplicación: sustituye `my-app` y `My app` (`grep -rn -i "my.app" --exclude-dir=node_modules .`):
   `package.json`, `wrangler.jsonc`, `src/service.ts`, los orígenes de `remy.config.ts`, `docs/docs.config.ts` (el
   nombre y la fuente del producto, que también lee el marco de la app) y `messages/en.json`.
4. Node según indica `.node-version`, luego `GITHUB_TOKEN=$(gh auth token) npm install` una vez para
   escribir `package-lock.json`, luego `npm run setup` (npm ci, las skills fijadas y la skill `remy`, el
   bloque de reglas de `AGENTS.md`, el registro MCP, el guardián del flujo, las comprobaciones de la
   instalación).
5. Haz commit de todo, `package-lock.json`, `skills-lock.json` y `src/routeTree.gen.ts` incluidos. Las
   cadenas de la app en blanco ya vienen traducidas; cuando el inglés cambie (`messages/en.json`, la
   documentación), haz commit de ello y traduce esto una vez a mano, `REMY_FLOW=hand npx remy i18n
   translate`, que escribe los demás idiomas (nunca hace commit: haz commit de ellos junto con el resto);
   a partir de entonces lo hace `dev:land`.
6. El primer despliegue, a mano: `npx remy cloudflare deploy`, y `npx remy cloudflare docs-deploy` para la
   documentación. Una vez que el repositorio está en GitHub (paso 7), el trabajo pasa por [el flujo](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest):
   `dev:land` para cada cambio terminado, `dev:promote` para producción y la documentación.
7. CI: `.github/workflows/ci.yml` llama al flujo de trabajo compartido de remy-auth en la misma tag (todos los
   idiomas, las auditorías de Google en cada push a `main`). Da al repositorio nuevo acceso de lectura en la
   configuración del paquete `@joeblew999/remy-ui` ("Manage Actions access"), o `npm ci` falla allí.

Después, la app crece en sus propios archivos: páginas en `src/routes/` (una página junto a la ruta de un
padre, como `videos.$videoId` al lado de `videos`, es `videos_.$videoId.tsx`: TanStack anida
`videos.$videoId` dentro de `videos`, que entonces necesita un `<Outlet />`), sus enlaces en
`src/remy-app.tsx`, cadenas en `messages/en.json` (`m` desde `src/paraglide/messages.js`), una API como
paquete de contrato y `src/api/` (todo procedimiento que recibe entrada documenta un error, o `apiChecks`
falla: la regla `api/coverage` del paquete), documentación en `docs/content/`. Pasa a una versión nueva con
`npm run upgrade -- <version>` (el paquete y la tag del flujo de trabajo de CI, juntos). Dos ejecuciones de
navegador locales a la vez comparten `PREVIEW_PORT` y la segunda falla al iniciar su servidor: dale a cada
shell el suyo (`PREVIEW_PORT=4232 npm run …`).

### Un repositorio que publica paquetes [#a-repository-that-publishes-packages]

Un repositorio también puede publicar paquetes propios (un contrato, un paquete de UI), como hace
remy-auth; eso no cuesta ningún comando propio. Sus paquetes son workspaces de npm (`packages/<name>/`,
`workspaces` de `package.json`), y cada uno que no es `private` se publica mediante `remy packages`, cuyos subcomandos están en [Comandos](./commands.mdx).

En `remy.config.ts`: `release.package` (el paquete cuya versión da nombre al release) y
`release.title`. El `exports` de un paquete nombra cada subruta que sus usuarios importan
(`"./video": "./src/video.ts"`); cualquier otra cosa se rechaza en tiempo de build y en Playwright, cuyo
mensaje nombra el archivo que importa, no el mapa de exports. Las cadenas propias de un paquete son su
propio proyecto inlang, compilado por su build, cuyo runtime sigue el idioma de la plataforma con una sola
llamada, `followLocale(runtime)` (`locale`); las tareas de i18n lo leen a través de `I18N_INLANG`. Las
comprobaciones que el repositorio añade a un release van en su script `release-checks` (remy-auth:
`template:check`, `ui:verify`). remy-auth fija la versión de un release con `npm run ui:version -- X.Y.Z`,
que la escribe en todos los lugares donde aparece (el paquete y los pines de la app en blanco).

### Elegir la versión: publicada, de desarrollo o local [#choosing-the-version-released-development-or-local]

La herramienta y el paquete son una sola cosa: el `npm run dev:release` de remy-auth publica `@joeblew999/remy-ui`
X.Y.Z, bin incluido, y etiqueta ese mismo commit como `vX.Y.Z`. Quien consume el paquete fija ese único número en su
`package.json` (y en la tag de su flujo de trabajo de CI), y `npm run upgrade -- X.Y.Z` cambia ambos. Para trabajar contra
el checkout propio de remy-auth, `npm link ../remy-auth/packages/ui` (y `npm unlink` para volver).

La plataforma aporta todos los paquetes npm que necesitan la app y las tareas, en una sola versión: son
dependencias propias de `@joeblew999/remy-ui` (el framework, la cadena de herramientas, las herramientas de
las comprobaciones), así que el `package.json` de una app nombra el paquete, sus propios paquetes y lo que
su producto añada. `the check's single-copies part` (dentro de `remy check`) falla cuando un paquete que se
rompe si se instala por duplicado (React, TanStack Router y Query, el stringifier de MDX; la lista
`remy.singleCopy` del paquete) está presente: quita el pin propio de la app. Los comandos llaman a los
ganchos propios de una app donde los tiene, como scripts de su `package.json`, que se ejecutan si existen:
`generate` (código generado antes de comprobar los tipos; el de la app en blanco compila su propio
catálogo), `local` (el estado local que una app necesita antes de ejecutarse, que `dev`, `build` y
`dev:start` ejecutan primero; remy-auth escribe ahí su `.dev.vars` y migra su D1 local), `release-checks` y
`test:consumers`.

El flujo de desarrollo es código, `packages/ui/src/cli/flow.ts`, con cuatro pasos y un guardián. El flujo, paso a paso, y quién ejecuta cada uno: [cómo trabajamos](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest); todos los comandos: [Comandos](./commands.mdx).

`remy verify` (la puerta del release) ejecuta las comprobaciones de navegador en todos los idiomas y después la prueba de app nueva, igual que las partes `browser` y `new-app` de `npm run ci`: los demás repositorios a los que este sirve, probados tal como los reciben: el script `test:consumers` de la app, nada por defecto; en remy-auth, la prueba de app nueva (`fixtures/consumer`), que construye la app en blanco y un paquete propio a partir de la plataforma de este commit
(el paquete desde un tarball con versión propia, las tareas desde una copia fuera de cualquier `node_modules`, el
`.npmrc` de la plantilla) y ejecuta la instalación, las skills (instaladas una vez por lista fijada y luego reutilizadas), los invariantes de las herramientas, la comprobación, las comprobaciones rápidas de navegador, la documentación y una publicación de prueba (dry-run) (~1,5 a 3 min, sobre todo la red).
Un cambio que rompería otro repositorio falla ahí, no en ese repositorio. Las pruebas se comprueban con tipos junto
con la app (`tsconfig.json` incluye `tests/`). Las auditorías de Google son
`npm run ci -- audits` (Lighthouse, local; CI siempre que un cambio pueda afectarlas, y en cada push a main y en cada tag) y Core Web Vitals es
`npm run test -- cwv` (en un Worker de Cloudflare desechable); el release ejecuta ambas.

Dónde se ejecutan las comprobaciones: el comportamiento propio del paquete compartido se comprueba una vez, en remy-auth, antes de cada
release. Una app construida sobre el paquete ejecuta un conjunto de contrato (sus páginas renderizan, las páginas de sitio y de app se mantienen
separadas, sus propias funcionalidades funcionan) más el nivel de Google en sus propias páginas de sitio, no toda la suite del paquete
de nuevo. Mantén las comprobaciones baratas en lugar de quitarlas (el reloj de Playwright en lugar de esperas
reales, una página de navegador por comprobación, workers en paralelo). Las comprobaciones recorren `checkedLocales` de
`@joeblew999/remy-ui/checks`, que respeta `CHECK_LOCALES` (una lista separada por comas, o `quick`: el idioma base
y el primero de derecha a izquierda, que las propias comprobaciones determinan, así que ningún comando nombra idiomas). Cada paso indica cuánto tardó.

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
TypeScript en el paquete (`packages/ui/src/cli/i18n.ts`, `translate.ts`: `remy i18n check`,
`remy i18n translate`); las tareas de abajo les reenvían.

- **Mensajes de UI** (Paraglide): los catálogos, los idiomas y el idioma base vienen del propio
  `settings.json` de inlang (`I18N_INLANG`, o si no, el único proyecto que git conoce). Se detectan: catálogos y claves
  que faltan (`jq`), `{placeholders}` perdidos o inventados (`@lingual/i18n-check`), claves cuyo inglés difiere del
  registro del catálogo (`translated-from/<locale>.json` a su lado), y las categorías de plural que necesita el idioma (`Intl.PluralRules`,
  `tasks/i18n/messages/plurals.mjs`: ninguna herramienta externa las comprueba).
- **Docs** (Fumadocs): la carpeta es `I18N_DOCS_DIR` (por defecto `docs/content`); cada sitio con un
  `i18n.json` traduce cada página en inglés a cada uno de sus idiomas. Se detectan: páginas que faltan,
  desactualizadas (su frontmatter `translatedFrom`: una huella por sección en inglés), huérfanas, y el propio texto de Fumadocs UI (`ui/<lang>.json` frente a `ui/en.json`).
- **El traductor** es el Claude Code en modo headless de la máquina (`claude -p`), sin herramientas, sin servidores
  MCP, skills ni ajustes de proyecto, y con salida estructurada: las claves de un catálogo vuelven como JSON y
  se combinan en el orden de claves del inglés; de una página desactualizada vuelven las secciones que cambiaron y se
  insertan en su sitio (una página que ya no encaja con su registro, o una que falta, vuelve completa), y solo se escribe cuando es una
  página (`page.ts`). Los prompts están en `packages/ui/src/cli/prompts.ts`. Una llamada por idioma
  (mensajes) o por página (docs), `I18N_JOBS` a la vez.
- Las comprobaciones no necesitan clave, ni red, ni historial de git (un clon superficial da la misma respuesta).
  Traducir usa el login de Claude de la máquina.
- Una app sin proyecto inlang ni sitios de documentación recibe "nothing to check" y sale con 0.

Los dos comandos, `npx remy i18n check` y `npx remy i18n translate`, con sus opciones: [Comandos](./commands.mdx).


### Cloudflare [#cloudflare]

Todos los comandos `npx remy cloudflare …`, y `npx remy test remote`, `npx remy observe` y `npx remy upgrade`, con lo que hace y lo que rechaza cada uno: [Comandos](./commands.mdx). Cada uno indica en su comentario de cabecera si es local o remoto (y de producción).

Las credenciales vienen del login de Wrangler, o del llavero a través de fnox
([herramientas](./tooling.md#secrets-fnox)).

### Planes [#plans]

La regla de los planes ([cómo trabajamos](./how-we-work.md#plans-few-short-closed)) como comandos (`npm run plans -- …`), igual en
todos los proyectos: `.plans/now.md` es la única lista ordenada, `.plans/*.md` los pocos archivos de plan abiertos,
`.plans/done/` y `.plans/parked/` el resto, `.plans/stability-log.md` opcional. Un proyecto sin
`.plans/` pasa `plans check` y no tiene nada que listar.

Los comandos, con lo que hace cada uno, están en [Comandos](./commands.mdx).

`close` y `park` cambian archivos y preparan el movimiento, pero nunca hacen commit: lee `git diff` y luego `npm run dev:change`.
