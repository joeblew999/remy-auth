---
title: "Cómo trabajamos"
description: "Cómo trabajan aquí las personas y los agentes: primero las herramientas del proyecto, estudios antes de elegir herramientas, shadcn y TanStack, puertas de control, planes y traducciones."
---

Este documento es responsable de cómo trabajan las personas y los agentes: los hábitos que ha pedido el propietario, tanto para desarrolladores
como para agentes de IA. Lo que el código debe ser vive en [principios de desarrollo](./development.md).

## Dónde viven las reglas [#where-rules-live]

- Anota aquí cómo trabajamos, en el repositorio, no en la memoria privada de un agente. Cualquiera
  que abra el repositorio, persona o agente, debe encontrar las mismas reglas. La memoria del agente es solo para
  cosas que conciernen a un agente, nunca para cómo funciona el proyecto.
- Cada hecho tiene un único lugar, como exigen los [principios de desarrollo](./development.md#development-principles);
  eso también se aplica a estas reglas.

## Usa primero las herramientas propias del proyecto [#use-the-projects-own-tools-first]

- Empieza con `mise run project:setup`; [herramientas para desarrolladores](./tooling.md) explica qué instala.
- Antes de hacer a mano cualquier paso (instalar, actualizar, publicar, desplegar, traducir), busca su tarea:
  `mise tasks ls | grep <word>`, en el repositorio en el que estés; una app también tiene las tareas compartidas. El propietario,
  el 2026-09-26, después de que una app se actualizara a mano saltándose `project:upgrade-ui`: «you know we do not reinvent wheels».
- Ejecuta los comandos mediante las tareas de mise, comprueba la página real con las herramientas de Chrome DevTools
  (tareas `browser:*`), y usa las skills instaladas antes de leer fuentes externas, buscar en
  `node_modules` o escribir scripts puntuales.
- Mira la página real con las herramientas del navegador antes de escribir una prueba para ella.
- Una vez que las herramientas puedan responder una pregunta, deja de investigar y úsalas.
- Indica cuánto tardará un paso antes de empezar cualquier cosa que tarde más de unos segundos. Las
  descripciones de las tareas (`mise tasks ls`) indican la duración de cada tarea y qué puede ejecutarse al mismo tiempo;
  ejecuta las comprobaciones posteriores al despliegue en segundo plano y sigue trabajando.

## Elige las herramientas mediante un estudio, no por el primer hallazgo [#choose-tools-by-survey-not-by-first-find]

Antes de que un plan nombre una biblioteca o herramienta:

1. Enumera los candidatos realistas, incluidos los más recientes encontrados en npm y GitHub.
2. Puntúalos según criterios fijos y ponderados, con una fuente para cada puntuación.
3. Nombra al segundo finalista y qué nos haría cambiar a él.
4. Demuestra los dos mejores con pequeñas pruebas desde cero.

Marca como supuesto cualquier cosa no verificada.

## Una vez elegida una herramienta, adopta su forma [#once-a-tool-is-chosen-take-its-shape]

Doblamos nuestro sistema hacia la herramienta, no la herramienta hacia nuestro sistema. Antes de construir sobre un framework elegido:

1. Genera su propia plantilla y ejecuta sus propios generadores (funciones de la CLI) en una app de pruebas.
2. Constrúyela y solicita cada ruta que ofrece; enumera qué funciona y qué no.
3. Cambia nuestro layout, nuestros archivos y lo que nuestro código le pasa a la GUI para que coincida, conservando solo lo que exige una regla del propietario
   (las URLs de Paraglide, la UI de shadcn).
4. Elimina todo lo nuestro que la herramienta ya haga. Un plugin o un wrapper propio tiene que justificarse
   frente a la forma estándar, no al revés.

El propietario, el 2026-09-26, después de descubrir que la documentación de Fumadocs estaba medio personalizada: «Es
curioso cómo no te das cuenta hasta que te ves obligado a hacerlo» ([la decisión de Fumadocs](https://github.com/joeblew999/remy-auth/blob/main/.plans/docs-for-consumers.md#decision-fumadocs-fully-2026-09-26)).

## UI: shadcn y TanStack en todo momento [#ui-shadcn-and-tanstack-all-the-way]

La UI es difícil y nunca está terminada, así que aprovechamos lo que shadcn y TanStack llevan años
perfeccionando, y escribimos solo lo que ellos no ofrecen.

- **La CLI de shadcn escribe cada componente y el tema.** Los componentes vienen de `mise run ui:components`,
  el tema de `mise run ui:theme` (el estilo Nova por defecto de shadcn, neutral, Geist: sin preset, sin
  marca propia). `mise run ui:verify` hace fallar el release ante cualquier edición manual. El repositorio usa
  el diseño de monorepo de shadcn, así que `shadcn add` ejecutado en la app escribe en el paquete compartido.
- **Busca un bloque de shadcn antes de construir un layout o una pantalla:**
  `./node_modules/.bin/shadcn search @shadcn -t registry:block`. Añádelo con `shadcn add`, conserva su
  estructura y sustituye solo sus datos de ejemplo. No añadas restricciones que el bloque no tenga (es
  de ancho completo, así que nosotros también lo somos).
- **Compón, no reestilices.** Usa variantes y tokens semánticos; sigue las reglas de la skill de shadcn
  instalada (Separator, Skeleton, Badge, Empty, Alert, Field en lugar de equivalentes hechos a mano).
- **Dos tipos de página:** páginas de sitio para Google y páginas de app bajo `/app`, nunca mezcladas;
  [paths.js](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/paths.js) define ambas.
- **Adopta la biblioteca de TanStack en lugar de código propio** (Form, el adaptador Zod de Router, Table, Devtools
  y demás), instala sus skills de agente y luego elimina el código que reemplaza.
- Antes de escribir cualquier código de UI, pregunta: ¿shadcn, TanStack o Paraglide ya hacen esto? Si es así, úsalo.

- Míralo: antes de dar por terminado un trabajo de UI, haz capturas de las páginas que cambiaste con `mise run browser:shots` (escritorio y
  teléfono, claro y oscuro, inglés y árabe) y mira las capturas. Las comprobaciones demuestran el comportamiento; solo
  las capturas muestran el layout, el espaciado, el desbordamiento y el texto de dirección mixta; nombra las páginas que cambiaste
  (`mise run browser:shots -- /formats --phone`), y `--all` solo para un barrido completo (el propietario, el 2026-09-26: «Es
  realmente deprimente que no podáis ver bien el aspecto del sitio web»).

### Qué biblioteca de TanStack para qué [#which-tanstack-library-for-what]

Comprobado contra [tanstack.com](https://tanstack.com) el 2026-09-26. Las bibliotecas beta y alfa cambian
rápido: lee su documentación actual y las skills instaladas antes de usarlas, no la memoria de un agente.

| Biblioteca | Estado aquí | Regla |
| --- | --- | --- |
| Start, Router, Query | En uso en todas partes | La app, sus páginas y toda la obtención de datos (con oRPC) |
| Form | En uso: solo el formulario de reserva | Todo formulario la usa (inicio de sesión, registro, ajustes); nada de estado de formulario hecho a mano |
| Pacer | En uso: búsqueda en vivo de la documentación | Cualquier debounce, throttle, límite de frecuencia o cola en el navegador |
| Devtools | En uso en desarrollo | Mantener los paneles de Router, Query y Form en las únicas Devtools |
| Table | Siguiente: con las pantallas de administración | Toda lista con ordenación, filtrado o paginación, mediante la tabla de datos de shadcn |
| Virtual | Cuando una lista se alarga | Listas de cientos de filas, empezando por las zonas horarias |
| DB (beta) | Todavía no | Solo si necesitamos uso sin conexión o sincronización en vivo; Query cubre las necesidades actuales |
| AI (beta) | No se usa | El Ask AI de la documentación es una página propia (`/docs/ask`, `/dev/ask`) construida con las piezas de chat de IA de Fumadocs sobre el AI SDK, no una superposición: un solo scroll, la pregunta arriba ([documentación en tus herramientas de IA](./ai-tools.md)) |
| Hotkeys (alfa) | Todavía no | Candidata para un atajo de búsqueda cuando salga de alfa |
| Store (alfa), Charts | No se necesitan | Sin estado de cliente global de la app y todavía sin paneles de control |

Pasar una biblioteca de «Todavía no» a en uso sigue [elige las herramientas mediante un estudio](#choose-tools-by-survey-not-by-first-find).

## La documentación y la demo avanzan con el código [#the-docs-and-the-demo-move-with-the-code]

remy-auth es la base sobre la que se construye cualquier otro repositorio de Remy, y su documentación para desarrolladores es lo que leen sus agentes y
desarrolladores (a través de la skill `remy`, generada a partir de estas páginas). Así que una funcionalidad está terminada cuando
se cumplen cuatro cosas: está en el paquete para todas las apps, la propia app de remy-auth la usa donde cualquiera
puede ver que funciona, una comprobación falla cuando se omite, y la página que la describe se actualiza en el
mismo cambio. El propietario, el 2026-10-09: «Al hacer que Remy-auth reutilice todas sus funcionalidades en su propia demo, resulta
fácil incorporar a IAs y desarrolladores ... la documentación es parte de lo que recibe cualquier otro agente y desarrollador en otros repositorios».
Una página que describe lo que el código ya no hace es un bug; corrígela donde la encuentres.

## Idioma: Paraglide es responsable [#language-paraglide-owns-it]

Paraglide es responsable de todo el comportamiento de idioma: qué idioma recibe una petición, mediante sus estrategias
`url`, `cookie`, `preferredLanguage` y `baseLocale` (definidas en
[paraglide.mjs](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/paraglide.mjs)), y los enlaces localizados, que TanStack Router
transporta. No escribimos capas neutrales de framework ni código de idioma propio; cuando a Paraglide
le falta algo, usa primero sus opciones y registra la carencia en el plan que lo posee.

## Traducciones: un solo redactor [#translations-one-writer]

El inglés es la fuente; las traducciones lo siguen, escritas por un solo redactor a la vez. Los agentes cambian estos
archivos constantemente, así que traducir dentro de cada rama de funcionalidad provoca colisiones y deja los idiomas
actualizados a medias.

- Un agente de funcionalidad escribe solo en inglés: la documentación en inglés y el catálogo base (`messages/en.json`).
  Nunca edita `docs/i18n/` ni el catálogo de otro idioma.
- La traducción es un paso propio, en `main` después de los merges: `mise run i18n:translate`. El agente de Claude,
  fijado en la tarea, traduce exactamente lo que lista `i18n:check`, y la tarea lo confirma con un commit; **el commit
  es la marca** (git decide qué está desactualizado: una traducción está desactualizada cuando su inglés cambió después
  del último commit de la traducción). Rechaza otras ramas, el inglés sin confirmar, las traducciones sin confirmar y una segunda ejecución mientras otra
  tiene el bloqueo, que comparten todos los worktrees, de modo que los agentes en paralelo no pueden lanzar traducciones
  ni competir por ellas.
- El agente no recibe ninguna herramienta: se le entrega el inglés (y, para una página desactualizada, el diff del inglés y
  la traducción actual) y devuelve texto; la tarea escribe los archivos que pidió y nada más.
- `i18n:check` solo lee, sin conexión, así que es seguro en cualquier lugar, en cualquier número de worktrees, y como
  `depends`. `i18n:translate` nunca es un `depends`.
- Lo desactualizado o lo que falta es un aviso mientras se programa (`project:check` lo muestra) y un error en el release
  (`ui:release` ejecuta primero `i18n:check` con `I18N_STRICT=1`).
- Haz commit solo de cambios reales de traducción en un archivo de traducción: cualquier commit en él lo marca como
  al día. Un cambio estructural (un renombrado, un barrido) que toque traducciones de la documentación va seguido de
  `mise run i18n:docs:translate -- <file>…`, que vuelve a comprobar esos archivos por completo contra el inglés.
  Los catálogos no tienen tal repetición: cambia la estructura de un catálogo (el archivo de cada idioma) en el mismo commit que
  `en.json`, para que no quede oculta ninguna clave en inglés que haya cambiado.

La estructura y las tareas están en las [tareas compartidas de mise](./tasks.md#translations).

## Planes: pocos, cortos y cerrados [#plans-few-short-closed]

El propietario, el 2026-09-26: «lo abrumador y frustrante que es tener tantos planes basura». El trabajo nuevo es
una línea en `.plans/now.md`, en el orden en que se cierra. Solo se escribe un archivo de plan para trabajo lo bastante grande
como para aparcarse o para durar semanas; las investigaciones, los análisis y las revisiones van en el plan al que sirven,
no en un archivo propio. Un plan se cierra el día en que su trabajo se publica: una línea de cierre y luego `.plans/done/`. Las
funcionalidades grandes esperan en `.plans/parked/`. Cerrar un plan no necesita un deploy ni una ejecución de pruebas propios: agrupa el
código en un solo deploy y una sola ejecución completa al final.
Las tareas compartidas `plans:*` hacen los movimientos: `plans:status` lista lo abierto, `plans:close`, `plans:park` y
`plans:open` (un plan aparcado que se retoma) añaden la línea, mueven el archivo y reapuntan cada enlace, y `plans:check` (en el nivel 0) mantiene `.plans/` en orden
([tareas](./tasks.md#plans)).

## Cuando el propietario delega decisiones [#when-the-owner-delegates-decisions]

Cuando el propietario delega decisiones, por ejemplo para terminar el trabajo sin supervisión:

- Decide, y registra cada decisión con sus motivos en el plan que la posee.
- Mantén todas las puertas de control en verde; la delegación nunca relaja una comprobación.
- Deja un informe completo: qué se decidió, qué se hizo, qué se comprobó y qué no.

## El flujo: tres comandos, y un guardián que rechaza el resto [#the-flow-three-commands-and-a-guard-that-refuses-the-rest]

El propietario, el 2026-10-09: «El 95 % del tiempo ha sido comprobar y el 5 % programar. Esto no puede seguir así»,
«Es una cuestión de qué ejecutas en local y qué ejecutas en GitHub de forma asíncrona», y «La herramienta formaliza lo que
pasa en desarrollo ... asegúrate de que el flujo de los desarrolladores también esté formalizado, para que no vuelvan a
pasar estas putadas de mierda. Y así tú y los desarrolladores usáis ese mismo flujo para que quede arreglado para siempre».
Así que el flujo es código, no una regla que recordar: `tasks/dev/flow.ts` es el único lugar donde viven sus decisiones,
tres comandos son sus pasos, y un guardián rechaza lo que no sea uno de ellos. remy-auth lo obtiene igual que
cualquier app, desde las tareas compartidas; `project:setup` instala el guardián.

| Paso | Comando | Qué ejecuta | Tiempo |
| --- | --- | --- | --- |
| Después de cada cambio | `mise run dev:change` | la comprobación (`project:check`): planes, tipos con los propios de las tareas, las comprobaciones de funciones puras (`tests/**/*.unit.spec.ts`), el estado de las traducciones; un build solo cuando cambia un archivo de ruta, la documentación solo cuando cambia la documentación | ~6 s |
| El cambio sale de la máquina | `mise run dev:land -- "<what changed>"` | la comprobación, commit, fast-forward de main, push, deploy a staging. GitHub ejecuta entonces todos los idiomas, las auditorías de Google y el fixture de consumidor en paralelo, mientras sigues programando (`gh run list`) | ~1 min, sobre todo el deploy |
| Producción | `mise run dev:promote` | `cf:deploy` y el Worker de la documentación, desde un main ya enviado, sin puerta de control: staging y GitHub ya ejecutaron las comprobaciones | ~1 min |
| Un release | `mise run dev:release` | `packages:release`: todas las comprobaciones, todos los idiomas, en local, a propósito, y luego el tag | ~5 min |

- Un punto que puede parecer extraño: `mise run project:test:only -- <words>` (las comprobaciones de navegador cuyo título
  coincide, en y ar, ~30 s). Es la única ejecución de navegador que ningún paso posee.
- **El guardián** (`dev:guard`, un hook de Claude Code en cada comando de shell que ejecuta un agente) rechaza
  `project:verify`, `project:test`, `project:test:quick`, `project:test:remote`, `project:test:google`,
  `project:test:cwv`, `project:test:consumers`, `template:test`, un `playwright test` suelto e
  `i18n:translate` fuera del flujo, y en su lugar indica el paso correspondiente. Cada uno se puede seguir ejecutando a mano desde una
  terminal: eso es una decisión; que un agente ejecute uno sin que se le pida es el fallo para el que existe el guardián.
- Una regla que pueda expresarse como función va en `tests/**/*.unit.spec.ts` (sin build, sin Worker, sin
  navegador), de modo que se ejecuta gratis en cada comprobación. El navegador es para lo que solo el navegador muestra.
- **Un agente nunca espera a un paso de larga duración.** `dev:land`, `dev:promote`, `dev:release`, una
  traducción, una suite remota: inícialo en segundo plano, sigue trabajando o responde al propietario, y actúa
  cuando el harness indique que ha terminado. Iniciarlo en segundo plano y luego consultarlo en
  primer plano es el mismo fallo (el propietario, el 2026-10-09: «Has vuelto a hacerlo con 2 cosas de larga
  duración»). Solo `dev:change` (segundos) se ejecuta y se espera.
- Una ejecución roja en GitHub es lo siguiente que hay que arreglar: `mise run <the failed task>` la reproduce en local, a
  propósito. Informa de qué se probó y qué no; nunca llames verificado a un trabajo no probado.
- Nunca encadenes un comando de puerta de control con `grep` o `tail` mediante una tubería: la tubería oculta su código de salida.
  Esto ya provocó una vez el release de una versión cuyas comprobaciones habían fallado.

## El trabajo manual se convierte en tareas de mise sobre herramientas reales [#manual-work-becomes-mise-tasks-over-real-tools]

El propietario, el 2026-09-26: «¡Tenéis que llegar al punto en que vuestra comprobación use mise y la herramienta subyacente!»
y «asegúrate de tener algo en la documentación sobre usar tu criterio para que las cosas que haces a mano
se conviertan en una tarea de mise que use una herramienta ... Es vital porque todos nuestros repositorios van a usar esto».

- Cada comprobación se ejecuta mediante una tarea de mise que envuelve la herramienta real: los pasos del flujo y las comprobaciones (`project:test:*`,
  Playwright), `project:test:live` después de un deploy, `plans:check`, `i18n:check`, `browser:shots` para mirar.
  Nada de bucles de `curl`, scripts puntuales ni greps improvisados para decidir si algo funciona: no se pueden
  repetir, las apps que usan el paquete no los obtienen, y nadie los ve después.
- Usa el criterio en todo lo que se hace a mano, no solo en las comprobaciones: la segunda vez que escribas los mismos comandos
  o recurras a un script desechable, conviértelo en una tarea compartida (en `tasks/`, para que la tenga toda app) que llame
  a la herramienta que hace el trabajo: Wrangler, Playwright, gh, npm, las propias funciones de mise.
- ¿No encuentras una herramienta? No escribas un script y sigas adelante. Añade una línea a `.plans/now.md` para hacer un estudio
  ([elige las herramientas mediante un estudio](#choose-tools-by-survey-not-by-first-find)); si la búsqueda o el cambio son grandes,
  escribe tú mismo un plan en `.plans/` (o `.plans/parked/`). Los agentes crean estas líneas y planes en cuanto
  se topan con algo así; el propietario no tiene que pedirlo.
- Una tarea que sea más que una línea de una herramienta es una tarea de archivo TypeScript (`tasks/<namespace>/<name>.ts`;
  Node la ejecuta tal cual, `project:check` le comprueba los tipos dondequiera que estén las tareas, incluida la caché de include
  de un consumidor), nunca lógica en bash ni JavaScript sin tipos: lo que el compilador no puede ver, un agente lo
  pasa por alto (el propietario, issue #9). Donde varias tareas comparten lógica, se avanza hacia una sola herramienta de línea de comandos ([aparcado: remy-cli](https://github.com/joeblew999/remy-auth/blob/main/.plans/tooling-in-typescript.md)).

## Ramas: de vida corta, eliminadas tras el merge [#branches-short-lived-deleted-after-merge]

- El trabajo ocurre en ramas dentro de git worktrees (uno por agente); se fusionan en `main` y se eliminan, junto con
  su worktree, justo después del merge. Solo se envían a GitHub `main` y los tags de release; una rama llega a GitHub
  solo para una pull request, y GitHub la elimina cuando el PR se fusiona («Automatically delete head
  branches», activado para todos los repositorios, 2026-09-26).
- Una rama fusionada que queda (en local o en GitHub) es ruido, no historia: `main` y los tags ya la conservan.

## Compartir una máquina entre agentes [#sharing-one-machine-between-agents]

La máquina se bloqueó el 2026-09-25 con unos diez agentes construyendo y probando a la vez (carga 188),
y las comprobaciones sensibles al tiempo ya fallaban mucho antes de eso. Por tanto:

- Un agente construye y prueba solo en su propio git worktree, nunca en el checkout principal: las builds escriben
  en `dist/`, y dos builds en un mismo checkout se borran los archivos mutuamente.
- Cada agente define su propio `PREVIEW_PORT` desde el shell (el `mise.toml` del repositorio lo lee; nunca 4190,
  que los navegadores bloquean).
- Como máximo tres agentes ejecutan pruebas a la vez; la investigación, la escritura y las pruebas exploratorias no
  cuentan. Cuando se necesiten más, define `PLAYWRIGHT_WORKERS=2` para cada uno.
- El nivel de Google (`project:test:google`, `project:test:cwv`) toma un bloqueo a nivel de máquina, de modo que una segunda
  ejecución espera en lugar de distorsionar la primera.
- Nunca encadenes un deploy después de una comprobación con `;`: los pasos del flujo se ejecutan uno tras otro y se detienen en el primer fallo.

## Informar al propietario [#reporting-to-the-owner]

- **Después de cada deploy, el informe empieza con las URLs en producción de lo que se desplegó**, diga lo que diga además
  (el propietario, el 2026-09-26: «Os sigo diciendo ... dadme la url cuando hagáis un deploy»): la app
  <https://remy-auth.gedw99.workers.dev>, su staging <https://remy-auth-staging.gedw99.workers.dev>, y para el Worker de la documentación su guía
  <https://remy-auth-docs.gedw99.workers.dev/docs>, la documentación para desarrolladores
  <https://remy-auth-docs.gedw99.workers.dev/dev> y la referencia de la API
  <https://remy-auth-docs.gedw99.workers.dev/reference>. `cf:deploy` y `docs:deploy` las imprimen al final.
- Todo informe sobre algo que el propietario pueda revisar incluye sus URLs: los sitios en producción, la preview
  (`mise run cf:preview` la imprime) y un enlace directo a cada página o funcionalidad tratada.
- Indica qué se comprobó y qué no.
- Lo que está en producción se pregunta, no se recuerda: `mise run cf:versions` muestra qué está ejecutando cada deployment
  y cuán lejos está eso de tu checkout. Dilo a partir de eso, no de lo último que desplegaste.

## Trabajo multiagente [#multi-agent-work]

Cuando el trabajo se divide en partes independientes y el propietario ha pedido orquestación multiagente,
usa esta forma:

1. **Prueba exploratoria primero.** Un agente demuestra los puntos de riesgo y se detiene si encuentra un bloqueo.
2. **Un agente por parte.** Cada uno trabaja en su propio git worktree y usa su propio puerto, de modo que las partes
   nunca colisionan.
3. **Cada parte se demuestra a sí misma.** Cada parte se entrega con su propia comprobación compartida.
4. **Un integrador.** Fusiona las partes en la rama de trabajo y ejecuta el nivel 1 y el nivel 2.
   Nada llega a `main` a menos que ambos pasen.
5. **Pase manual.** Pasar las comprobaciones no es el final. Despliega una preview con `mise run cf:preview`
   y usa cada pieza en un Chrome real, limitado a un teléfono gama media, con una traza de rendimiento y capturas de pantalla.
   Anota cómo se siente: la espera antes del contenido, los saltos de layout, los destellos y cualquier cosa
   molesta. Corrige lo que se sienta mal antes de fusionar, incluso cuando sus comprobaciones pasen.
