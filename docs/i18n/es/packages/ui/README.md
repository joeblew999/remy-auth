# @joeblew999/remy-ui

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
falla ante cualquier desviación (ver [docs/gui.md](../../docs/gui.md#shadcn-stock)). Los bloques son
copias propias en `src/blocks`.

## Uso [#usage]

Importa las hojas de estilo en este orden en el CSS de la app (aquí `src/styles.css`), y luego
indica a Tailwind dónde viven las clases:

```css
@import "@joeblew999/remy-ui/globals.css";
@import "@joeblew999/remy-ui/fonts.css";
@import "@joeblew999/remy-ui/text.css";
@source "../src";
@source "../node_modules/@joeblew999/remy-ui/src";
```

`fonts.css` nombra las fuentes de reserva (fallback) de fontaine; añade
`FontaineTransform.vite({ fallbacks: { 'Geist Variable': ['Arial'] } })` antes de Tailwind en la
configuración de Vite (el [`vite.config.ts`](../../vite.config.ts) de remy-auth es el ejemplo).

Cada página es de uno de dos tipos, listados en `paths`, y nunca se mezclan:

- **Páginas del sitio** (`sitePaths`) provienen de `pages`, enmarcadas por `SiteShell`: completas
  sin JavaScript, indexadas, en el sitemap, evaluadas por Lighthouse y Core Web Vitals.
- **Páginas de la app** (`appPaths`, bajo `/app`) provienen de `app-pages`, enmarcadas por
  `AppShell` (el bloque sidebar-16 de shadcn): necesitan JavaScript y `pageHead` las marca
  `noindex`. Tienen su propia exportación para que una página del sitio nunca descargue el shell de
  la app.

## Exportaciones [#exports]

Todas bajo `@joeblew999/remy-ui/`, como TSX y CSS para consumidores de Vite y Tailwind.

| Export | Qué contiene |
| --- | --- |
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
| `seo` | Canonical y alternativas `hreflang` |
| `tanstack` | `localizedWorker` (punto de entrada del Worker: observabilidad, el middleware de Paraglide y redirecciones de entrada alrededor de TanStack Start), `localeRewrite`, `pageHead`, `suggestedLocale`, `suggestedLocaleInBrowser` |
| `client` | `useSuggestedLocale`, `DeviceTime` para apps prerrenderizadas |
| `worker` | `withObservability` y los ayudantes de ID de solicitud |
| `cloudflare` | `placeFromCloudflare` |
| `showcase/*` | Piezas de demostración (showcase) de TanStack: parámetros de búsqueda y `choiceCards`, ubicación del dispositivo, guardia de salida (leave guard), zonas horarias |
| `samples` | Los valores fijos que renderizan las páginas |
| `checks`, `showcase/*.checks` | Comprobaciones de Playwright compartidas: páginas públicas, URLs de entrada (con la estrategia china), demo (dígitos nativos), formatos (calendario y dígitos propios, reglas de semana, segmentación de palabras), texto (`textChecks`: 320 px, guionización, capitalización por idioma), zonas, observabilidad, Lighthouse y Core Web Vitals, y una por cada pieza de demostración; zonas, observabilidad, la Content Security Policy, Lighthouse y Core Web Vitals, y una por cada demostración |
| `playwright` | `playwrightConfig()`, la configuración compartida de Playwright |
| `api/server` | `apiHandlers` (el OpenAPIHandler de oRPC como los handlers de una ruta de servidor de Start, con la página de referencia en `/api/doc` y el documento generado en `/api/openapi.json`), `generateSpec`, `specOptions` |
| `api/client` | `contractClient` (un cliente tipado para cualquier contrato: OpenAPILink con ResponseValidationPlugin, el idioma de la página como Accept-Language), `isomorphicClient` (el cliente propio de una app: el router en el servidor, `contractClient` en el navegador, mediante `createIsomorphicFn`) |
| `api/coverage` | `coverageProblems` (cada procedimiento tiene una ruta bajo `/api/`, una política, una salida y errores documentados), `procedures`, `ApiMeta` |
| `api/checks` | `apiChecks` (cobertura, el documento servido y la página de referencia), `reservationApiChecks` (el 400 tipado de la reserva de demostración en cada locale, y una respuesta que rompe el contrato rechazada en el navegador) |

`@tanstack/react-router`, `@tanstack/react-start`, `@playwright/test` y `lighthouse` son peers
opcionales: las páginas necesitan el router, `api/client` necesita Start, y las comprobaciones
necesitan las otras dos.

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
[registro de cambios](../../CHANGELOG.md).
