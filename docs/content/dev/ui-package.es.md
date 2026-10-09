---
title: "@joeblew999/remy-ui"
description: "La interfaz que comparten todas las apps de Remy: shadcn de fábrica, fuentes, catálogos de Paraglide, las páginas del sitio y de la app, el pegamento de TanStack Start y sus comprobaciones."
---

La interfaz que comparten todas las apps de Remy: componentes y tema de shadcn de fábrica, fuentes,
catálogos de Paraglide y ayudantes de locale, las páginas del sitio y de la app, el pegamento de
TanStack Start y las comprobaciones de Playwright que lo demuestran. Los consumidores son remy-auth
(renderizado en servidor) y [remy-auth-app](https://github.com/joeblew999/remy-auth-app)
(prerrenderizado); ambos ejecutan las mismas comprobaciones.

## shadcn, de fábrica [#shadcn-stock]

Todo lo que hay en `src/components`, `src/hooks` y `src/styles/globals.css` es lo que escribe la CLI
de shadcn fijada en una versión concreta (diseño de monorepo: el `components.json` de la app
encamina `shadcn add` hacia aquí), incluido `cn`, del propio paquete `cn` de shadcn; nada de eso se
edita a mano. `mise run ui:components` y `mise run ui:theme` los regeneran, y `mise run ui:verify`
falla ante cualquier desviación (ver [docs/gui.md](./gui.md#shadcn-stock)). Los bloques son
copias propias en `src/blocks`.

## Uso [#usage]

Importa la hoja de estilo del paquete en el CSS de la app (aquí `src/styles.css`), y luego indica a
Tailwind dónde viven las clases propias de la app. `tailwind.css` importa `globals.css`, `fonts.css`
y `text.css` en ese orden y declara el `@source` propio del paquete:

```css
@import "@joeblew999/remy-ui/tailwind.css";
@source "../src";
```

`fonts.css` nombra las fuentes de reserva (fallback) de fontaine; añade
`FontaineTransform.vite({ fallbacks: { 'Geist Variable': ['Arial'] } })` antes de Tailwind en la
configuración de Vite (el [`vite.config.ts`](https://github.com/joeblew999/remy-auth/blob/main/vite.config.ts) de remy-auth es el ejemplo).

Cada página es de uno de dos tipos, y nunca se mezclan (`isAppPath` de `paths` es la regla; cada
app lista las suyas):

- **Páginas del sitio** (las `sitePaths` de la app), enmarcadas por `SiteShell`: completas sin
  JavaScript, indexadas, en el sitemap, evaluadas por Lighthouse y Core Web Vitals.
- **Páginas de la app** (sus `appPaths`, bajo `/app`), enmarcadas por `AppShell` (el bloque
  sidebar-16 de shadcn): necesitan JavaScript y `pageHead` las marca `noindex`. `AppShell` tiene su
  propia exportación para que una página del sitio nunca lo descargue.
- **Navegación de la app**: la lista propia de la app, en su configuración `defineRemyApp` (`app-config`).

Las páginas propias de remy-auth (las páginas de inicio y de formatos, los formatos, el reloj, la
demo, la ubicación, los ajustes y la cuenta de la app, sus listas de navegación, la reserva de
demostración y sus comprobaciones) no son de la plataforma: son `@joeblew999/remy-showcase`
(`packages/showcase`, su README), para las apps que las muestran. Las tabletas y los ordenadores
obtienen la barra lateral (que se contrae a iconos); los teléfonos obtienen la barra inferior
(`blocks/bottom-nav`, piezas de shadcn de fábrica, ya que shadcn no tiene navegación inferior)
con las páginas principales y Más, que abre la barra lateral. Por qué: [el plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/mobile-navigation.md).

Lo que tiene toda app basada en el paquete, para que las tareas y comprobaciones compartidas funcionen en ella
(remy-auth-app es el ejemplo prerrenderizado):

- **Sus ajustes de marco, una sola vez, en `defineRemyApp`** (`app-config`): su nombre (el del producto, [escrito una sola vez](./gui.md#the-products-name)), el código fuente, los enlaces de la cabecera del sitio y
  de la barra lateral de la app (cada uno escrito con `linkOptions` de TanStack, de modo que se comprueba contra las propias
  rutas de la app donde está escrito). El marco compartido no nombra ninguna ruta salvo `/`, de modo que una app con otras páginas
  distintas a las de remy-auth tipa correctamente tal cual.
- **Su raíz renderiza las páginas dentro de `AppProviders`** (`providers`), con esa configuración y el idioma `preferred` del
  loader raíz: dirección de lectura, el tema (el interruptor de la cabecera y la página Ajustes lo necesitan),
  los ajustes de marco y el idioma a ofrecer, que lee cada marco, de modo que ninguna página lo pasa. Las
  `themeChecks` compartidas fallan sin él.
- **Una ruta para cada path de `appPaths` y `sitePaths`**, cada una de pocas líneas sobre la página compartida (el
  Reloj de la demostración (showcase) propaga `clockRouteOptions` desde `@joeblew999/remy-showcase/clock-route`).
- **`tests/smoke.spec.ts`**, una sola llamada a `smokeChecks(...)`: `project:test:smoke` y la comprobación tras cada
  `cf:deploy` (`project:test:live`) lo ejecutan, y fallan con «No tests found» si no existe.
- **`.plans/now.md`**, la única lista ordenada del trabajo pendiente (`plans:check`, en el nivel 0).
- **Instalaciones y actualizaciones mediante las tareas compartidas**, nunca a mano: `mise run project:setup` (instalar,
  skills, MCP, verificar) y `mise run project:upgrade-ui <version>` (la versión exacta del paquete y el include de
  tareas en el mismo tag, y después verificar). Ambas toman el token de GitHub Packages de `gh auth token`.

## Exportaciones [#exports]

Todas bajo `@joeblew999/remy-ui/`, como TSX y CSS para consumidores de Vite y Tailwind.

| Export | Qué contiene |
| --- | --- |
| `tailwind.css` | Las tres hojas de estilo de abajo en orden, más `@source` para las clases propias del paquete: una sola importación para una app |
| `globals.css`, `fonts.css`, `text.css` | La hoja de estilo de shadcn tal como la escribe la CLI; las fuentes para cada idioma; cómo se corta el texto en cada idioma (guionización por `lang`, cortes de frase en japonés) |
| `components/*`, `hooks/*`, `button` | Componentes y hooks de shadcn (`button` es también una ruta corta) |
| `paths` | `isAppPath`: si una ruta sin localizar es una página de app |
| `shell` | El marco del sitio: `SiteShell` (alias `Shell`), `Intro`, `ZoneBadge`, `SkipLink` |
| `app-shell` | Solo el marco de la app: `AppShell` (la barra lateral, la barra inferior del teléfono), para las páginas de app propias de una app. Su pie de página tiene el sello de build (`versions`) |
| `app-config` | `defineRemyApp` y sus tipos (`RemyApp`, `NavItem`): el nombre, el código fuente y la navegación de la app para cada marco; `useRemyApp`, `usePreferredLocale`. `brand` es [el nombre del producto](./gui.md#the-products-name), el único lugar donde se escribe: todo mensaje que lo menciona lo recibe como `{product}`; `pageTitle(title, brand)` es el título de una página tal como lo muestra la pestaña del navegador |
| `root` | `remyRoot(app, { devtools })`: las opciones de la ruta raíz (el documento en el idioma y dirección de la página, `AppProviders`, el idioma a ofrecer, las páginas de problema); `RemyRouterContext`, `preferredLocale`. El `__root.tsx` de una app es `createRootRouteWithContext<RemyRouterContext>()(remyRoot(remyApp, { devtools: <TanStackDevtools … /> }))`: las devtools permanecen en el archivo de la app, donde el plugin de Vite de TanStack las elimina de los builds de producción |
| `router` | `remyRouter(routeTree)`: el router que crea cada app (la reescritura de locale, un QueryClient por solicitud con la integración SSR de Query, precarga por intención, el nonce de CSP) |
| `app/vite` | `remyApp({ plugins, start, cloudflare, port, build })`: el `vite.config.ts` completo de una app (TanStack Devtools, las partes, el sello de build, Cloudflare, Fontaine, Tailwind, Start, React; el catálogo propio de la app cuando tiene `project.inlang`) |
| `providers` | `AppProviders`: dentro de lo que la raíz de una app renderiza sus páginas (dirección, tema, la configuración `defineRemyApp` de la app, el idioma `preferred`) |
| `language` | `LanguageSwitcher` (enlaces simples, páginas del sitio), `LanguageMenu` (DropdownMenu de shadcn, páginas de la app), `LanguageHint` |
| `messages`, `runtime` | Mensajes y runtime compilados de Paraglide |
| `locale` | `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`, `cookieName` de Paraglide y más, además de `direction`, `localeName` y `followLocale(runtime)` (un segundo catálogo, el de la app o el de un paquete, en el idioma de la plataforma) |
| `locale-info` | Calendarios, dígitos, reloj y convenciones de semana de Intl Locale Info; `formatLocale` (la etiqueta que usa cada formateador, que indica el calendario y los dígitos propios del idioma), `weekOrder`, `words` (Intl.Segmenter) |
| `matching` | La estrategia `custom-chinese` de Paraglide (las etiquetas de chino tradicional llegan a `zh-TW`), `matchChinese`, `preferredFromHeader`, `preferredFromNavigator` |
| `seo` | Canonical y alternativas `hreflang`; `sitemapXml({ origin, paths, extra })` (las páginas del sitio de la app en cada locale, y luego las entradas propias de la app), `robotsTxt(origin)`, `sitemapType`, `robotsType` para las dos rutas de servidor de la app |
| `prerender` | `prerenderPages({ notFoundPath, paths })`: el `prerender.pages` de TanStack Start para una app prerrenderizada (cada página sin locale y por locale, robots.txt, sitemap.xml, el 404.html de cada locale) |
| `tanstack` | `localizedWorker` (punto de entrada del Worker: observabilidad, el middleware de Paraglide y redirecciones de entrada alrededor de TanStack Start), `localeRewrite`, `pageHead`, `suggestedLocale`, `suggestedLocaleInBrowser` |
| `client` | `useSuggestedLocale`, `DeviceTime` para apps prerrenderizadas |
| `worker` | `withObservability` y los ayudantes de ID de solicitud; su `/healthz` indica qué despliegue respondió (el `Deployment` de `build`) |
| `build`, `build/vite` | [Qué versión está desplegada](./gui.md#which-version-is-deployed). `build/vite`: `remyBuild({ packages })`, el plugin de Vite detrás de `virtual:remy-build` (ya presente en `remyApp()` y `remyDocs()`), y `buildStamp()`. `build`: las formas de Zod `stamp` y `deployment` con sus tipos `Build` y `Deployment`, `askDeployment(origin)`, `deploymentQuery(origin)` (opciones de TanStack Query: consultado en el navegador, de nuevo cada cinco minutos), `sameBuild`, `shortCommit` |
| `versions` | `BuildStamp` (una línea discreta: el entorno cuando no es producción, el nombre del producto, el commit, y un control de recarga cuando el despliegue ha avanzado bajo la página) y `Versions` (esta app, su Worker de docs y los `deployments` que la app lista en `defineRemyApp`, cada uno respondiendo por sí mismo, y los paquetes de este build). Piezas de shadcn de fábrica; coloca cualquiera de las dos en cualquier lugar dentro de `AppProviders` |
| `cloudflare` | `placeFromCloudflare` |
| `problem` | Las páginas de problema localizadas: `Problem`, `NotFound`, `ErrorPage`, `problemPages` (una línea de propagación por cada ruta de página) |
| `parts`, `parts/vite`, `parts/checks` | Partes ([plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/parts.md)): una app las lista en `src/parts.json`, una por línea: las de la plataforma por nombre, las de otro paquete como `<package>/<name>`. `remyParts()` en `vite.config.ts` (su `plugin` entre los plugins, sus `routes` como `tanstackStart({ router: { virtualRouteConfig } })`) monta las rutas de cada parte listada junto a `src/routes` y genera `virtual:remy-parts` (`parts`, `hasPart`); `partChecks()` en el archivo de pruebas ejecuta las comprobaciones de cada parte listada. La parte de la plataforma es `seo-routes` (robots.txt y el sitemap); la demostración (showcase) ofrece `time-zones`, `deferred-place` y `status-card` (`@joeblew999/remy-showcase/<name>`); ver [Escribir una parte](#writing-a-part) |
| `rows`, `zod-csp` | `Group`, `Row`, `NameList`: filas de etiqueta/valor; el interruptor jitless de Zod (lo importa AppProviders) |
| `invalidate` | `invalidateEverything(router, queryClient)`: todos los loaders y consultas marcados como obsoletos y recargados (tras cerrar sesión o un cambio de rol; la actualización de la tarjeta de estado) |
| `samples` | Los valores fijos que renderizan las páginas |
| `checks`, `problem.checks`, `build-boundaries.checks`, `code-splitting.checks` | Comprobaciones de Playwright compartidas: páginas públicas, URLs de entrada (con la estrategia china), texto (`textChecks`: 320 px, guionización, capitalización por idioma), fuentes (`fontChecks`: la fuente que dibuja cada idioma es la que `fonts.css` nombra para su escritura), zonas, observabilidad, Lighthouse y Core Web Vitals, las páginas de problema, lo que descarga el navegador (`buildBoundaryChecks`) y la división de código (`codeSplittingChecks`) |
| `app-checks` | Una llamada por tipo de app para el conjunto de comprobaciones compartidas sobre las páginas propias de la app: `serverAppChecks({ service, sitePaths, appPaths, home, oneLanguage, cspEnforced })` (renderizada en servidor: URLs de entrada con redirección, CSP, fuentes) y `prerenderedAppChecks({ service, sitePaths, appPaths, home })` (páginas de entrada estáticas), ambas con el sello de build y el nombre del producto (`versions.checks`); la app solo añade comprobaciones para lo que ella añade. Una app que muestra las páginas de demostración (showcase) también llama a `showcaseChecks({ product })` (`@joeblew999/remy-showcase/showcase.checks`; `product` es su `brand`); `problemChecks` es `problem.checks` |
| `playwright` | `playwrightConfig()`, la configuración compartida de Playwright |
| `api/server` | `apiHandlers` (el OpenAPIHandler de oRPC como los handlers de una ruta de servidor de Start, con la página de referencia en `/api/doc` y el documento generado en `/api/openapi.json`; `errorStatuses`, el estado HTTP de cada uno de los códigos de error propios de la API, ya que oRPC mantiene los estados fuera de los errores; `origins`, los orígenes exactos de las apps registradas que permite el CORSHandlerPlugin de oRPC, ninguno por defecto; una respuesta a una solicitud con credenciales, y todo 401, es `no-store`), `generateSpec(router, info, errorStatuses)` (el documento OpenAPI 3.1), `ApiInfo`, `ErrorStatuses` |
| `api/guard` | El guard para la versión de oRPC instalada, que importa el router de una app: `guard()` (el middleware raíz del router: `implement(contract).$context<...>().use(guard<User>())`), `GuardContext` (el `getSession()` del contexto: la sesión de quien llama o null, que se pide solo cuando una política lo necesita, tal como lo comparte la guía de Better Auth de oRPC; y `relations`, el motor de relaciones de la app, para los procedimientos cuya política es una acción), `once` (esa búsqueda, ejecutada como máximo una vez por llamada), `signedIn(context)` (la persona para la que se ejecuta un procedimiento `session` o de acción), `noSession` (el contexto de una app que no da sesión a nadie); y todo lo de `api/guard-core` y `api/policy`. JavaScript plano, porque las comprobaciones de una app cargan su router en Node |
| `api/guard-core` | El propio guard, sin ninguna importación de oRPC, de modo que funciona tanto en oRPC 1 como en 2: `Policy` (`public`: cualquiera, y la respuesta no nombra a ninguna persona; `session`: una persona con sesión iniciada, y la respuesta es la suya propia; `{ action }`: una persona con sesión iniciada que posee una relación a la que el vocabulario de la app concede esa acción, sobre el objeto que nombra el `id` de la entrada), `guardMiddleware({ ORPCError })` (impone la `meta.policy` de cada procedimiento; para una acción pregunta al motor de relaciones, responde 404 para un objeto inexistente antes que 403, y un procedimiento que no declara ninguna política nunca se ejecuta), `guardProblems(router, { personFields, vocabulary })` (qué está mal, una frase por cada problema: sin política, sin guard por delante, una respuesta pública que nombra a una persona, una respuesta personal sin `meta.personal` que diga quién la recibe, una acción que el vocabulario no define o cuya entrada no puede nombrar su objeto), `policyOf`, `actionOf`, `isGuarded`, `walk`, `personFields` |
| `api/policy` | Lo que un procedimiento del contrato declara para el guard, como metadatos de oRPC: `policy('public' \| 'session')`, `personal('<quién la recibe>')` y `actions(vocabulary)`, que da `may('EDIT_NOTE')` exactamente para las acciones que define el vocabulario de la app, como en `oc.meta(may('EDIT_NOTE'))` |
| `api/relations` | El motor de relaciones: quién puede hacer qué se responde mediante relaciones, a partir de las tablas propias de la app en su propia D1. `defineVocabulary({ objectTypes, relations, actions, grants })` (el vocabulario de la app como datos, con las formas de fila de remy-sport: una relación se deriva de una fila de tabla, a través de un padre, de un rol de la plataforma, o la tiene todo el mundo), `relationEngine(vocabulary, db)` (`can`, `canAll`, `canFor` para los mapas de permisos de una lista entera, `holds`, `heldAmong`, `objectsHeldBy`, `usersHolding`, `audienceFor`, `objectExists`), `vocabularyProblems` y `schemaProblems` (el vocabulario contrastado consigo mismo y con el esquema que construyen sus migraciones), y los tipos `Can`, `ActionCode`, `ActionOn`, que llevan los nombres de acción de una app a su contrato y a sus páginas |
| `api/client` | `contractClient(contract, { origin })` (un cliente tipado para cualquier contrato: OpenAPILink con ResponseValidationLinkPlugin, el idioma de la página como Accept-Language; sin `origin`, el propio de la página), `isomorphicClient` (el cliente propio de una app: el router en el servidor, `contractClient` en el navegador, mediante `createIsomorphicFn`) |
| `api/coverage` | `coverageProblems(router, { errorStatuses })` (cada procedimiento tiene una ruta bajo `/api/`, una política, una salida y errores documentados, cada uno con un mensaje y un estado HTTP), `procedures`, `routeOf` (los metadatos `openapi()` de un procedimiento), `statusesOf` |
| `api/checks` | `apiChecks({ router, title, origins, errorStatuses, personFields, vocabulary })` (cobertura, el documento servido y la página de referencia, CORS exactamente para los `origins` registrados, y el guard: `guardProblems` está vacío, y todo procedimiento que necesita una sesión responde 401 a un desconocido, sin caché) |
| `versions.checks`, `build.checks` | `buildChecks({ service })` (`/healthz` indica el entorno y el build; el sello de una ejecución local es el commit de este checkout), `buildStampChecks({ path })` (el sello del marco, y el control de recarga solo cuando el despliegue responde con otro build), `productNameChecks({ paths })` (todo título termina con el nombre de la app; una app con otro nombre nunca muestra «Remy»). Los conjuntos de comprobación por app ejecutan los tres |
| `allowed`, `allowed.checks` | `<Allowed can={row.can} action="EDIT_NOTE">`: muestra sus hijos solo cuando el servidor permitió esa acción para este visitante sobre este objeto (`can` es el mapa que el servidor envió junto con la fila; solo tipa una acción que la fila lleva), de modo que una página nunca calcula los permisos por sí misma. `offeredActions(locator)` y `allowedActions(can)` permiten que la comprobación de una app compare lo que una página ofrece con lo que permite el servidor |
| `environment` | `environments({ production: {...}, local: {...} })`: la tabla de una app de lo que permite cada entorno, una fila por capacidad; `permits(env, 'capability')`, `policyFor`, `environmentOf`. El entorno se declara (`ENVIRONMENT`), y todo lo ausente o desconocido es producción |
| `mail` | `mailerFor({ capture, binding, from })`: correo mediante Cloudflare Email Service (el binding `send_email` del Worker), o guardado en el buzón de salida del Worker donde el entorno lo captura (`readOutbox`, `clearOutbox`); un rechazo dice para quién era el correo y por qué; un mensaje a una dirección a la que no puede llegar ningún correo (`unreachable`: los dominios reservados de prueba y ejemplo) nunca se envía |

Las dependencias del paquete son el único conjunto de dependencias de la plataforma, fijado con
precisión: el framework (React, TanStack Start, Router y Query), la cadena de herramientas (Vite,
Wrangler, Tailwind, TypeScript) y las herramientas que ejecutan las tareas y comprobaciones
compartidas (Playwright, Lighthouse, el servidor MCP de DevTools, npm-check-updates). Una app solo
nombra el paquete; `remy.singleCopy` en su `package.json` lista las que se rompen si se instalan dos
veces, lo que comprueba `project:single-copies`
([tareas](./tasks.md#choosing-the-version-released-development-or-local)).

## Idioma [#language]

El comportamiento de idioma es el de Paraglide: estrategias `url`, `cookie`, `custom-chinese` (el
propio hook de estrategia personalizada de Paraglide, en `matching.js`), `preferredLanguage`,
`baseLocale`, con cada locale prefijado en la URL, configurado una sola vez en `paraglide.mjs`, que
compila `messages/*.json` durante la generación de tipos y el build de Vite. Pasa `{ locale }`
explícitamente en cada llamada de mensaje; no existe un locale global para todo el proceso. Una app
renderizada en el servidor ejecuta el middleware y propaga la preferencia del visitante; una app
prerrenderizada la resuelve en el navegador tras la hidratación; ambas renderizan los mismos
componentes. Los idiomas son los `locales` de `project.inlang/settings.json`; todos los catálogos
salvo inglés y español (árabe, persa, hebreo, tailandés, japonés, chino tradicional, hindi, amárico,
polaco, turco y alemán) están escritos por un agente y sin revisar.

## Publicación [#publishing]

El paquete es `@joeblew999/remy-ui` en GitHub Packages (ahí el scope debe coincidir con el
propietario de GitHub). `mise run ui:release` hace toda la publicación desde esta máquina y se
detiene en el primer fallo: traducciones completas y al día (`i18n:check`, estricto), todas
nuestras comprobaciones (`project:verify`), los archivos de shadcn exactamente como los escribe su CLI
(`ui:verify`), las auditorías Lighthouse de Google y Core Web Vitals medidos en frío sobre un Worker de
Cloudflare desechable (`project:test:cwv`: las primeras visitas tras un despliegue, que es donde una
página lenta sale más cara). Después etiqueta `vX.Y.Z` a partir de `packages/ui/package.json`, hace
push, publica con tu token de `gh` y crea el release de GitHub a partir de la sección correspondiente
del CHANGELOG. CI (`.github/workflows/google.yml`) repite el nivel 2 sobre el tag.

Antes de publicar, un solo commit: la versión en `packages/ui/package.json` (y en
`packages/contract/package.json` cuando el contrato cambió) y la sección del CHANGELOG. Ningún otro
archivo nombra una versión: los workspaces dependen unos de otros con `"*"` y el rango de peer del
contrato es abierto. La tarea rechaza un árbol sucio, una rama distinta de main, o un tag ya existente.

Los consumidores añaden esto a su `.npmrc`:

```
@joeblew999:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

e instalan mediante `mise run project:setup`, que toma un token con `read:packages` de `gh auth token`
(o `GITHUB_TOKEN` en el shell). Las versiones publicadas están en el
[registro de cambios](https://github.com/joeblew999/remy-auth/blob/main/CHANGELOG.md).

## Escribir una parte [#writing-a-part]

Una parte es una funcionalidad que una app activa o desactiva con una línea en su `src/parts.json`. Las partes de la plataforma se
listan por nombre (`"seo-routes"`); cualquier paquete puede ofrecer partes también, listadas como `"<package>/<name>"`
(`"@joeblew999/remy-showcase/time-zones"`), y funcionan de la misma manera.

1. **Carpeta:** `src/parts/<name>/` en el paquete, con cualquiera de estos:
   - `routes/`: archivos de ruta de TanStack, montados junto a las `src/routes` propias de la app cuando la parte está listada;
   - módulos de entrada (p. ej. `ui.tsx`, `place.ts`) que la app importa como `virtual:remy-parts/<name>/<entry>`:
     las exportaciones reales cuando está listada, `undefined` cuando no, de modo que la app escribe `{Card && <Card />}` o
     `getPlace?.()` y no se envía nada cuando la parte está desactivada. Un módulo por entrada mantiene la división de código;
   - `checks.js`, cuya exportación por defecto `(options, listed) => void` ejecuta sus comprobaciones de Playwright: `partChecks()` la
     ejecuta solo cuando la parte está listada, con las `options[<name>]` propias de la app.
2. **Catálogo:** las de la plataforma son `catalog` en `src/parts/list.js`; las de otro paquete son su
   `src/parts/catalog.json`, exportado como `<package>/parts/catalog.json`, con la misma forma: `routes`, `requires` (partes que también deben
   estar listadas), `entries` (entrada → nombres de exportación), `app` (opciones que la app aporta desde su propio
   `src/parts/<name>.ts`, leído como `virtual:remy-parts/<name>/app`) y `sitePaths` (páginas del sitio que añade,
   para el sitemap y sus comprobaciones).
3. **Tipos:** declara sus módulos virtuales en el `src/parts/virtual.d.ts` propio del paquete (el de otro paquete referencia
   el de la plataforma con `/// <reference types="@joeblew999/remy-ui/parts/virtual" />`). Una parte solo enlaza con
   sus propias rutas, o con las páginas de la app mediante sus opciones `app` (la miga de pan de la parte time-zones toma
   `parent`), nunca con una página que otra app pueda no tener: el fixture consumidor lista una parte de la demostración (showcase) y
   la tipa sin las páginas de la demostración (showcase).
4. **Demuéstralo:** `mise run project:check` pasa con la parte listada, sin ella y con la lista
   vacía (ejecuta un build una vez tras editar `src/parts.json`, lo que regenera el árbol de rutas).

Lo que en cambio sigue siendo un módulo normal del paquete: el código que toda app necesita (observabilidad), un hook
que una app debe llamar siempre (leave-guard) o los controles propios de una página compartida (search-params).
</content>
</invoke>
