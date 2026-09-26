# Registro de cambios [#changelog]

Todos los cambios importantes del paquete de UI compartido `@joeblew999/remy-ui` se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y el
paquete sigue [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Añadido [#added]
- `checks`: `fontChecks` impone un presupuesto de bytes de fuentes: una primera visita a cada página
  del sitio descarga como mucho `fontBudget` (300 KB, opción `budget`) de fuentes, en cada idioma.
  Medido en una compilación de producción local: de 28,7 KB (latino) a 227,2 KB (`/ar/formats`)
  (`.plans/fonts.md`, paso 1). Nuevas exportaciones `fontBudget` y `systemFontScripts`.

### Cambiado [#changed]
- `fonts.css`: el japonés y el chino tradicional se dibujan con la fuente del sistema para su idioma
  (Chrome la elige por el `lang` de la página: Hiragino Kaku Gothic ProN y PingFang TC en macOS).
  Sus fuentes web Noto costaban de 351 KB (`/ja`) a 1.176 KB (`/zh-TW/formats`) por primera visita;
  ahora 0 bytes además de Geist. Se eliminan las dependencias `@fontsource-variable/noto-sans-jp` y
  `-tc`, y los archivos de fuentes de la compilación bajan de 496 a 25.
- `fonts.css`: el persa se dibuja con Vazirmatn (`@fontsource-variable/vazirmatn` 5.3.0, un diseño
  pensado para el persa; fontsource no tiene una Noto persa) en lugar de Noto Sans Arabic: `/fa`
  descarga 74 KB de fuentes en lugar de 191 KB, `/fa/formats` 108 KB en lugar de 259 KB. El árabe
  mantiene Noto Sans Arabic.
- `checks`: `fontChecks` permite que una fuente del sistema dibuje una página Han, nunca tofu
  (LastResort), y su comprobación Han compara las fuentes que realmente dibujan el título de cada
  idioma en lugar de los nombres del CSS, así que el japonés y el chino tradicional dibujados por una
  misma fuente siguen fallando. Cualquier otra escritura sigue necesitando su fuente web.
### Cambiado [#changed]
- `checks`: `cspChecks({ enforce })`, por defecto `true`: espera la política con nonce en
  `Content-Security-Policy` (y ninguna en `Content-Security-Policy-Report-Only`), o al revés con
  `enforce: false`; comprueba también la política de la página de no encontrado; aplicada, prueba
  que un script sin el nonce se bloquea y se notifica. `serverAppChecks({ cspEnforced })` pasa el
  interruptor de la app. Una app que aún envía la política solo como informe pasa `cspEnforced: false`.

## [0.11.0] - 2026-09-25 [#0110---2026-09-25]

### Añadido [#added-1]
- Partes (`.plans/parts.md`): `./parts` (`readParts`, `catalog`), `./parts/vite` (`remyParts()`: un
  plugin de Vite que genera `virtual:remy-parts` a partir del `src/parts.json` de la app, y la
  configuración de rutas que monta las rutas de cada parte listada mediante `virtualRouteConfig` y
  `physical()` de TanStack), `./parts/checks` (`partChecks()`). Primera parte: `time-zones` (la ruta
  `/time-zones/$` y sus comprobaciones), de modo que una app la añade o la quita con una línea. Nueva
  dependencia `@tanstack/virtual-file-routes`.
- `./problem` (`Problem`, `NotFound`, `ErrorPage`, `problemPages`) y `./preferred` (`usePreferred`),
  trasladados desde remy-auth para que las rutas de las partes puedan usarlos. Nada cambia en las
  importaciones existentes.
- `./smoke`: `smokeChecks({ sitePaths, appPaths, hydrate, locales })`, el nivel 1 de los niveles de
  pruebas (cada página responde, las páginas del sitio con un encabezado, las páginas elegidas se
  hidratan sin errores) para cualquier app sobre el paquete.
- `shell`: el marco del sitio (`SiteShell`, `Shell`, `SiteNavLinks`, `Intro`, `SkipLink`, `ZoneBadge`)
  en un módulo propio, de modo que una página que solo necesita el marco (las páginas de
  documentación y de problemas de remy-auth) ya no descarga las páginas de inicio y de formatos.
  `pages` reexporta todo, así que nada cambia en las importaciones existentes.
- `publicPageChecks({ oneLanguage: { translations } })`: las páginas de un solo idioma que también
  tienen su propio texto en otros idiomas (la documentación traducida de remy-auth) se esperan en el
  sitemap una vez por idioma, con canonical propio, esos idiomas como alternativas y x-default.
- `locale-data` (JavaScript plano, reexportado por `locale-info`): un módulo que deriva, por idioma,
  su región, escritura, moneda, calendarios, sistemas de numeración y formas de plural (`ownValues`),
  las opciones de cada control sobre todos los idiomas de Paraglide (`allChoices`, `choicesFor`: las
  del idioma de la página primero) y los `searchDefaults` de la página de formatos (a partir del idioma
  base). La moneda de la región viene de `country-to-currency` (nueva dependencia; el runtime no tiene
  una API de moneda por región).
- Un control de sistema de numeración en la página de formatos (`?numbering=`), en la sección Números.
- `LocaleInfo` tiene `region`, `currency` y `counts`; `Group` pasa otras props (atributos de datos) a su tarjeta.
- `fontChecks({ paths })` (`checks`): por idioma, las fuentes que realmente dibujan el encabezado y la
  introducción (`CSS.getPlatformFontsForNode` del Chrome DevTools Protocol) son las que `fonts.css`
  nombra para él; una fuente del sistema o de respaldo que dibuja el texto falla indicando la escritura
  de la página y la fuente que hay que añadir, una fuente de escritura nombrada que no dibuja nada
  falla, y el japonés y el chino tradicional deben nombrar fuentes distintas.

### Corregido [#fixed]
- `fonts.css`: las páginas en árabe, persa y hebreo se dibujan con Noto Sans Arabic y Hebrew en macOS
  y Windows. La fuente de escritura de cada idioma va ahora antes del respaldo de Geist de fontaine
  (Arial local, que incluye árabe y hebreo y por eso los dibujaba ella misma), seguida de la cara de
  respaldo con métricas ajustadas de la propia fuente de escritura; el respaldo de Geist queda al final.
  Sin nuevas precargas.

### Cambiado [#changed-1]
- Página de formatos: cada sección empieza con lo que es para el idioma de la página
  (`data-own-area`): Dinero muestra la cantidad en la moneda del propio idioma (antes euros), Palabras
  lista las formas de plural del idioma. Cada control ofrece la unión sobre todos los idiomas, con los
  valores propios de la página primero, en el aspecto secundario y descritos por una insignia "Este
  idioma". `currencies`, `countChoices` y la lista de calendarios de muestra desaparecen; la moneda por
  defecto es la del idioma base (USD, antes EUR) y el recuento por defecto su primer recuento mayor que
  uno en la forma general (2, antes 3).
- `formatsChecks` y `searchParamsChecks` recorren los valores derivados, así que un idioma nuevo no
  necesita editar ninguna comprobación; también comprueban la tarjeta "para este idioma" de cada
  sección y el orden y el marcado de cada control.
- Las filas de formatos (`Group`, `Row`) viven en su propio módulo y los módulos de muestra
  (showcase) cuyas opciones de ruta se ejecutan en la primera carga de cada página (parámetros de
  búsqueda, zonas horarias, ubicación del dispositivo) las importan junto con el marco desde ahí en
  lugar de desde `pages`. `pages` sigue exportándolas.

### Añadido [#added-2]
- `SiteNavLinks` (`pages`): un contexto mediante el cual una app añade sus propios enlaces a la
  cabecera del sitio; remy-auth añade «Docs». Sin él, la cabecera queda igual.
- `publicPageChecks({ oneLanguage })`: páginas del sitio escritas en un único idioma, listadas
  una sola vez en el sitemap sin alternativas y comprobadas en una pantalla estrecha como las demás.
- El componente `table` de shadcn (mediante `ui:components`), y mensajes para las páginas de
  documentación y de respuesta en todos los idiomas.

### Cambiado [#changed-2]
- `publicPageChecks`: la comprobación de pantalla estrecha, fuentes y cabecera reflejada
  ejecuta una prueba por idioma, y las páginas de un único idioma una sola vez, en su propio idioma.

## [0.10.5] - 2026-09-25

### Añadido [#added-3]
- Diez idiomas más: fa, he, th, ja, zh-TW, hi, am, pl, tr, de (13 en total), cada uno con su
  fuente Noto de fontsource allí donde Geist no tiene los glifos, aplicada mediante `:lang()`.
- `text.css`: guionizado según el idioma de la página, capitalización según `lang` (la İ
  turca), corte de frases para los titulares en japonés. `checks`: `textChecks({ paths })` (cada
  página cabe en 320 px, por idioma).
- Formatos: el calendario y los dígitos propios de cada idioma mediante una única etiqueta
  de formato explícita (`formatTag`), más calendarios en el control, reglas de semana desde
  `getWeekInfo` de `Intl.Locale`, segmentación de palabras con `Intl.Segmenter`, dígitos nativos en
  los recuentos mediante la función de número de Paraglide.
- `matching.js`: una estrategia personalizada de Paraglide que envía los navegadores en
  chino a zh-TW.
- Nivel de pruebas rápido (`project:test:quick`): un idioma por sistema de escritura
  (`QUICK_LOCALES`, por defecto en, ar, ja, th).

### Cambiado [#changed-3]
- Las comprobaciones por idioma (páginas de la app excluidas de la búsqueda, violaciones de
  CSP durante la hidratación, texto) se ejecutan como una prueba por idioma, de modo que el tiempo
  por prueba no crece con el número de idiomas.

## [0.10.4] - 2026-09-25

### Añadido [#added-4]
- Cabecera del sitio sobre el NavigationMenu de shadcn (enlaces simples, completa sin
  JavaScript), un pie con una lista de todos los idiomas como enlaces reales, y un desplegable de
  idioma en la cabecera sobre esos mismos enlaces, cuyo disparador recae en esa lista sin
  JavaScript.
- `theme`: el ThemeProvider y el ModeToggle de TanStack Start de shadcn (claro, oscuro,
  sistema), en las páginas del sitio y de la app. Sin JavaScript, las páginas del sitio muestran el
  tema por defecto.
- Breadcrumb (migas de pan) en las páginas de zona horaria (Breadcrumb de shadcn, enlaces
  renderizados en el servidor).

- `tanstack`: `pageHead` añade datos estructurados `WebSite` de schema.org (nombre, raíz del
  sitio) a la página de inicio del sitio mediante la entrada de cabecera `script:ld+json` de
  TanStack.
- `worker`: toda respuesta envía `Content-Security-Policy: frame-ancestors 'none'`,
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` y `Strict-Transport-Security: max-age=300`.
- `checks`: `cspChecks({ paths, reportPath })` para una Content Security Policy basada en
  nonce (nonce en cada script, sin violaciones durante la hidratación, endpoint de informes);
  `publicPageChecks` y `zoneChecks` cubren los datos estructurados; `observabilityChecks` cubre las
  cabeceras nuevas.

- `./api/server`, `./api/client`, `./api/coverage`, `./api/checks`: APIs contract-first
  sobre oRPC 1.15.4 (`.plans/openapi-contracts.md`). `apiHandlers` monta un router de oRPC en una
  única ruta de servidor de TanStack Start con el documento OpenAPI 3.1 generado
  (`/api/openapi.json`) y su página de referencia (`/api/doc`); `contractClient` llama a cualquier
  contrato con cada respuesta validada; `isomorphicClient` da a una app un único cliente para su
  propio contrato en ambos lados; `coverageProblems` y `apiChecks` fallan ante un procedimiento sin
  ruta, sin política o sin errores documentados; `reservationApiChecks` cubre la reserva de
  demostración por HTTP. Dependencias nuevas: `@orpc/client`, `@orpc/contract`, `@orpc/openapi`,
  `@orpc/openapi-client`, `@orpc/server`, `@orpc/zod`, todas en 1.15.4; `@tanstack/react-start` es
  un nuevo peer opcional.
- `./reservation`: `reservationFieldErrors` y `reservationConfirmation`, las formas de
  transmisión (wire shapes) que un contrato declara para una reserva rechazada y una aceptada.
- Las `routeStrategies` de Paraglide mantienen `/api/*` fuera de la localización de URL:
  sin redirección, y el idioma proviene de Accept-Language, o si no, del idioma base.

### Cambiado [#changed-4]
- Un único estilo de insignia de zona (secondary) en las páginas del sitio y de la app; las
  páginas de la app ya no lo repiten como etiqueta; las páginas del sitio no tienen enlaces de
  vuelta (navegan mediante la cabecera).
- `./reservation` establece la opción `jitless` de Zod, de modo que Zod nunca sondea `eval`
  bajo una CSP estricta.
- `zoneChecks` acepta un atributo `nonce` en el meta de robots de las páginas de la app.
- `showcase/status-card.checks`: `statusCardChecks` recibe `endpoint`, la ruta a la que la
  tarjeta pide el estado; sin él, cualquier función de servidor como antes.

## [0.10.3] - 2026-09-25

### Añadido [#added-5]
- `./reservation`: las reglas de la reserva de demostración como un único esquema de Zod 4
  (`reservationSchema(locale)`, mensajes localizados) para el navegador y el servidor, la forma de
  entrada de la función de servidor (`reservationInput`) y `reservationErrors` para los errores de
  campo de un servidor.

### Cambiado [#changed-5]
- `showcase/search-params`: los parámetros de búsqueda de formatos se validan con un
  esquema de Zod 4, `formatsSearchSchema`, que TanStack Router toma directamente como
  `validateSearch` (Standard Schema, sin adaptador). Sustituye a la función `validateSearch`
  escrita a mano y a sus funciones auxiliares de parseo; `FormatsSearch` es el tipo de salida del
  esquema. Escrito con Zod Mini para mantener pequeño el chunk de entrada. Dependencia nueva:
  `zod` 4.6.5.
- El formulario de `DemoPage` se ejecuta sobre TanStack Form (`@tanstack/react-form`
  1.33.5) con el patrón Field de shadcn: el esquema compartido valida al enviar, los errores de
  campo del servidor se muestran como propios del formulario, y `onDirtyChange` sigue al
  `isDirty` del formulario. Su propio código de validación y el seguimiento de la entrada
  desaparecen; `Reservation` y `ReservationResult` ahora provienen de `./reservation` (se siguen
  reexportando).

## [0.10.2] - 2026-09-25

### Cambiado [#changed-6]
- Formatos en cinco secciones (este idioma, fechas y horas, números, dinero, palabras) con
  una lista de enlaces a ellas; cada control de parámetro de búsqueda se ubica en la sección que
  modifica. Los slots de `FormatsExtras` ahora son filas en grupos (`language`, `systems`,
  `dates`, `currency`) y tarjetas por sección (`time`, `numbers`, `money`, `words`);
  `FormatsControls` y `PrerenderedFormatsControls` pasan a ser `choiceCards` y
  `prerenderedChoiceCards` (una `ChoiceCard` por parámetro, con `to`).
- Ancho completo en ambos marcos, tal como lo tiene el bloque sidebar-16 de shadcn;
  tarjetas de formatos, dos por fila en pantallas medianas y tres en las anchas.

## [0.10.1] - 2026-09-25

### Añadido [#added-6]
- Formatos como página del sitio y página de la app: `FormatsContent` (el contenido de la
  página, una sola vez), `FormatsPage` (marco del sitio) y `AppFormatsPage` (marco de la app);
  `/app/formats` en `appPaths` y en el sidebar de la app; `FormatsControls` recibe la página a la
  que pertenece (`to`).
- `LanguageMenu`: el selector de idioma de las páginas de la app, el DropdownMenu de shadcn
  con un radio group; al elegir se llama a `setLocale` de Paraglide. Las páginas del sitio
  mantienen los enlaces simples.
- `zoneChecks`: en un teléfono en horizontal, el camino de vuelta al sitio permanece
  visible.

### Cambiado [#changed-7]
- El «Volver al sitio» del sidebar de la app pasa a `SidebarFooter`, de modo que permanece
  visible en pantallas cortas.
- `performanceChecks` evalúa la mediana de cinco ejecuciones (`computeMedianRun` de
  Lighthouse).
- `demoChecks` cambia de idioma mediante el menú de la app.

## [0.10.0] - 2026-09-25

Apuesta total por shadcn, y páginas del sitio separadas de las páginas de la app. Cambio
disruptivo para los consumidores.

### Cambiado [#changed-8]
- Disposición de monorepo de shadcn: el `components.json` de la app dirige `shadcn add`
  hacia este paquete; la hoja de estilos es `globals.css` (antes `styles.css`), exactamente lo
  que escribe la CLI de shadcn (estilo Nova por defecto, tema neutral, Geist), comprobado por
  `mise run ui:verify` antes de cada release.
- Componentes regenerados con el modo RTL de shadcn; `direction` (DirectionProvider),
  `skeleton`, `empty`, `sidebar`, `sheet`, `tooltip`, `breadcrumb`, `collapsible`,
  `dropdown-menu`, `avatar` y el hook `use-mobile` añadidos mediante la CLI.
- `fonts.css`: Geist de shadcn, Noto Sans Arabic en las páginas en árabe según la guía RTL
  de shadcn, fuente de código genérica; las apps añaden los alternativos de fontaine ajustados en
  tamaño en su configuración de Vite.
- `paths`: `sitePaths` (para Google: sin necesidad de JavaScript, indexado, en el
  sitemap), `appPaths` (bajo `/app`: JavaScript, noindex) y `allPaths`, en sustitución de
  `publicPaths`; `pageHead` añade noindex a las páginas de la app.
- `pages`: `SiteShell` (partes estáticas de shadcn), `ZoneBadge`, `SkipLink`, `Intro`; la
  demo se traslada a `app-pages` con `AppShell` (bloque sidebar-16 de shadcn, propio en
  `blocks/sidebar-16`), `AppHomePage` y `LocationPage`.
- `publicPageChecks` exige que toda fuente nombrada esté cargada; nuevo `zoneChecks`; las
  comprobaciones buscan los enlaces de página dentro de `#main`; `codeSplittingChecks` recibe una
  página de inicio por zona.

## [0.9.3] - 2026-09-25

### Añadido [#added-7]
- `showcase/device-place`: `DevicePlace`, la ubicación propia del dispositivo a partir de
  la Geolocation API, solicitada solo cuando el visitante pulsa su botón, explicada antes de
  solicitarla, nunca enviada a ningún sitio; con la ubicación de Cloudflare también muestra la
  distancia entre ambas. `devicePlaceChecks`.
- `cloudflare`: `Place` incluye `latitude` y `longitude` de Cloudflare cuando son
  válidas.
- `worker`: toda respuesta envía `Permissions-Policy: geolocation=(self), camera=(),
  microphone=()`, verificado por `observabilityChecks`.

## [0.9.2] - 2026-09-25

### Añadido [#added-8]
- `showcase/search-params`: `PrerenderedFormatsControls`, los controles de formatos para
  una página prerrenderizada (valores por defecto estáticos en el HTML, los valores de la
  dirección una vez hidratada, mediante `ClientOnly` de TanStack), y la opción `interactive` de
  `FormatsControls` que hay detrás.
- `checkedLocales` en `@joeblew999/remy-ui/checks`: todos los locales, o el subconjunto en
  `CHECK_LOCALES`; cada comprobación por idioma itera sobre él, de modo que el nivel compartido
  `project:test:quick` puede ejecutar las comprobaciones sobre unos pocos idiomas
  representativos.

### Cambiado [#changed-9]
- `statusCardChecks` salta el intervalo de actualización con el reloj de Playwright en
  lugar de esperarlo (de unos 10 s a menos de 1 s).

## [0.9.1] - 2026-09-25

### Corregido [#fixed-1]
- `DemoPage` detecta la entrada escrita antes de la hidratación (una página
  prerrenderizada no dispara `onInput` para ella), de modo que el aviso de salida sigue
  protegiéndola.
- `demoChecks`, `navigationBlockingChecks` y `codeSplittingChecks` actúan solo una vez que
  React ha hidratado el elemento, en lugar de competir con la hidratación en páginas
  prerrenderizadas.

### Añadido [#added-9]
- `hydrated(locator)` en `@joeblew999/remy-ui/checks`: se resuelve una vez que React ha
  hidratado un elemento.

## [0.9.0] - 2026-09-25

El paso a TanStack Start, Router y Query, con la muestra (showcase) de TanStack
([plan](.plans/done/tanstack.md)). Sustituye a React Router: los consumidores trasladan sus rutas
a las rutas de archivo de TanStack (véase remy-auth y remy-auth-app).

### Añadido [#added-10]
- `@joeblew999/remy-ui/tanstack`: `localizedWorker(service, start)`, el punto de entrada
  del Worker para una app de Start renderizada en el servidor (`withObservability` alrededor del
  middleware de Paraglide, alrededor del handler de Start, que recibe la solicitud original para
  que sus propiedades `cf` de Cloudflare lleguen a las funciones de servidor; las URLs de entrada
  no localizadas responden 302 con `Vary`; el HTML es `no-store`); `entryRedirect`;
  `localeRewrite`, el `rewrite` del router (`deLocalizeUrl`/`localizeUrl` de Paraglide);
  `pageHead({ path, title, description })` para el `head()` de una ruta: título, descripción,
  autocanónico y hreflang recíproco; `suggestedLocale(request)` y
  `suggestedLocaleInBrowser(page)` para la sugerencia de idioma.
- `DemoPage` recibe los opcionales `onReserve` (llamado una vez que la validación propia
  del formulario pasa; se muestran sus errores de campo o el mensaje de confirmación) y
  `onDirtyChange` (entrada sin guardar), y exporta los tipos `Reservation` y
  `ReservationResult`. Sin ellos se comporta como antes.
- Patrones de exportación `./showcase/*` (`src/showcase/*.tsx`) y `./showcase/*.checks`
  (`src/showcase/*.checks.js`) para los componentes y comprobaciones de la muestra de TanStack.
- `worker`: el handler interno recibe el ID de solicitud generado como `X-Request-ID` (el
  valor propio de un cliente se sustituye); nuevas exportaciones `logContext`, `writeLog`,
  `outcome`, `level` y `requestIdHeader`, de modo que el contrato de registro tiene una única
  definición.
- Módulos de muestra: `showcase/search-params` (`validateSearch`, `searchDefaults`,
  `calendarsFor`, `FormatsControls`), `showcase/navigation-blocking` (`useLeaveGuard`) y
  `showcase/time-zone` (`TimeZonePage`, `canonicalTimeZone`, `timeZoneName`, `timeZonePath`).
- Comprobaciones de muestra: `search-params`, `preload`, `navigation-blocking`,
  `server-functions`, `deferred-place`, `status-card`, `problem` (404 localizado para un
  subrecurso desconocido, página de error sin filtraciones y con reintento, rutas de servidor de
  solo lectura con caché y 405), `code-splitting` y `build-boundaries` (`serverOnlyMarkers`,
  `devtoolsMarkers`).
- Claves de catálogo para los controles de parámetros de búsqueda, el aviso de salida de
  página, la tarjeta de estado en vivo, el botón de reintento y la página de zona horaria.

### Cambiado [#changed-10]
- `pages`: los enlaces dentro de la app son `Link` de TanStack a rutas deslocalizadas con
  `preload="intent"`; el rewrite del router añade el idioma. Los cambios de idioma siguen siendo
  anclas simples (navegaciones completas).
- La dependencia peer `react-router` se sustituye por `@tanstack/react-router`
  (opcional).
- `HomePage` recibe `children`, mostrados dentro de la página bajo sus enlaces (la
  tarjeta de estado en vivo).
- `LanguageHint` coloca sus dos acciones bajo el texto en lugar del `AlertAction` de
  shadcn posicionado de forma absoluta, que se solapaba con el texto en anchos de teléfono.
- `DemoPage` muestra el mensaje localizado «Vuelve a intentarlo» cuando `onReserve`
  rechaza, en lugar de una rejection sin gestionar.
- `performanceChecks` ya no calienta una página antes de que Lighthouse la mida. El
  calentamiento ocultaba un bloqueo del primer layout de varios segundos que cada visitante
  pagaba en un renderizador de Chrome recién abierto en macOS; la causa eran nombres de familia
  de fuente que nunca cargan (`Inter`, `ui-monospace`, `SFMono-Regular`, ...), solucionado con la
  nueva exportación `fonts.css` (solo familias genéricas: `system-ui, sans-serif` y
  `monospace`), que cada app importa después de `styles.css`.
- `publicPageChecks` falla cuando algún elemento de alguna página usa una familia de
  fuente no genérica o la página declara una web font.

### Eliminado [#removed]
- `@joeblew999/remy-ui/react-router` (`languageMiddleware`, `redirectToLocalized`,
  `pageMeta`, `requireLocale`, `suggestedLocale`); las rutas ya no llevan un segmento `:locale`.

## [0.8.0] - 2026-09-24

### Añadido [#added-11]
- `@joeblew999/remy-ui/worker`: `withObservability(service, handler)` envuelve el fetch
  de cualquier Worker: `X-Request-ID` en cada respuesta, una línea de registro estructurada por
  solicitud siguiendo el contrato compartido (`schemaVersion`, `service`, `environment`,
  `release` desde el binding de metadatos de versión, `event`, `level`, `requestId`, plantilla
  de ruta, `method`, `status`, `outcome`, `reasonCode` en los fallos, nunca URLs ni cabeceras), y
  `/healthz` para el liveness.
- `observabilityChecks({ service, paths })` en las comprobaciones compartidas.

## [0.7.0] - 2026-09-24

### Añadido [#added-12]
- `@joeblew999/remy-ui/pages`: `Shell`, `HomePage`, `DemoPage`, `FormatsPage` (con slots
  para las filas y secciones adicionales de una app), `Group` y `Row`: las páginas que
  comprueban las verificaciones compartidas, de modo que ambas apps renderizan el mismo markup
  en lugar de mantener copias.
- `@joeblew999/remy-ui/paths`: `publicPaths` como JavaScript simple para configuraciones
  de ruta y specs.
- `requireLocale` en `@joeblew999/remy-ui/react-router`.

## [0.6.0] - 2026-09-24

### Cambiado [#changed-11]
- `playwrightConfig()` divide las comprobaciones en dos niveles: `ours` (las
  comprobaciones propias de la app, rápidas) y `google` más `google-cwv` (auditorías de
  Lighthouse y Core Web Vitals, lentas). El `project:test` compartido ejecuta el nivel 1;
  `project:test:google` ejecuta el nivel 2; `project:test:remote` ejecuta ambos contra un
  despliegue.

## [0.5.0] - 2026-09-24

### Añadido [#added-13]
- `performanceChecks` en `@joeblew999/remy-ui/checks`: Core Web Vitals mediante el
  paquete `lighthouse` de Google (peer opcional) sobre el Chrome de Playwright, condicionado a
  los umbrales «buenos» de Google (LCP 2.5 s, CLS 0.1, TBT 200 ms) y una puntuación de
  rendimiento de al menos 0.9, con el informe HTML adjunto. La CLI de Chrome DevTools excluye
  esa categoría por diseño. `playwrightConfig()` ejecuta `tests/performance.spec.ts` solo,
  después de cualquier otro archivo, de modo que los navegadores en paralelo no puedan inflar
  los tiempos, y Lighthouse mide una página que la comprobación ya ha calentado, ya que el
  escaneo en frío de fuentes de un navegador nuevo no es un coste de la página.

### Cambiado [#changed-12]
- Todo componente en `src/components` se genera con la CLI de shadcn fijada, a partir del
  registro oficial `base-nova` (button, card, input, label, badge, alert, separator, field);
  `mise run ui:components` los regenera y el gate falla ante cualquier desviación. Exportados
  como `@joeblew999/remy-ui/components/*`.
- `LanguageSwitcher` y `LanguageHint` se construyen a partir de esos componentes (`Alert`,
  `Button`) y utilidades de Tailwind; el paquete no incluye CSS de componentes propio.

## [0.4.0] - 2026-09-24

### Añadido [#added-14]
- `@joeblew999/remy-ui/playwright`: `playwrightConfig()`, la configuración compartida de
  Playwright (objetivo local en el host local de Cloudflare en `PREVIEW_PORT`, objetivo remoto
  desde `TEST_BASE_URL`, informes HTML por objetivo), de modo que la configuración de un
  proyecto se reduce a una llamada.

## [0.3.0] - 2026-09-24

### Añadido [#added-15]
- `@joeblew999/remy-ui/checks`: comprobaciones compartidas de Playwright
  (`publicPageChecks`, `entryChecks`, `demoChecks`, `formatsChecks`, `lighthouseChecks`, además
  de `collectErrors`, `endonym`, `direction`, `localizedPath`) para que toda app construida
  sobre el paquete ejecute las mismas comprobaciones de cara a Google; `@playwright/test` es un
  peer opcional.
- `@joeblew999/remy-ui/samples`: los valores de muestra fijos que renderizan las páginas
  de formatos y de demostración y que esperan las comprobaciones.

## [0.2.0] - 2026-09-24

### Añadido [#added-16]
- Estrategias de Paraglide `url`, `cookie`, `preferredLanguage`, `baseLocale` con
  patrones de URL que mantienen todos los locales con prefijo; `@joeblew999/remy-ui/locale`
  reexporta del runtime `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`,
  `deLocalizeHref`, `cookieName` y la `direction` del texto.
- `@joeblew999/remy-ui/language`: `LanguageSwitcher` y `LanguageHint` sobre los hrefs
  localizados de Paraglide y `setLocale`, con sus estilos en `styles.css`.
- `@joeblew999/remy-ui/react-router`: `languageMiddleware` (el middleware de Paraglide
  como middleware raíz), `suggestedLocale`, `redirectToLocalized` y `pageMeta`; `react-router`
  es un peer opcional.
- `@joeblew999/remy-ui/seo`: `alternates` construido a partir de los patrones de URL de
  Paraglide.
- `@joeblew999/remy-ui/client`: `useSuggestedLocale` y `DeviceTime` para apps
  prerrenderizadas.
- `@joeblew999/remy-ui/cloudflare`: `placeFromCloudflare`.
- `@joeblew999/remy-ui/runtime`: el runtime generado como JavaScript simple para
  configuraciones de build.

### Cambiado [#changed-13]
- Las opciones del compilador viven en `packages/ui/paraglide.mjs`, compartidas por el
  plugin de Vite y `mise run ui:generate`. La cookie de elección recordada es
  `PARAGLIDE_LOCALE` de Paraglide.

## [0.1.0] - 2026-09-24

### Añadido [#added-17]
- `@joeblew999/remy-ui/button`: el botón `base-nova` / Base UI de shadcn con las
  variantes de Remy.
- `@joeblew999/remy-ui/styles.css`: los tokens de tema stone/orange de Remy para modo
  claro y oscuro.
- `@joeblew999/remy-ui/messages`: catálogos de Paraglide compilados para inglés, español
  y árabe, incluidos los formateadores `number`, `datetime`, `relativetime` y `plural`. El
  catálogo en árabe está redactado por un agente y aún no ha sido revisado.
- `@joeblew999/remy-ui/locale`: la lista de locales, `isLocale`, `baseLocale`, la
  lectura de `direction` y del endónimo `localeName` desde Intl.
- `@joeblew999/remy-ui/locale-info`: los calendarios de un locale, el sistema de
  numeración, el ciclo horario y las convenciones de semana, además de `weekdayName`.

[Unreleased]: https://github.com/joeblew999/remy-auth/compare/v0.10.4...HEAD
[0.10.4]: https://github.com/joeblew999/remy-auth/compare/v0.10.3...v0.10.4
[0.10.3]: https://github.com/joeblew999/remy-auth/compare/v0.10.2...v0.10.3
[0.10.2]: https://github.com/joeblew999/remy-auth/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/joeblew999/remy-auth/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/joeblew999/remy-auth/compare/v0.9.3...v0.10.0
[0.9.3]: https://github.com/joeblew999/remy-auth/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/joeblew999/remy-auth/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/joeblew999/remy-auth/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/joeblew999/remy-auth/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/joeblew999/remy-auth/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/joeblew999/remy-auth/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/joeblew999/remy-auth/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/joeblew999/remy-auth/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/joeblew999/remy-auth/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/joeblew999/remy-auth/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/joeblew999/remy-auth/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/joeblew999/remy-auth/releases/tag/v0.1.0
