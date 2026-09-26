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

Cada página es de uno de dos tipos, listados en `paths`, y nunca se mezclan:

- **Páginas del sitio** (`sitePaths`) provienen de `pages`, enmarcadas por `SiteShell`: completas
  sin JavaScript, indexadas, en el sitemap, evaluadas por Lighthouse y Core Web Vitals.
- **Páginas de la app** (`appPaths`, bajo `/app`) provienen de `app-pages`, enmarcadas por
  `AppShell` (el bloque sidebar-16 de shadcn): necesitan JavaScript y `pageHead` las marca
  `noindex`. Tienen su propia exportación para que una página del sitio nunca descargue el shell de
  la app.
- **Navegación de la app**: una sola lista, `app-nav.tsx`. Las tabletas y los ordenadores obtienen la barra lateral (que se contrae a iconos);
  los teléfonos obtienen la barra inferior (`blocks/bottom-nav`, piezas de shadcn de fábrica, ya que shadcn no tiene navegación inferior)
  con las páginas principales y Más, que abre la barra lateral. Por qué: [el plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/mobile-navigation.md).

## Exportaciones [#exports]

Todas bajo `@joeblew999/remy-ui/`, como TSX y CSS para consumidores de Vite y Tailwind.

| Export | Qué contiene |
| --- | --- |
| `tailwind.css` | Las tres hojas de estilo de abajo en orden, más `@source` para las clases propias del paquete: una sola importación para una app |
| `globals.css`, `fonts.css`, `text.css` | La hoja de estilo de shadcn tal como la escribe la CLI; las fuentes para cada idioma; cómo se corta el texto en cada idioma (guionización por `lang`, cortes de frase en japonés) |
| `components/*`, `hooks/*`, `button` | Componentes y hooks de shadcn (`button` es también una ruta corta) |
| `paths` | `sitePaths`, `appPaths`, `allPaths`, `isAppPath` |
| `pages` | `SiteShell` (alias `Shell`), `HomePage`, `FormatsContent`, `FormatsPage`, `Intro`, `ZoneBadge`, `SkipLink`, `Group`, `Row` |
| `shell` | Solo el marco del sitio: `SiteShell` (alias `Shell`), `SiteNavLinks`, `Intro`, `ZoneBadge`, `SkipLink` (también exportado por `pages`); impórtalo donde una página solo necesite el marco, para que las páginas de inicio y de formatos no formen parte de la descarga de esa página |
| `app-pages` | `AppShell`, `AppHomePage`, `AppFormatsPage`, `LocationPage`, `DemoPage` |
| `language` | `LanguageSwitcher` (enlaces simples, páginas del sitio), `LanguageMenu` (DropdownMenu de shadcn, páginas de la app), `LanguageHint` |
| `messages`, `runtime` | Mensajes y runtime compilados de Paraglide |
| `locale` | `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`, `cookieName` de Paraglide y más, además de `direction` y `localeName` |
| `locale-info` | Calendarios, dígitos, reloj y convenciones de semana de Intl Locale Info; `formatLocale` (la etiqueta que usa cada formateador, que indica el calendario y los dígitos propios del idioma), `weekOrder`, `words` (Intl.Segmenter) |
| `matching` | La estrategia `custom-chinese` de Paraglide (las etiquetas de chino tradicional llegan a `zh-TW`), `matchChinese`, `preferredFromHeader`, `preferredFromNavigator` |
| `reservation` | El esquema Zod de la reserva de demostración (asientos escritos con los dígitos de cualquier escritura), `asciiDigits` |
| `seo` | Canonical y alternativas `hreflang`; `sitemapXml({ origin, extra })` (cada página del sitio en cada locale, y luego las entradas propias de la app), `robotsTxt(origin)`, `sitemapType`, `robotsType` para las dos rutas de servidor de la app |
| `prerender` | `prerenderPages({ notFoundPath })`: el `prerender.pages` de TanStack Start para una app prerrenderizada (cada página sin locale y por locale, robots.txt, sitemap.xml, el 404.html de cada locale) |
| `tanstack` | `localizedWorker` (punto de entrada del Worker: observabilidad, el middleware de Paraglide y redirecciones de entrada alrededor de TanStack Start), `localeRewrite`, `pageHead`, `suggestedLocale`, `suggestedLocaleInBrowser` |
| `client` | `useSuggestedLocale`, `DeviceTime` para apps prerrenderizadas |
| `worker` | `withObservability` y los ayudantes de ID de solicitud |
| `cloudflare` | `placeFromCloudflare` |
| `problem` | Las páginas de problema localizadas: `Problem`, `NotFound`, `ErrorPage`, `problemPages` (una línea de propagación por cada ruta de página) |
| `preferred` | `usePreferred`, el idioma `preferred` del loader raíz, para las rutas de página (el loader raíz de la app lo devuelve) |
| `parts`, `parts/vite`, `parts/checks` | Partes ([plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/parts.md)): una app las lista en `src/parts.json`, un nombre por línea. `remyParts()` en `vite.config.ts` (su `plugin` entre los plugins, sus `routes` como `tanstackStart({ router: { virtualRouteConfig } })`) monta las rutas de cada parte listada junto a `src/routes` y genera `virtual:remy-parts` (`parts`, `hasPart`); `partChecks()` en el archivo de pruebas ejecuta las comprobaciones de cada parte listada. Partes actuales: `time-zones`, `deferred-place`, `seo-routes`, `status-card`; ver [Escribir una parte](#writing-a-part) |
| `showcase/*` | Piezas de demostración (showcase) de TanStack: parámetros de búsqueda y `choiceCards`, ubicación del dispositivo, guardia de salida (leave guard), zonas horarias, la tarjeta de estado en vivo (`StatusCard`: la app le pasa la consulta, la de su propio cliente o la de un `contractClient` en el origen de otra app) |
| `invalidate` | `invalidateEverything(router, queryClient)`: todos los loaders y consultas marcados como obsoletos y recargados (tras cerrar sesión o un cambio de rol; la actualización de la tarjeta de estado) |
| `samples` | Los valores fijos que renderizan las páginas |
| `checks`, `showcase/*.checks` | Comprobaciones de Playwright compartidas: páginas públicas, URLs de entrada (con la estrategia china), demo (dígitos nativos), formatos (calendario y dígitos propios, reglas de semana, segmentación de palabras), texto (`textChecks`: 320 px, guionización, capitalización por idioma), fuentes (`fontChecks`: la fuente que dibuja cada idioma es la que `fonts.css` nombra para su escritura), zonas, observabilidad, Lighthouse y Core Web Vitals, y una por cada pieza de demostración; zonas, observabilidad, la Content Security Policy, Lighthouse y Core Web Vitals, y una por cada demostración |
| `app-checks` | Una llamada por tipo de app para el conjunto de comprobaciones compartidas: `serverAppChecks({ service, ownSitePaths, oneLanguage, formats })` (renderizada en servidor: URLs de entrada con redirección, CSP, fuentes) y `prerenderedAppChecks({ service })` (páginas de entrada estáticas, filas de demostración sin funciones de servidor); la app solo añade comprobaciones para lo que ella añade |
| `playwright` | `playwrightConfig()`, la configuración compartida de Playwright |
| `api/server` | `apiHandlers` (el OpenAPIHandler de oRPC como los handlers de una ruta de servidor de Start, con la página de referencia en `/api/doc` y el documento generado en `/api/openapi.json`; `origins`, los orígenes exactos de las apps registradas que permite el CORSPlugin de oRPC, ninguno por defecto), `generateSpec`, `specOptions` |
| `api/client` | `contractClient` (un cliente tipado para cualquier contrato: OpenAPILink con ResponseValidationPlugin, el idioma de la página como Accept-Language), `isomorphicClient` (el cliente propio de una app: el router en el servidor, `contractClient` en el navegador, mediante `createIsomorphicFn`) |
| `api/coverage` | `coverageProblems` (cada procedimiento tiene una ruta bajo `/api/`, una política, una salida y errores documentados), `procedures`, `ApiMeta` |
| `api/checks` | `apiChecks` (cobertura, el documento servido y la página de referencia, CORS exactamente para los `origins` registrados), `reservationApiChecks` (el 400 tipado de la reserva de demostración en cada locale, y una respuesta que rompe el contrato rechazada en el navegador) |

`@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/react-query`, `@playwright/test` y
`lighthouse` son peers opcionales: las páginas necesitan el router, `api/client` necesita Start, la
tarjeta de estado e `invalidate` necesitan Query, y las comprobaciones necesitan las otras dos.

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
propietario de GitHub). `mise run ui:release` hace toda la publicación desde esta máquina: ejecuta
`project:verify` (todas las comprobaciones, en local) y `ui:verify` (los archivos de shadcn sin
cambios), publica con tu token de `gh`, etiqueta `vX.Y.Z` a partir de `packages/ui/package.json`,
hace push y crea el release de GitHub a partir de la sección correspondiente del CHANGELOG,
condicionado solo al nivel 1 (nuestras propias comprobaciones, alrededor de 1½ minutos). CI
(`.github/workflows/google.yml`) ejecuta el nivel 2, las auditorías Lighthouse de Google y Core Web
Vitals, en cada push y tag, y publica un tag ya empujado por sí mismo salvo que la versión ya esté
publicada, de modo que cualquiera de las dos rutas funciona. Primero incrementa la versión y el
CHANGELOG; la tarea rechaza un árbol sucio, una rama distinta de main, o un tag ya existente.

Los consumidores añaden esto a su `.npmrc`:

```
@joeblew999:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

e instalan con un token que tenga `read:packages`. Las versiones publicadas están en el
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
