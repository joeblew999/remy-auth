---
title: "Cómo trabajamos"
description: "Cómo trabajan aquí las personas y los agentes: las herramientas del proyecto primero, encuestas antes de elegir herramientas, shadcn y TanStack, puertas de control, planes y traducciones."
translatedFrom: "56df3445 507816d3 07baba6b c2d8f54e d8386d74 d1cef651 5d55d686 20ea1d8b f3262ad2 d16df021 0ce59218 a37bfcc6 c8f062fe c543c74e 94a10087 19f6274f 93ebb4e5 980904cb e25d8077"
---

Este documento es el dueño de cómo trabajan las personas y los agentes: los hábitos que ha pedido el
propietario, tanto para desarrolladores como para agentes de IA. Lo que el código debe ser vive en
[principios de desarrollo](./principles.md).

## Dónde viven las reglas [#where-rules-live]

- Escribe cómo trabajamos aquí, en el repositorio, no en la memoria privada de un agente. Cualquiera
  que abra el repositorio, persona o agente, debe encontrar las mismas reglas. La memoria del agente
  es solo para cosas que conciernen a un único agente, nunca para cómo funciona el proyecto.
- Cada hecho tiene un único hogar, como exigen los
  [principios de desarrollo](./principles.md#development-principles); eso también aplica a estas reglas.
- Los `AGENTS.md` y `CLAUDE.md` de la raíz son punteros a [Agentes: empieza aquí](./agents.md) y no
  contienen ninguna regla propia: `CLAUDE.md` es un `@import` de esa página, así que Claude Code la
  carga; `AGENTS.md` la nombra, para Codex y cualquier otra herramienta. Una regla escrita en
  cualquiera de los dos está en el lugar equivocado (propietario, 2026-10-10: «Agents.md y Claude.md en
  la raíz deben ser solo un puntero al área de documentación para agentes»).

## Ves algo: arréglalo o escríbelo, en el mismo cambio [#see-something-fix-it-or-write-it-down-in-the-same-change]

Propietario, 2026-10-09, tras encontrar un hueco cada vez que preguntaba: «Está bastante claro que la
documentación de los agentes está mal si estás viendo problemas y no actúas sobre ellos ni te informas
a ti mismo ni a los devs». Así que la regla es general, no solo para herramientas que faltan:

- Un agente o desarrollador que note algo mal, lento, que falte o que haya quedado suelto (un paso que
  no espera nada, una comprobación que nadie ejecuta, una rama que nadie posee, un documento que dice
  algo que ya no es cierto) tiene dos opciones, ambas dentro del cambio en el que está: **arreglarlo**
  cuando es pequeño, o **abrir un
  [issue de GitHub](https://github.com/joeblew999/remy-auth/issues)** (qué se vio, dónde, y qué lo arreglaría). Mencionarlo solo en un chat o en un informe no es ninguna de las dos cosas.
- **Todos se enteran a través de GitHub**: los issues son públicos, así que lo que una persona vio
  llega a todos (`gh issue list` imprime los abiertos).
- **«Hecho» es el final de una barrida, no de una lista.** Antes de decirlo: ramas y worktrees
  (`git branch`, `git worktree list`), `pnpm wrangler deployments list`, `gh issue list`, una
  búsqueda de las palabras que el cambio retiró, la documentación que el cambio tocó. Muestra la barrida.

## Usa primero las herramientas propias del proyecto [#use-the-projects-own-tools-first]

- Empieza con `vp run setup`; [herramientas para desarrolladores](./tooling.md) explica qué
  instala.
- Antes de hacer cualquier paso a mano (instalar, actualizar, publicar, traducir), busca su script
  (desplegar son las propias builds de Cloudflare, nunca un comando nuestro): `vp run` los lista, en
  cualquier repositorio en el que estés; una app tiene los mismos. Propietario, 2026-09-26, después de
  que una app fuera actualizada a mano pasando por encima de `vp run upgrade`: «ya sabes que no
  reinventamos la rueda».
- Ejecuta los comandos a través de Vite Plus (`vp run <nombre>`: una tarea o un script), comprueba la
  página real con las herramientas de Chrome DevTools
  ([herramientas del navegador](./tooling.md#browser-tooling)), y usa las skills instaladas antes de leer
  las fuentes originales, buscar en `node_modules` o escribir scripts de un solo uso.
- Mira la página real con las herramientas del navegador antes de escribir una prueba para ella.
- Una vez que las herramientas pueden responder una pregunta, deja de investigar y úsalas.
- Indica cuánto tardará un paso antes de empezar cualquier cosa más lenta que unos segundos. El
  comentario de cabecera de cada comando indica su duración y qué puede ejecutarse al mismo tiempo;
  ejecuta las comprobaciones posteriores al despliegue en segundo plano y sigue trabajando.

## Elige herramientas por encuesta, no por el primer hallazgo [#choose-tools-by-survey-not-by-first-find]

Antes de que un plan nombre una librería o herramienta:

1. Lista los candidatos realistas, incluyendo los más nuevos encontrados en npm y GitHub.
2. Puntúalos según criterios fijos y ponderados, con una fuente para cada puntuación.
3. Nombra al segundo clasificado y qué nos haría cambiarnos a él.
4. Demuestra los dos primeros con pequeñas construcciones de prueba.

Marca como supuesto todo lo que no se haya comprobado.

## Una vez elegida una herramienta, adopta su forma [#once-a-tool-is-chosen-take-its-shape]

Dobla nuestro sistema hacia la herramienta, no la herramienta hacia nuestro sistema. Antes de construir
sobre un framework elegido:

1. Genera su propia plantilla y ejecuta sus propios generadores (funciones de la CLI) en una app de
   prueba.
2. Constrúyela y solicita cada ruta que crea; haz una lista de lo que funciona y lo que no.
3. Cambia nuestro layout, archivos y lo que nuestro código le pasa a la GUI para que coincidan,
   conservando solo lo que exige una regla del propietario (las URL de Paraglide, la UI de shadcn).
4. Elimina lo nuestro que la herramienta ya hace. Un plugin o wrapper hecho a medida tiene que
   justificarse frente a la forma estándar, no al revés.

Propietario, 2026-09-26, tras descubrir que la documentación de Fumadocs estaba medio personalizada:
«Es curioso cómo no te das cuenta hasta que te empujan»
([la decisión de Fumadocs](https://github.com/joeblew999/remy-auth/issues/36)).

## UI: shadcn y TanStack hasta el final [#ui-shadcn-and-tanstack-all-the-way]

La UI es difícil y nunca está terminada, así que tomamos lo que shadcn y TanStack han pasado años
perfeccionando, y escribimos solo lo que ellos no ofrecen.

- **La CLI de shadcn escribe cada componente y el tema.** Los componentes vienen de
  `vp run ui:components`, el tema de `vp run ui:theme` (el estilo Nova por defecto de shadcn,
  neutral, Geist: sin preset, sin marca propia). `vp run check:shadcn` (el hook de pre-commit lo ejecuta cuando un commit incluye uno de esos archivos) falla ante cualquier edición manual. El repositorio usa
  el layout de monorepo de shadcn, así que `shadcn add`
  ejecutado en la app escribe en el paquete compartido.
- **Busca un bloque de shadcn antes de construir un layout o una pantalla:**
  `./node_modules/.bin/shadcn search @shadcn -t registry:block`. Añádelo con `shadcn add`, conserva su
  estructura, y sustituye solo sus datos de ejemplo. No añadas restricciones que el bloque no tenga (es
  de ancho completo, así que nosotros también).
- **Compón, no restilices.** Usa variantes y tokens semánticos; sigue las reglas de la skill de shadcn
  instalada (Separator, Skeleton, Badge, Empty, Alert, Field en lugar de equivalentes hechos a mano).
- **Dos tipos de página:** páginas del sitio para Google y páginas de la app bajo `/app`, nunca
  mezcladas; [paths.js](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/paths.js)
  define ambas.
- **Adopta la librería de TanStack en lugar de nuestro propio código** (Form, el adaptador de Zod de
  Router, Table, Devtools y demás), instala sus skills de agente, y luego elimina el código que
  sustituye.
- Antes de escribir cualquier código de UI, pregunta: ¿esto ya lo hace shadcn, TanStack o Paraglide? Si
  es así, úsalo.

- Mírala: antes de dar por terminado un trabajo de UI, haz capturas de las páginas que cambiaste con
  `pnpm remy shots` (escritorio y móvil, claro y oscuro, inglés y árabe) y mira las capturas. Las
  comprobaciones demuestran el comportamiento; solo las capturas muestran el layout, el espaciado, el
  desbordamiento y el texto de dirección mixta; nombra las páginas que cambiaste
  (`pnpm remy shots /formats --phone`), `--all` solo para una barrida completa
  (propietario, 2026-09-26: «Es verdaderamente deprimente lo difícil que es ver bien el aspecto del
  sitio web»).

### Qué librería de TanStack para qué [#which-tanstack-library-for-what]

Comprobado contra [tanstack.com](https://tanstack.com) el 2026-09-26. Las librerías en beta y alfa
cambian rápido: lee su documentación actual y las skills instaladas antes de usarlas, no la memoria de
un agente.

| Librería | Estado aquí | Regla |
| --- | --- | --- |
| Start, Router, Query | En uso en todas partes | La app, sus páginas y toda la obtención de datos (con oRPC) |
| Form | En uso: solo en el formulario de reservas | Todos los formularios lo usan (inicio de sesión, registro, ajustes); nada de estado de formulario hecho a mano |
| Pacer | No en uso (la búsqueda de la documentación es de Fumadocs) | Cualquier debounce, throttle, límite de tasa o cola en el navegador |
| Devtools | En uso en desarrollo | Mantén los paneles de Router, Query y Form en el único Devtools |
| Table | Lo siguiente: con las pantallas de administración | Toda lista con ordenación, filtrado o paginación, a través de la data table de shadcn |
| Virtual | Cuando una lista se hace larga | Listas de cientos de filas, empezando por las zonas horarias |
| DB (beta) | Todavía no | Solo si necesitamos uso sin conexión o sincronización en vivo; Query cubre las necesidades de hoy |
| AI (beta) | No se usa | El Ask AI de la documentación es su propia página (`/docs/ask`, `/dev/ask`) construida a partir de las piezas de chat de IA de Fumadocs sobre el AI SDK, no una superposición: un solo scroll, la pregunta arriba ([la documentación en tus herramientas de IA](./ai-tools.md)) |
| Hotkeys (alfa) | Todavía no | Candidata para un atajo de búsqueda cuando salga de alfa |
| Store (alfa), Charts | No es necesario | Todavía no hay estado de cliente a nivel de app ni dashboards |

Pasar una librería de «Todavía no» a en uso sigue
[elige herramientas por encuesta](#choose-tools-by-survey-not-by-first-find).

## La documentación y la demo se mueven con el código [#the-docs-and-the-demo-move-with-the-code]

remy-auth es sobre lo que se construye cualquier otro repo de Remy, y su documentación para
desarrolladores es lo que sus agentes y desarrolladores leen (a través de la skill `remy`, generada a
partir de estas páginas). Así que una funcionalidad está terminada cuando se cumplen cuatro cosas: está
en el paquete para cada app, la propia app de remy-auth la usa donde cualquiera puede verla funcionar,
una comprobación falla cuando se omite, y la página que la describe se actualiza en el mismo cambio.
Propietario, 2026-10-09: «Al hacer que remy-auth reutilice todas sus funcionalidades en su propia demo,
se facilita incorporar a IAs y devs… la documentación es parte de lo que cualquier otro agente y dev en
otros repos recibe». Una página que describe lo que el código ya no hace es un bug; arréglala donde la
encuentres.

## Idioma: Paraglide es el dueño [#language-paraglide-owns-it]

Paraglide es dueño de todo el comportamiento del idioma: qué idioma recibe una solicitud, a través de
sus estrategias `url`, `cookie`, `preferredLanguage` y `baseLocale` (configuradas en
[paraglide.mjs](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/paraglide.mjs)), y los
enlaces localizados, que TanStack Router transporta. No escribimos capas neutrales respecto al
framework ni código de idioma propio; cuando a Paraglide le falta algo, usa primero sus opciones y
registra el hueco en el plan que lo posee.

## Traducciones: en el mismo cambio [#translations-in-the-change]

El inglés es la fuente; las traducciones lo siguen, en el mismo cambio. Un commit lleva junto su
inglés y sus traducciones: un commit, un push, una ejecución de las comprobaciones.

- Un agente de funcionalidad escribe solo en inglés: la documentación en inglés y el catálogo base
  (`messages/en.json`). Nunca edita a mano una traducción (`<página>.<idioma>.md` junto a su página) ni el
  catálogo de otro locale.
- `vp run translate` (`remy i18n translate`) traduce lo que el cambio dejó desactualizado o faltante, en la
  rama, antes del commit, de modo que las traducciones van en el mismo commit que su inglés. El agente
  Claude traduce exactamente lo que lista `remy i18n check`: para una página desactualizada, solo las
  secciones cuyo inglés cambió; para un catálogo, solo las claves que cambiaron.
- **Cada traducción registra de qué se hizo**: una página traducida, una huella de cada sección en inglés
  (`translatedFrom` en su frontmatter); un catálogo, una huella de cada mensaje en inglés
  (`translated-from/<idioma>.json` a su lado). Desactualizado es donde el registro y el inglés difieren. No se lee
  ningún historial de git, así que la respuesta es la misma en un Mac, en el contenedor de un agente en la nube y en el
  checkout superficial de GitHub, donde `vp run ci` también lo comprueba.
- Los agentes que trabajan a la vez no necesitan lock ni un único escritor: cada worktree traduce su propio cambio, y dos
  ramas que cambian la misma sección en inglés ya se encuentran en ese inglés; tras mezclar main,
  `vp run translate` vuelve a traducir lo que la mezcla dejó desactualizado. (Hasta el 2026-10-17 la traducción se ejecutaba en `main`
  después del push, bajo un lock, juzgada por el historial de git: cada cambio que tocaba la documentación empujaba main dos veces,
  ejecutaba dos veces las comprobaciones de GitHub, y una página se reescribía entera por un cambio de una línea.)
- El agente no recibe herramientas: se le entrega el inglés (y, para una página desactualizada, las secciones cambiadas y
  su traducción actual) y devuelve texto; la tarea escribe los archivos que pidió, con sus
  registros, y nada más.
- Lo que devuelve el agente se escribe solo cuando es la página: cada campo del frontmatter que tiene su
  inglés, y el texto que viene después (`packages/remy-cli/src/page.ts`). Un agente fallido deja la página
  como estaba, dice por qué y hace fallar la traducción (código de salida distinto de cero); el inglés aún puede comitearse, la traducción
  queda pendiente, y el siguiente `vp run translate` lo vuelve a intentar. `tests/unit/i18n-docs.unit.spec.ts` sujeta a cada
  página traducida del repositorio a la misma regla. El 2026-10-09 el `null` de un agente fallido se comiteó como
  una página y detuvo la construcción de la documentación en main.
- Una traducción que no es una página se borra, nunca se restaura a mano: una página que falta se traduce
  desde el inglés con el siguiente `vp run translate`.
- `remy i18n check` solo lee, sin conexión, así que es seguro en cualquier lugar y en cualquier número de worktrees.
  `remy i18n translate` nunca es un `depends`.
- Desactualizado o faltante es un aviso mientras se avanza y en `vp run ci` (su parte `ready`), y un error al
  publicar (`remy i18n check --strict`, antes de las comprobaciones de la publicación).
- Un cambio estructural (un renombrado, una barrida) que toca traducciones de documentación va seguido de
  `pnpm remy i18n translate docs <archivo>…`, que deja esos archivos totalmente alineados con el
  inglés. Cambia la estructura de un catálogo (el archivo de cada locale) en el mismo commit que `en.json`.

El layout y los comandos están en [proyectos](./projects.md#translations).

## Planes [#plans]

Propietario, 2026-09-26: «qué agobiante y frustrante es tener tantos planes basura». El trabajo abierto son
[issues de GitHub](https://github.com/joeblew999/remy-auth/issues), uno por cada trabajo; las investigaciones, los análisis y las revisiones van en el issue al que
sirven, no en uno propio. Un trabajo terminado cierra su issue (`Closes #N` en el commit), en el mismo commit
que su código.

## Cuando el propietario delega decisiones [#when-the-owner-delegates-decisions]

Cuando el propietario delega decisiones, por ejemplo para terminar trabajo sin supervisión:

- Decide, y registra cada decisión con sus razones en el plan al que pertenece.
- Mantén todas las puertas de control en verde; la delegación nunca relaja una comprobación.
- Deja un informe completo: qué se decidió, qué se hizo, qué se comprobó y qué no.

## El flujo: la forma estándar, a la vista de todos [#the-flow-the-standard-way-in-plain-sight]

Propietario, 2026-10-09: «El 95% del tiempo ha sido comprobar y el 5% codificar. Esto no puede continuar así», «Es una cuestión de qué ejecutas localmente y qué ejecutas en GitHub de forma asíncrona», y «asegúrate de que el flujo del desarrollador también esté formalizado para que estas putadas estúpidas no puedan volver a pasar». Y 2026-10-17: «en ese archivo de configuración de VP lo ves todo. Todo lo demás que hay debajo debería ser bastante tonto»; 2026-10-18: «Nada de magia rara» y «La forma estándar». Así que el flujo son las tareas y los scripts de Vite Plus, tal como `vp create vite:monorepo` organiza un repositorio, y luego git, GitHub y las herramientas propias de Cloudflare, sin nada nuestro envolviéndolos. Las tareas de cada paquete están escritas en su propio `vite.config.ts` (ningún código las genera), el `vite.config.ts` de la raíz contiene el estilo compartido y las comprobaciones del repositorio (`ready`), y los scripts del `package.json` de la raíz las componen (`ci`, `translate`, `release`, `setup`); `vp run` los lista todos, y [Comandos](./commands.mdx) imprime los pasos de cada script. Cada comando `remy` es una hoja: hace el único trabajo que su nombre indica (una comprobación, el traductor, una ejecución de navegador, una pregunta a Cloudflare), lee solo sus argumentos y los archivos que contienen lo que necesita, y no decide nada más. El trabajo se comitea y se empuja directamente a `main`; cuando varios agentes trabajan a la vez, cada uno toma un worktree (el `.claude/worktrees/<nombre>` de Claude Code, o `git worktree add`) y hace pull antes de empujar; si dos checkouts comprueban a la vez, uno de ellos recibe sus propios puertos (`PREVIEW_PORT`, `DOCS_PREVIEW_PORT`).

| Paso | Comando | Quién lo ejecuta, y cuándo | Qué ejecuta | Tiempo |
| --- | --- | --- | --- | --- |
| Mirar | `git status`, `git log`, `gh run list`, `pnpm wrangler deployments list`, `curl <origin>/healthz` | todos, primero, y siempre que necesiten saberlo | las propias respuestas de git, GitHub y Cloudflare; qué ejecuta un despliegue, leído de su `/healthz` | segundos |
| Después de cada cambio | `vp run ready` | quien esté codificando; el único paso que se espera | las tareas de Vite Plus: todo lo generado, la app y la documentación construidas, el ensayo de despliegue de Wrangler, las comprobaciones propias del proyecto, las comprobaciones unitarias, y luego `vp check` (formato, lint, tipos); lo que no ha cambiado sale de la caché de Vite Plus | ~8 s sin cambios, ~50 s desde cero |
| El cambio deja la máquina | `vp run translate` (cuando cambió el texto), `git commit`, `git push` | quien hizo el trabajo, por su cuenta, en cuanto termina | las traducciones que el cambio dejó desactualizadas, en el mismo commit; el commit (su hook: `vp staged`); el push a `main` (su hook: `vp run ci`, desde la caché donde nada cambió; `VP_GIT_HOOKS=0` lo omite) | unos minutos: lo que cambió aquí, en el hook del push |
| Producción | un push a `main`: Cloudflare lo despliega | nadie; cada push a `main` sale en vivo | las builds de Git de Cloudflare (Workers Builds) construyen y despliegan la app y la documentación a partir de cada push a `main`, y el Preview de cada otra rama a partir de su propio push ([en Cloudflare](./run-and-test.md#on-cloudflare)); el Worker de la documentación da por sí mismo al índice de Ask AI las páginas nuevas, en la primera petición tras cada versión nueva | unos minutos tras el push |
| Una publicación | `vp run release` | el propietario, o un agente a quien el propietario se lo pidió en esa sesión | `changeset version` (las versiones y los changelogs a partir de los changesets pendientes) → `node scripts/version.ts` (la app en blanco vuelve a fijarse) → `remy i18n check --strict` (traducciones completas) → `vp run ci` → `vp run new-app` → `vp run release:push` (el commit "Release vX.Y.Z", empujado a main); el job de release de GitHub, el único job que ejecuta un push a main, publica (`vp run release:publish`: `changeset publish`), crea la etiqueta vX.Y.Z y la release de GitHub | ~5 min |

Las comprobaciones de GitHub no se ejecutan en un push a `main`, por decisión del propietario: `vp run ci` ejecuta lo mismo aquí, y el hook del push lo ejecuta antes de que
nada salga de la máquina. Un push a main ejecuta solo su job de release, que publica lo nuevo (nada, tras la mayoría de los
pushes); las comprobaciones se ejecutan para los pull requests de Dependabot y a mano (`gh workflow run ci.yml`). Sin pull requests nuestros, auto-merge ni reglas de rama: `main` recibe el push.

- **Quién ejecuta un paso está en la tabla, y nunca es una pregunta.** Un agente empuja su propio
  trabajo terminado a `main` sin preguntar: su push ejecutó antes `vp run ci`, y nada en rojo se empuja. La palabra del propietario es para una publicación, el único paso cuya columna así lo dice, y para el aprovisionamiento
  ([principios de desarrollo](./principles.md#development-principles)). Un agente que lee la tabla y
  aun así pregunta si debe empujar ha dejado de usar el flujo (propietario, 2026-10-10, después de que
  uno lo hiciera: «¿Está absolutamente claro cuándo te corresponde ejecutar cada paso?»).
- **Nada nuestro envuelve git, GitHub ni Cloudflare.** La automatización de landing y promoción (`vp run land`,
  `vp run promote`, `remy land`, `remy promote`, `remy status`, el hook de estado de Claude, nuestros propios despliegues a Cloudflare)
  ya no existe, como tampoco el antiguo guardián que rechazaba los comandos ajenos al flujo (propietario, 2026-10-18). Lo que sigue costando
  algo (el traductor gasta tokens de Claude) se ejecuta por su nombre desde un
  script, donde cualquiera lo ve.
- **Nada se pasa a través del entorno.** Un comando `remy` lee el valor que necesita del archivo que
  lo contiene (el `.env` de la app, su `wrangler.jsonc`) y pasa a un hijo solo lo que ese hijo necesita; ningún comando fija variables para que otros las encuentren, y ningún interruptor oculto cambia lo que hace un comando (`tests/unit/dev-flow.unit.spec.ts` rechaza ambas cosas). El único ajuste que da una persona es `CHECK_LOCALES` (`all`, `quick` o una lista).
- Un área que parece mal: `vp run test:browser --grep <palabras>` (las comprobaciones de navegador
  cuyo título coincide). Es la única ejecución de navegador que no es propiedad de un paso.
- Una regla que puede ser una función pertenece a `tests/**/*.unit.spec.ts` (sin build, sin Worker, sin
  navegador), así se ejecuta en cada comprobación gratis. El navegador es para lo que solo un navegador
  muestra.
- **Un agente nunca espera en un paso de larga duración.** `git push` (su hook ejecuta `vp run ci`), `vp run release`, una
  traducción, una suite remota, las comprobaciones de GitHub: inícialo en segundo plano, sigue trabajando o responde al
  propietario, y actúa cuando el harness diga que terminó. Iniciarlo en segundo plano y luego hacer
  polling de él en primer plano es el mismo fallo (propietario, 2026-10-09: «Acabas de hacerlo otra vez
  con 2 cosas de larga duración»). Solo `vp run ready` (segundos) se ejecuta y se espera.
- **Qué se vuelve a ejecutar lo decide Vite Plus, nunca nosotros.** Una tarea cuyas entradas no cambiaron se
  reproduce desde la caché de Vite Plus, así que `vp run ready` y `vp run ci` omiten lo que nada tocó, aquí y
  (con la caché conservada entre ejecuciones) en GitHub. Ningún código nuestro decide que algo se puede omitir;
  una tarea que se vuelve a ejecutar cuando no debería tiene una entrada que declarar en su configuración de
  `cache`, que `vp run --last-details` nombra. Cuenta también lo que inicia el comando de una tarea: una build que ejecutaba git leía cada archivo cambiado del repositorio, así que cada cambio la reconstruía (2026-10-17, rastreado); ahora nada nuestro ejecuta git dentro de una tarea. La caché es por tarea, nunca `run.cache: true`, que cachearía también todos los scripts.
- **Todo lo que dure más de unos segundos se ejecuta en segundo plano, siempre.** `vp run ci` o cualquiera
  de sus partes, un push, una build, una ejecución de navegador, una instalación. Un comando que corre en primer plano
  se cancela cuando el propietario envía un mensaje (la app de Claude lo detiene), así que el trabajo
  nunca se hace en silencio y se culpa al propietario por hablar. Iniciado en segundo plano, con su salida
  en un archivo que el agente vigila, sobrevive a cada mensaje: el propietario puede hablar con el agente
  en cualquier momento sin romper nada (propietario, 2026-10-17: «esta mierda entre primer plano y
  segundo plano me está jodiendo todo el maldito tiempo»).
- **Dónde se va el tiempo lo dice Vite Plus.** `vp run --last-details` nombra cada tarea, si salió de la caché y por qué se ejecutó; un paso lento es un número ahí, no una sensación (propietario, 2026-10-10: «cómo puede ser 6 minutos»).
- **La respuesta de GitHub viene a ti**, mientras su workflow de CI esté activado. GitHub envía por correo a quien escribió una ejecución en rojo;
  `gh run list` y `gh run view <id>` muestran el resto. Para reproducir un job
  en rojo, una persona ejecuta `vp run <task>` (el nombre del job), el mismo comando que ejecutó GitHub, ya que el workflow no contiene lógica propia. Un agente lee el propio log de la
  ejecución (`gh run view <id> --log-failed`) y ejecuta el área concreta
  (`vp run test:browser --grep <palabras>`). Informa de qué se probó y qué no; nunca llames verificado a un
  trabajo no probado.
- **Un despliegue que falla es la build de Cloudflare, y lo dice allí.** El merge ya ocurrió; el log de la build (las herramientas de builds del conector de Cloudflare, o el panel) nombra qué falló, y `pnpm remy test live <origin>` ejecuta el smoke contra un despliegue a mano. Una traducción fallida termina con código distinto de cero antes de que se comitee nada: nada traducido a medias llega a main.
- Nunca encadenes un comando de control con `grep` o `tail` mediante un pipe: el pipe oculta su código
  de salida. Una vez esto publicó una versión cuyas comprobaciones habían fallado, y el 2026-10-10
  ocultó una comprobación fallida.

## El trabajo manual se convierte en scripts sobre herramientas reales [#manual-work-becomes-scripts-over-real-tools]

Propietario, 2026-09-26: «¡Necesitas llegar al punto en que tus comprobaciones usen mise y la
herramienta subyacente!» y «asegúrate de tener algo en la documentación sobre usar tu criterio respecto
a las cosas que haces manualmente y convertirlas en una tarea de mise que use una herramienta… Es vital
porque todos nuestros repos van a usar esto».

- Cada comprobación se ejecuta a través de un script o un comando de `remy` que envuelve la herramienta
  real: las comprobaciones (`pnpm remy test`, Playwright), el smoke en vivo contra un despliegue
  (`pnpm remy test live`), `remy i18n check`, `pnpm remy shots` para mirar. (Las palabras del
  propietario de arriba dicen mise, que los scripts reemplazaron el 2026-10-11; la regla es la misma.)
  Nada de bucles de `curl`, scripts de un solo uso o greps improvisados para decidir si algo funciona:
  no se pueden repetir, las apps sobre el paquete no los reciben, y nadie los ve después.
- Usa el criterio en todo lo que se hace a mano, no solo en las comprobaciones: la segunda vez que
  escribes los mismos comandos o recurres a un script descartable, se convierte en un comando del
  paquete (`packages/remy-cli/src`, para que cada app lo reciba) que llama a la herramienta que hace el
  trabajo: Wrangler, Playwright, gh, pnpm.
- ¿No se encuentra ninguna herramienta? No escribas un script y sigas adelante. Abre un issue para hacer
  una encuesta
  ([elige herramientas por encuesta](#choose-tools-by-survey-not-by-first-find)). Los agentes
  abren estos issues al encontrarse con tales cosas; el propietario no tiene que pedirlo.
- Todo lo que es más que una línea de una herramienta es TypeScript: un comando de `remy`
  (`packages/remy-cli/src`, con type-check en cada comprobación) o, para lo que es propio de una app, un
  `scripts/*.ts` de esa app, nunca lógica en bash ni JavaScript sin tipos: lo que el compilador no
  puede ver, un agente se lo pierde (propietario, issue #9). Una herramienta de una línea es un script
  de `package.json` ([el plan](https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/tooling-in-typescript.md)).

## Ramas: solo para un Preview, borradas después [#branches-only-for-a-preview-deleted-after]

- El trabajo se empuja directamente a `main`. Una rama sirve para probar algo en su Preview de Cloudflare antes de que salga en vivo
  (`git switch -c <nombre>`, `git push -u origin <nombre>`); cuando está bien, entra en `main` (`git switch main`,
  `git merge --ff-only <nombre>` o `git merge <nombre>`, `git push`) y la rama se borra, aquí y en GitHub
  (`git push origin --delete <nombre>`).
- Una rama mezclada que queda suelta (local o en GitHub) es ruido, no historia: `main` y las etiquetas
  la contienen.

## Compartir una máquina entre agentes [#sharing-one-machine-between-agents]

La máquina se cayó el 2026-09-25 con unos diez agentes construyendo y probando a la vez (carga 188), y
las comprobaciones sensibles al tiempo fallaron mucho antes de eso. Así que:

- Un agente construye y prueba solo en su propio worktree de git, nunca en el checkout principal: las
  builds escriben en `dist/`, y dos builds en un mismo checkout se borran los archivos entre sí.
  Claude Code crea el worktree.
- Si dos checkouts comprueban a la vez, uno de ellos recibe su propio `PREVIEW_PORT` y `DOCS_PREVIEW_PORT` (por defecto 4173
  y 4174; nunca 4190, que los navegadores bloquean): `PREVIEW_PORT=4232 DOCS_PREVIEW_PORT=4233 vp run …`.
- Como máximo tres agentes ejecutan pruebas al mismo tiempo; la investigación, la escritura y los
  spikes de prueba no cuentan. Cuando se necesitan más, pon `PLAYWRIGHT_WORKERS=2` para cada uno.
- Las auditorías de Google (`vp run test:audits`) se ejecutan una página a la vez (`--workers=1`), porque dos mediciones de velocidad simultáneas
  falsean ambas; no ejecutes las auditorías de dos checkouts, ni una auditoría y Core Web Vitals (`pnpm remy test cwv`), al mismo tiempo.
- Nunca encadenes un paso después de una comprobación con `;`: los scripts encadenan con `&&`, así que se detienen en el primer fallo.

## Informar al propietario [#reporting-to-the-owner]

- **Después de cada merge que despliega, el informe empieza con las URL en vivo de lo que sale en vivo**, diga lo
  que diga después (propietario, 2026-09-26: «te sigo diciendo... dame la url cuando despliegues»): la
  app <https://remy-auth.gedw99.workers.dev>, y para el Worker de documentación su guía
  <https://remy-auth-docs.gedw99.workers.dev/docs>, documentación para desarrolladores
  <https://remy-auth-docs.gedw99.workers.dev/dev> y referencia de la API
  <https://remy-auth-docs.gedw99.workers.dev/reference>. Los orígenes están en el `.env` de la app (`VITE_DEPLOY_ORIGIN`,
  `VITE_DOCS_ORIGIN`).
- Todo informe sobre algo que el propietario pueda mirar da sus URL: los sitios en vivo, la vista previa
  (el Preview de Cloudflare de una rama empujada, `https://<rama>-remy-auth.gedw99.workers.dev`) y un enlace directo a cada página o funcionalidad comentada.
- Di qué se comprobó y qué no.
- Lo que está en vivo se pregunta, no se recuerda: `pnpm wrangler deployments list` da la lista propia de Cloudflare, y
  `curl <origin>/healthz` lo que ejecuta un despliegue (su servicio y su versión). Dilo a partir de ahí, no de lo que mezclaste
  la última vez.

## Muchos agentes, un flujo [#many-agents-one-flow]

Propietario, 2026-10-09: «formaliza la forma en que gestionamos el trabajo de desarrollo entre muchos
agentes para usar el nuevo flujo de desarrollo». Cada trozo de trabajo, quienquiera que lo haga, es una
rama a través de los mismos comandos; main es el único integrador, y cada push ejecuta antes `vp run ci`.
Nada de esto se hace a mano.

Los pasos, qué ejecuta cada uno y quién lo ejecuta: [la tabla del flujo](#the-flow-the-standard-way-in-plain-sight).

- **Divide por independencia.** Un orquestador divide el trabajo en partes que tocan archivos
  diferentes, e inicia un agente por parte, cada uno en un worktree propio. Una parte que necesita el
  resultado de otra espera a ese push; no comparte worktree.
- **Haz un spike primero cuando el riesgo es desconocido**: un agente demuestra el punto arriesgado y
  empuja o se detiene.
- **Cada parte se demuestra a sí misma**: entra con su propia comprobación en `tests/`, una función
  simple (`tests/**/*.unit.spec.ts`) cuando puede serlo, en el navegador cuando solo un navegador lo
  muestra.
- **Los pushes se serializan solos.** Dos agentes a la vez: GitHub rechaza el segundo push a `main`, y el segundo agente
  hace pull (`git pull --rebase origin main`), ejecuta `vp run translate` para lo que eso dejó desactualizado y `vp run ready`, y
  vuelve a empujar.
- **Revisión práctica antes de salir en vivo.** Cada push a `main` sale en vivo, así que para todo lo que una persona ve, pasar las
  comprobaciones no es el final: úsalo en el Preview de Cloudflare de una rama en un navegador real, con el ancho de un móvil, y arregla lo que se sienta mal.
  Luego empújalo a `main`.
- **Un agente nunca espera en primer plano** a `git push` (su hook ejecuta `vp run ci`), una ejecución de GitHub o una build de
  Cloudflare; los inicia en segundo plano y actúa sobre el resultado. Solo se espera a `vp run ready`.
- **Todo lo asíncrono vuelve a todos**
  ([el plan](https://github.com/joeblew999/remy-auth/issues/37)): GitHub envía un correo
  al autor de un job en rojo; `gh run list`, `pnpm wrangler deployments list` y `curl <origin>/healthz`
  muestran el resto a quien lo pregunte.
