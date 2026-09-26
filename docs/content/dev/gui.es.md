---
title: "Prueba mínima de GUI"
description: "Un Cloudflare Worker sirve el sitio y la app; cómo ejecutarlo en local, previsualizarlo y probarlo contra destinos locales y remotos."
---

```sh
mise run project:dev       # http://127.0.0.1:5173/en
mise run project:preview   # Production build on local Workers, port 4173
mise run project:check     # Tier 0: typecheck and build
```

:::note
Google Chrome debe estar instalado. Todo se ejecuta localmente en el runtime de Workers;
no se necesita ninguna cuenta de Cloudflare, base de datos ni credenciales de producción. Las pruebas
de navegador son dueñas de `PREVIEW_PORT` (por defecto 4173; cada agente define el suyo) y se niegan a reutilizar
un proceso no relacionado. Detén una preview manual antes de un nivel de pruebas; el servidor de desarrollo en el 5173 puede seguir en ejecución.
:::

## Un único scaffold para local y Cloudflare [#one-scaffold-for-local-and-cloudflare]

`wrangler.jsonc` es la fuente de verdad para la entrada del Worker, los flags de compatibilidad,
los bindings y la observabilidad. Vite genera `dist/server/wrangler.json` y
`.wrangler/deploy/config.json`; no edites a mano ni hagas commit de ninguno de los dos archivos generados.
Tanto la preview local como el deployment de Wrangler consumen la build de producción generada.
El desarrollo usa el mismo código fuente del Worker y el mismo runtime de Cloudflare con hot reload.

