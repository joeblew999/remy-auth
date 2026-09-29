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

- **Sus ajustes de marco, una sola vez, en `defineRemyApp`** (`app-config`): su nombre, el código fuente, los enlaces de la cabecera del sitio y
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
| `app-shell` | Solo el marco de la app: `AppShell` (la barra lateral, la barra inferior del teléfono), para las páginas de app propias de una app |
| `app-config` | `defineRemyApp` y sus tipos (`RemyApp`, `NavItem`): el nombre, el código fuente y la navegación de la app para cada marco; `useRemyApp`, `usePreferredLocale` |
| `root` | `remyRoot(app, { devtools })`: las opciones de la ruta raíz (el documento en el idioma y dirección de la página, `AppProviders`, el idioma a ofrecer, las páginas de problema); `RemyRouterContext`, `preferredLocale`. El `__root.tsx` de una app es `createRootRouteWithContext<RemyRouterContext>()(remyRoot(remyApp, { devtools: <TanStackDevtools … /> }))`: las devtools permanecen en el archivo de la app, donde el plugin de Vite de TanStack las elimina de los builds de producción |
| `router` | `remyRouter(routeTree)`: el router que crea cada app (la reescritura de locale, un QueryClient por solicitud con la integración SSR de Query, precarga por intención, el nonce de CSP) |
| `app/vite` | `remyApp({ plugins, start, cloudflare, port })`: el `vite.config.ts` completo de una app (TanStack Devtools, las partes, Cloudflare, Fontaine, Tailwind, Start, React; el catálogo propio de la app cuando tiene `project.inlang`) |
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
| `worker` | `withObservability` y los ayudantes de ID de solicitud |
| `cloudflare` | `placeFromCloudflare` |
| `problem` | Las páginas de problema localizadas: `Problem`, `NotFound`, `ErrorPage`, `problemPages` (una línea de propagación por cada ruta de página) |
| `parts`, `parts/vite`, `parts/checks` | Partes ([plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/parts.md)): una app las lista en `src/parts.json`, un nombre por línea. `remyParts()` en `vite.config.ts` (su `plugin` entre los plugins, sus `routes` como `tanstackStart({ router: { virtualRouteConfig } })`) monta las rutas de cada parte listada junto a `src/routes` y genera `virtual:remy-parts` (`parts`, `hasPart`); `partChecks()` en el archivo de pruebas ejecuta las comprobaciones de cada parte listada. Partes actuales: `time-zones`, `deferred-place`, `seo-routes`, `status-card`; ver [Escribir una parte](#writing-a-part) |
| `parts/time-zones/page`, `parts/deferred-place/device-place`, `parts/status-card/card` | Las piezas propias de las partes: la página de zona horaria, la ubicación del dispositivo, la tarjeta de estado en vivo (`StatusCard`: la app le pasa la consulta, la de su propio cliente o la de un `contractClient` en el origen de otra app) |
| `rows`, `zod-csp` | `Group`, `Row`, `NameList`: filas de etiqueta/valor; el interruptor jitless de Zod (lo importa AppProviders) |
| `invalidate` | `invalidateEverything(router, queryClient)`: todos los loaders y consultas marcados como obsoletos y recargados (tras cerrar sesión o un cambio de rol; la actualización de la tarjeta de estado) |
| `samples` | Los valores fijos que renderizan las páginas |
| `checks`, `problem.checks`, `build-boundaries.checks`, `code-splitting.checks` | Comprobaciones de Playwright compartidas: páginas públicas, URLs de entrada (con la estrategia china), texto (`textChecks`: 320 px, guionización, capitalización por idioma), fuentes (`fontChecks`: la fuente que dibuja cada idioma es la que `fonts.css` nombra para su escritura), zonas, observabilidad, Lighthouse y Core Web Vitals, las páginas de problema, lo que descarga el navegador (`buildBoundaryChecks`) y la división de código (`codeSplittingChecks`) |
| `app-checks` | Una llamada por tipo de app para el conjunto de comprobaciones compartidas sobre las páginas propias de la app: `serverAppChecks({ service, sitePaths, appPaths, home, oneLanguage, cspEnforced })` (renderizada en servidor: URLs de entrada con redirección, CSP, fuentes) y `prerenderedAppChecks({ service, sitePaths, appPaths, home })` (páginas de entrada estáticas); la app solo añade comprobaciones para lo que ella añade. Una app que muestra las páginas de demostración (showcase) también llama a `showcaseChecks()` (`@joeblew999/remy-showcase/showcase.checks`); `problemChecks` es `problem.checks` |
| `playwright` | `playwrightConfig()`, la configuración compartida de Playwright |
| `api/server` | `apiHandlers` (el OpenAPIHandler de oRPC como los handlers de una ruta de servidor de Start, con la página de referencia en `/api/doc` y el documento generado en `/api/openapi.json`; `origins`, los orígenes exactos de las apps registradas que permite el CORSPlugin de oRPC, ninguno por defecto), `generateSpec`, `specOptions` |
| `api/client` | `contractClient` (un cliente tipado para cualquier contrato: OpenAPILink con ResponseValidationPlugin, el idioma de la página como Accept-Language), `isomorphicClient` (el cliente propio de una app: el router en el servidor, `contractClient` en el navegador, mediante `createIsomorphicFn`) |
| `api/coverage` | `coverageProblems` (cada procedimiento tiene una ruta bajo `/api/`, una política, una salida y errores documentados), `procedures`, `ApiMeta` |
| `api/checks` | `apiChecks` (cobertura, el documento servido y la página de referencia, CORS exactamente para los `origins` registrados) |

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

Una parte es una funcionalidad que una app activa o desactiva con una línea en su `src/parts.json`.

1. **Carpeta:** `src/parts/<name>/` en este paquete, con cualquiera de estos:
   - `routes/`: archivos de ruta de TanStack, montados junto a las `src/routes` propias de la app cuando la parte está listada;
   - módulos de entrada (p. ej. `ui.tsx`, `place.ts`) que la app importa como `virtual:remy-parts/<name>/<entry>`:
     las exportaciones reales cuando está listada, `undefined` cuando no, de modo que la app escribe `{Card && <Card />}` o
     `getPlace?.()` y no se envía nada cuando la parte está desactivada. Un módulo por entrada mantiene la división de código;
   - `checks.js`: sus comprobaciones de Playwright, que `partChecks()` ejecuta solo cuando está listada.
2. **Catálogo:** añádela a `catalog` en `src/parts/list.js`: `routes`, `requires` (partes que también deben
   estar listadas), `entries` (entrada → nombres de exportación), `app` (opciones que la app aporta desde su propio
   `src/parts/<name>.ts`, leído como `virtual:remy-parts/<name>/app`) y `sitePaths` (páginas del sitio que añade,
   para el sitemap y sus comprobaciones).
3. **Tipos:** declara sus módulos virtuales en `src/parts/virtual.d.ts`.
4. **Demuéstralo:** `mise run project:check` pasa con la parte listada, sin ella y con la lista
   vacía (ejecuta un build una vez tras editar `src/parts.json`, lo que regenera el árbol de rutas).

Lo que en cambio sigue siendo un módulo normal del paquete: el código que toda app necesita (observabilidad), un hook
que una app debe llamar siempre (leave-guard) o los controles propios de una página compartida (search-params).