| Tarea | Objetivo |
| --- | --- |
| `project:dev` | Workers local, hot reload, puerto 5173 |
| `project:build` | Build y ensayo (dry run) del deployment de Wrangler; sin subida |
| `project:preview` | Build y luego sirve el artefacto de producción en el host local de Cloudflare en `PREVIEW_PORT` (4173) |
| `project:check` … `project:verify` | Los niveles de pruebas, en el mismo host local ([regla](./how-we-work.md#gates-before-anything-leaves-the-machine), [tareas](./tasks.md)) |
| `project:test:google` / `project:test:cwv` | El nivel de Google: auditorías de Lighthouse en local; Core Web Vitals en un Worker de Cloudflare desechable |
| `cf:deploy` | Build y luego sube a la cuenta de Cloudflare autenticada (sin pruebas salvo que `GATE` elija un nivel) |
| `cf:preview` | Despliega este commit como un Worker desechable, ejecuta el nivel 1 contra él y lo elimina |
| `project:test:remote` | Las mismas pruebas contra `TEST_BASE_URL`; sin servidor local ni deployment |
| `project:report` / `project:report:remote` | Abre el informe HTML de la última ejecución local o remota, incluidos los informes de Lighthouse |

Tras desplegar deliberadamente a la cuenta prevista, ejecuta:

```sh
TEST_BASE_URL=https://your-worker.your-subdomain.workers.dev mise run project:test:remote
```

La URL debe ser un origin, sin path ni query. Las pruebas actuales leen rutas
públicas y manipulan solo el contador del navegador. Las pruebas de autenticación y almacenamiento
necesitarán fixtures aisladas cuando esas funcionalidades existan. La tarea de pruebas remotas también
puede apuntar a una preview local ya en ejecución para comprobar la ruta del servidor externo.

Las tareas del pipeline son los valores por defecto compartidos de `tasks/project.toml`, controlados por las
entradas `[env]` de este proyecto (`PREVIEW_PORT`, `DEPLOY_ORIGIN`); este repositorio solo sobrescribe
`project:typecheck` y `project:verify` porque es dueño del paquete. La configuración de Playwright
es el `playwrightConfig()` del paquete.

Actualmente existe una única configuración de Worker y ningún entorno de staging con nombre.
Si se añaden entornos, selecciónalos con `CLOUDFLARE_ENV` en tiempo de build,
tal como exige la [integración de Cloudflare con Vite](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/).
Mantén la implementación compartida; varía solo los identificadores de recursos, los secretos y demás
valores de entorno. Los bindings que Wrangler no hereda deben declararse para
cada entorno con nombre. No dupliques la aplicación ni uses bindings remotos para
el desarrollo local habitual. Los secretos locales permanecen en `.dev.vars`, que está ignorado; los secretos
desplegados se gestionan a través de Cloudflare. Los datos locales no se suben con el deployment.

## Dos tipos de página [#two-kinds-of-page]

[`packages/ui/src/paths.js`](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/paths.js) es la única lista de páginas y dice qué
promete cada tipo; los dos nunca se mezclan.

- **Las páginas de sitio** (`sitePaths`: el home y los formatos) son para Google: completas en el HTML del servidor
  sin JavaScript, indexadas, en el sitemap con alternativas `hreflang`, y evaluadas por el nivel 2.
  Su marco es `SiteShell` en [`pages.tsx`](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/pages.tsx), construido con partes
  estáticas de shadcn.
- **Las páginas de app** (`appPaths`, bajo `/app`) necesitan JavaScript, llevan `noindex` (añadido por `pageHead`)
  y quedan fuera del sitemap. Su marco es `AppShell` en
  [`app-pages.tsx`](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/app-pages.tsx), el bloque sidebar-16 de shadcn, gestionado en
  [`blocks/sidebar-16`](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/blocks/sidebar-16/README.md).

Los docs no son páginas de esta app: son el Worker de docs (`docs/`, Fumadocs), con la guía en `/docs`,
estos docs para desarrolladores en `/dev` y la referencia de la API en `/reference`, cada uno con búsqueda y Ask AI
([escribir docs](./writing-docs.mdx)). El encabezado de la app enlaza allí, y sus antiguas direcciones `/<locale>/docs/...`
redirigen allí de forma permanente.

El selector de idioma sigue el tipo: las páginas de sitio usan `LanguageSwitcher`, enlaces simples que no necesitan
JavaScript; las páginas de app usan `LanguageMenu`, el DropdownMenu de shadcn que llama a `setLocale` de Paraglide
(ambos en [`language.tsx`](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/language.tsx)).

## Qué está implementado [#what-is-implemented]

Cada página existe en cada locale (13 prefijos como `/en`, `/ar`, `/ja`; las páginas de docs solo en inglés); la tabla las nombra sin él.

| Ruta | Tipo | Comportamiento |
| --- | --- | --- |
| `/`, `/formats`, `/app`, ... (todas las rutas sin locale) | Entrada | Redirige al idioma del visitante: la `cookie` de Paraglide (una elección recordada), luego `preferredLanguage` (Accept-Language), si no, inglés, con `Vary`. Estas URLs de entrada son los destinos `x-default` |
| `/en` | Sitio | Home localizado con dirección, metadatos y enlaces alternativos |
| `/en/formats` | Sitio | Las convenciones del locale en cinco secciones (este idioma, fechas y horas, números, dinero, palabras), cada control por search-param en la sección que cambia; las fechas incluyen el lugar del visitante a partir de la geolocalización de la petición de Cloudflare, transmitida en streaming tras `Await` y nunca almacenada, y la propia zona horaria del dispositivo. `?currency`, `?count` y `?calendar` son search params tipados y validados (los valores por defecto se omiten de las URLs, los valores inválidos redirigen a la URL canónica); los datos del loader se mantienen frescos durante cinco minutos. El contenido es `FormatsContent`, compartido con `/app/formats` |
| `/en/time-zones/Asia/Tokyo` (cualquier nombre IANA) | Sitio | Subrecurso de la página de formatos: el nombre localizado de la zona, el offset y el instante de ejemplo ahí. Un nombre desconocido es un 404 localizado que lo nombra (`notFound()`); otra grafía de un nombre conocido responde 301. No está en el sitemap |
| `/en/app` | App | Tarjeta de estado en vivo: TanStack Query sobre el `GET /api/status` del contrato (el propio router durante el SSR, HTTP en el navegador), renderizado en servidor, sondeado cada 10 s, con un refresco que invalida todos los loaders y queries a la vez (`invalidateEverything` en `@joeblew999/remy-ui/invalidate`); la tarjeta en sí es el `showcase/status-card` del paquete, que remy-auth-app también muestra, consultada entre orígenes (CORS para su origen registrado, `src/api/origins.ts`) |
| `/en/app/formats` | App | El contenido de la página de formatos dentro del marco de app |
| `/en/app/demo` | App | `ssr: false`. Contador y formulario de reserva validados en el navegador y de nuevo por el `POST /api/reservations` del contrato (una mutación de TanStack Query), que responde en el idioma de la página; las reglas incumplidas vuelven como su 400 tipado y se muestran como errores propios del formulario; salir con entradas sin guardar pregunta primero (`useBlocker`) |
| `/en/app/location` | App | La ubicación de la petición según Cloudflare junto a la propia del dispositivo, que la API de Geolocation solo entrega después de que el visitante pulse su botón |
| `/api/status`, `/api/reservations` | API | Endpoints del contrato ([@joeblew999/remy-auth-contract](https://github.com/joeblew999/remy-auth/blob/main/packages/contract/README.md)) servidos por oRPC tras una única ruta de servidor de Start (`src/routes/api.$.ts`, `src/api/`): entrada y salida validadas, errores tipados, el idioma a partir de Accept-Language (`routeStrategies` de Paraglide), sin locale en la URL |
| `/api/openapi.json`, `/api/doc` | API | El documento OpenAPI 3.1 generado a partir del router en el propio proceso, y su página de referencia (la página Scalar de oRPC, con el script fijado a una versión) |
| `/robots.txt`, `/sitemap.xml` | Rutas de servidor | `Cache-Control: public, max-age=3600, s-maxage=3600`; los métodos distintos de GET y HEAD responden 405 con `Allow`; el sitemap enumera las páginas de sitio en cada locale con alternativas `hreflang` |
| Ruta o locale desconocidos | | HTTP 404 con la página de no encontrado localizada (una ruta desconocida sin localizar primero redirige al idioma del visitante, ya que el rewrite de TanStack la canonicaliza) |
| El loader de una página falla | | La página de error localizada de esa ruta (500 cuando se renderiza en servidor) con un reintento que vuelve a ejecutar los loaders; toda ruta de página y la raíz configuran ambas páginas de problema (`src/problem.tsx`) |

Las páginas localizadas nunca redirigen. Cuando el idioma preferido del visitante difiere del de la página, una sugerencia descartable ofrece esa versión; elegirla o descartarla se recuerda en la cookie `PARAGLIDE_LOCALE` de Paraglide, sobre la que solo actúan las URLs de entrada. La detección de locale, la cookie, la localización de URLs y la redirección son las propias estrategias y el middleware de Paraglide (`packages/ui/paraglide.mjs` contiene la única configuración del compilador), integrados como la integración oficial de Paraglide con TanStack Start: el middleware envuelve la entrada del Worker, y el `rewrite` del router elimina el locale antes de hacer el matching y lo añade a cada enlace, de modo que las rutas no llevan segmento de locale.

TanStack Start se ejecuta a través del plugin de Vite de Cloudflare ([`vite.config.ts`](https://github.com/joeblew999/remy-auth/blob/main/vite.config.ts)). Todas las
rutas se renderizan en servidor excepto la demo. Los enlaces dentro de la app precargan el código y los datos de su ruta
según la intención; los cambios de idioma en las páginas de sitio son navegaciones completas.

## shadcn, de fábrica [#shadcn-stock]

Los componentes y el tema son lo que escribe la CLI de shadcn, en el diseño de monorepo de shadcn: el
[`components.json`](https://github.com/joeblew999/remy-auth/blob/main/components.json) de esta app dirige `shadcn add` hacia el paquete
([`packages/ui/components.json`](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/components.json)), y
`packages/ui/src/styles/globals.css` también lo escribe la CLI. Nadie edita ninguno de los dos a mano; las
tareas en [`mise.toml`](https://github.com/joeblew999/remy-auth/blob/main/mise.toml) son la única forma en que cambian:

```sh
mise run ui:components     # Re-add every shadcn component (extend the list there to add one)
mise run ui:theme          # Rewrite globals.css with shadcn's default theme
mise run ui:blocks         # Diff each owned block against upstream, in place
mise run ui:verify         # Re-run both and fail on any difference (runs before every release)
mise run ui:pack           # Produce the package tarball locally
```

Los bloques son copias propias, tal como shadcn pretende; el README de sidebar-16 explica qué se cambió. El
alias `components` del paquete (`@joeblew999/remy-ui/blocks`) es donde shadcn escribe los archivos propios de un
bloque cuando se ejecuta desde el paquete (`shadcn add <block> -c packages/ui`): `blocks/<name>/components`.
Así, `ui:blocks` los compara en su sitio y los cambios de upstream se fusionan a mano.

Las fuentes viven en [`packages/ui/src/fonts.css`](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/fonts.css), importado después de
`globals.css` (ver [`src/styles.css`](https://github.com/joeblew999/remy-auth/blob/main/src/styles.css)); el archivo explica sus reglas. fontaine en
[`vite.config.ts`](https://github.com/joeblew999/remy-auth/blob/main/vite.config.ts) genera las fuentes de respaldo ajustadas en tamaño que nombra.
`publicPageChecks` falla ante cualquier familia nombrada que no esté cargada.

## Estructura y reutilización [#structure-and-reuse]

- `src/routes/`: rutas de archivo de TanStack (loaders, `head`, renderizado por ruta) que renderizan las páginas del paquete, más las filas de formatos adicionales de esta app (`src/formats-extras.tsx`), y `robots.txt`, `sitemap.xml` y `csp-report` como rutas de servidor; `src/routeTree.gen.ts` lo genera el plugin del router durante el dev y el build, y se versiona.
- `src/server.ts`: entrada del Worker a través del `localizedWorker` del paquete (IDs de petición, logs de estado estructurados, `/healthz`, el middleware de Paraglide, redirecciones de entrada). Start recibe la petición original, así que las funciones de servidor leen la geolocalización de Cloudflare a partir de las propiedades `cf` de la petición en un módulo exclusivo de servidor bajo la protección de imports de Start (`packages/ui/src/parts/deferred-place/place.server.ts`, la parte deferred-place). El wrapper pasa su ID de petición hacia dentro como `X-Request-ID`; el middleware de petición de Start lo expone como `context.requestId`, y un middleware de función registra una línea `server_fn` por cada llamada (`src/middleware.ts`). Ahí mismo, un segundo middleware de petición genera el nonce de CSP por petición que `src/router.tsx` entrega a TanStack Router, y la ruta de servidor `src/routes/csp-report.ts` registra los reportes de la política ([cabeceras de seguridad](https://github.com/joeblew999/remy-auth/blob/main/.plans/parked/gui-portal.md)). El nombre del servicio tiene un único hogar, `src/service.ts`.
- `src/api/`: la implementación del contrato (`router.ts`, sin imports de Workers para que las comprobaciones puedan cargarlo en Node), el contexto de cada llamada (`context.server.ts`) y el cliente isomórfico con sus utilidades de TanStack Query (`client.ts`). El contrato es `packages/contract/`; el mecanismo compartido son las exportaciones `api/*` del paquete; [el plan de contratos](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/openapi-contracts.md) es dueño del diseño.
- `src/router.tsx`: un router y un cliente de TanStack Query nuevos por petición, con la integración SSR de Query. TanStack Devtools (paneles de Router y Query) se monta en `src/routes/__root.tsx` y su plugin de Vite `devtools()` lo elimina de las builds de producción; la comprobación de frontera de build demuestra que ni devtools ni código exclusivo de servidor llegan al navegador.
- `src/parts.json`: las [partes](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/parts.md) del paquete que usa esta app, un nombre por línea (hoy `time-zones`); `remyParts()` en `vite.config.ts` monta sus rutas y `partChecks()` en `tests/gui.spec.ts` ejecuta sus comprobaciones.
- `packages/ui/`: todo lo que comparten ambas apps; su [README](./ui-package.md) enumera las exportaciones.
- `tests/`: las comprobaciones compartidas del paquete (`@joeblew999/remy-ui/checks`, `showcase/*.checks`) más las comprobaciones que solo posee este repositorio (catálogos, renderizados concurrentes en servidor, hidratación, sus filas de formatos adicionales); `lighthouse.spec.ts` y `performance.spec.ts` son de nivel 2.

El locale se pasa explícitamente a las funciones de mensaje compiladas; las peticiones concurrentes no comparten
estado mutable de locale. Los catálogos son los `locales` en
[settings.json](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/project.inlang/settings.json); todos salvo inglés y español
fueron escritos por un agente y no están revisados. La dirección, los endónimos, las fechas, los números, la moneda y los plurales
siguen las decisiones registradas en
[el plan de GUI](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/gui.md#dates-numbers-currency-and-direction).

El consumidor real del paquete es [remy-auth-app](https://github.com/joeblew999/remy-auth-app),
que instala el paquete publicado y ejecuta sus comprobaciones sobre páginas prerenderizadas, mientras que esta app
las ejecuta sobre páginas renderizadas en servidor.

## Evidencia y límites [#evidence-and-limits]

Lo que cubren las comprobaciones son las propias comprobaciones: `tests/` y el
`@joeblew999/remy-ui/checks` del paquete (el título de cada comprobación dice qué demuestra); los niveles que las ejecutan están en
[cómo trabajamos](./how-we-work.md#gates-before-anything-leaves-the-machine). En resumen: cada página en cada
idioma sin JavaScript (idioma, dirección, metadatos, enlaces), catálogos y plurales, los valores de formatos
frente a Intl, las redirecciones de entrada y la sugerencia de idioma, la hidratación, el formulario de demo y la API,
los estados HTTP, el sitemap y `hreflang`, las cabeceras de seguridad y el nonce de CSP, las pantallas estrechas, y
las páginas de docs, búsqueda y ask.

El nivel de Google cubre solo las páginas de sitio (las páginas de app son noindex por diseño): Lighthouse audita `/en`
(móvil y escritorio), `/es`, `/ar` y `/en/formats`
([`tests/lighthouse.spec.ts`](https://github.com/joeblew999/remy-auth/blob/main/tests/lighthouse.spec.ts)); Core Web Vitals, a partir del paquete
`lighthouse` fijado de Google, evalúan `/en` (móvil y escritorio) y `/en/formats`
([`tests/performance.spec.ts`](https://github.com/joeblew999/remy-auth/blob/main/tests/performance.spec.ts)) frente a los umbrales buenos de Google (LCP
2.5 s, CLS 0.1, TBT 200 ms, Performance de al menos 0.9), en un Worker de Cloudflare desechable
(`project:test:cwv`), no en localhost.

Límites: todavía no hay servidor de Better Auth, credenciales, sesiones, base de datos D1, autorización ni SSO
entre apps. El sitio se sirve desde su dirección de workers.dev (`DEPLOY_ORIGIN`); el origin público de producción y
Search Console son decisiones del propietario ([now](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md)).

Avisos de herramientas conocidos: Node puede imprimir el aviso experimental de localStorage de Chrome DevTools;
npm informa de scripts de instalación upstream no aprobados; la comprobación de paquete aislado de Vite
puede informar de que las directivas `use client` de Base UI se ignoran en un bundle
de cliente plano. Estos avisos no cambian los comportamientos probados.
