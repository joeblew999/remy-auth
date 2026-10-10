---
title: "Cómo trabajamos"
description: "Cómo trabajan aquí las personas y los agentes: las herramientas del proyecto primero, encuestas antes de elegir herramientas, shadcn y TanStack, puertas de control, planes y traducciones."
---

Este documento es el dueño de cómo trabajan las personas y los agentes: los hábitos que ha pedido el
propietario, tanto para desarrolladores como para agentes de IA. Lo que el código debe ser vive en
[principios de desarrollo](./development.md).

## Dónde viven las reglas [#where-rules-live]

- Escribe cómo trabajamos aquí, en el repositorio, no en la memoria privada de un agente. Cualquiera
  que abra el repositorio, persona o agente, debe encontrar las mismas reglas. La memoria del agente
  es solo para cosas que concierne a un único agente, nunca para cómo funciona el proyecto.
- Cada hecho tiene un único hogar, como exigen los
  [principios de desarrollo](./development.md#development-principles); eso también aplica a estas reglas.
- Los `AGENTS.md` y `CLAUDE.md` de la raíz son punteros a [Agentes: empieza aquí](./agents.md) y no
  contienen ninguna regla propia: `CLAUDE.md` es un `@import` de esa página, así que Claude Code la
  carga; `AGENTS.md` la nombra, para Codex y cualquier otra herramienta. Una regla escrita en
  cualquiera de los dos está en el lugar equivocado (propietario, 2026-10-10: «Agents.md y Claude.md en
  la raíz deben ser solo un puntero al área de documentación para agentes»).

## Ves algo: arréglalo o escríbelo, en el mismo landing [#see-something-fix-it-or-write-it-down-in-the-same-landing]

Propietario, 2026-10-09, tras encontrar un hueco cada vez que preguntaba: «Está bastante claro que la
documentación de los agentes está mal si estás viendo problemas y no actúas sobre ellos ni te informas
a ti mismo ni a los devs». Así que la regla es general, no solo para herramientas que faltan:

- Un agente o desarrollador que note algo mal, lento, que falte o que haya quedado suelto (un paso que
  no espera nada, una comprobación que nadie ejecuta, una rama que nadie posee, un documento que dice
  algo que ya no es cierto) tiene dos opciones, ambas dentro del landing en el que está: **arreglarlo**
  cuando es pequeño, o **escribirlo en `.plans/now.md`** («Qué queda, en orden»: qué se vio, dónde, y
  qué lo arreglaría), un archivo de plan cuando es grande. Mencionarlo solo en un chat o en un informe
  no es ninguna de las dos cosas.
- **Todos se enteran a través del repo**: `dev:status` imprime esa lista en cada sesión (los agentes la
  abren con esto), así que lo que una persona vio llega a todos, y el siguiente landing toma lo primero
  de la lista.
- **«Hecho» es el final de una barrida, no de una lista.** Antes de decirlo: ramas y worktrees, pull
  requests abiertas, `cf:versions`, `plans:check`, una búsqueda de las palabras que el cambio retiró, la
  documentación que el cambio tocó. Muestra la barrida.

## Usa primero las herramientas propias del proyecto [#use-the-projects-own-tools-first]

- Empieza con `mise run project:setup`; [herramientas para desarrolladores](./tooling.md) explica qué
  instala.
- Antes de hacer cualquier paso a mano (instalar, actualizar, publicar, desplegar, traducir), busca su
  tarea: `mise tasks ls | grep <palabra>`, en cualquier repositorio en el que estés; una app también
  tiene las tareas compartidas. Propietario, 2026-09-26, después de que una app fuera actualizada a mano
  pasando por encima de `project:upgrade-ui`: «ya sabes que no reinventamos la rueda».
- Ejecuta los comandos a través de las tareas de mise, comprueba la página real con las herramientas de
  Chrome DevTools (tareas `browser:*`), y usa las skills instaladas antes de leer las fuentes
  originales, buscar en `node_modules` o escribir scripts de un solo uso.
- Mira la página real con las herramientas del navegador antes de escribir una prueba para ella.
- Una vez que las herramientas pueden responder una pregunta, deja de investigar y úsalas.
- Indica cuánto tardará un paso antes de empezar cualquier cosa más lenta que unos segundos. Las
  descripciones de las tareas (`mise tasks ls`) indican la duración de cada tarea y qué puede
  ejecutarse al mismo tiempo; ejecuta las comprobaciones posteriores al despliegue en segundo plano y
  sigue trabajando.

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
«Es curioso cómo no te das cuenta hasta que te empujan».
([la decisión de Fumadocs](https://github.com/joeblew999/remy-auth/blob/main/.plans/docs-for-consumers.md#decision-fumadocs-fully-2026-09-26)).

## UI: shadcn y TanStack hasta el final [#ui-shadcn-and-tanstack-all-the-way]

La UI es difícil y nunca está terminada, así que tomamos lo que shadcn y TanStack han pasado años
perfeccionando, y escribimos solo lo que ellos no ofrecen.

- **La CLI de shadcn escribe cada componente y el tema.** Los componentes vienen de
  `mise run ui:components`, el tema de `mise run ui:theme` (el estilo Nova por defecto de shadcn,
  neutral, Geist: sin preset, sin marca propia). `mise run ui:verify` hace fallar la publicación ante
  cualquier edición manual. El repositorio usa el layout de monorepo de shadcn, así que `shadcn add`
  ejecutado en la app escribe en el paquete compartido.
- **Busca un bloque de shadcn antes de construir un layout o una pantalla:**
  `./node_modules/.bin/shadcn search @shadcn -t registry:block`. Añádelo con `shadcn add`, conserva su
  estructura, y sustituye solo sus datos de ejemplo. No añadas restricciones que el bloque no tenga (es
  de ancho completo, así que nosotros también).
- **Compón, no restilices.** Usa variantes y tokens semánticos; sigue las reglas de la skill de shadcn
  instalada (Separator, Skeleton, Badge, Empty, Alert, Field en lugar de equivalentes hechos a mano).
- **Dos tipos de página:** páginas del sitio para Google y páginas de la app bajo `/app`, nunca
  mezcladas; [paths.js](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/paths.js)
  define ambas.
- **Adopta la librería de TanStack en lugar de nuestro propio código** (Form, el adaptador de Zod de
  Router, Table, Devtools y demás), instala sus skills de agente, y luego elimina el código que
  sustituye.
- Antes de escribir cualquier código de UI, pregunta: ¿esto ya lo hace shadcn, TanStack o Paraglide? Si
  es así, úsalo.

- Mírala: antes de dar por terminado un trabajo de UI, haz capturas de las páginas que cambiaste con
  `mise run browser:shots` (escritorio y móvil, claro y oscuro, inglés y árabe) y mira las capturas. Las
  comprobaciones demuestran el comportamiento; solo las capturas muestran el layout, el espaciado, el
  desbordamiento y el texto de dirección mixta; nombra las páginas que cambiaste
  (`mise run browser:shots -- /formats --phone`), usa `--all` solo para una barrida completa
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
[paraglide.mjs](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/paraglide.mjs)), y los
enlaces localizados, que TanStack Router transporta. No escribimos capas neutrales respecto al
framework ni código de idioma propio; cuando a Paraglide le falta algo, usa primero sus opciones y
registra el hueco en el plan que lo posee.

## Traducciones: un único escritor [#translations-one-writer]

El inglés es la fuente; las traducciones lo siguen, escritas por un único escritor a la vez. Los
agentes cambian estos archivos todo el tiempo, así que traducir dentro de cada rama de funcionalidad
choca y deja los idiomas a medio actualizar.

- Un agente de funcionalidad escribe solo en inglés: la documentación en inglés y el catálogo base
  (`messages/en.json`). Nunca edita una traducción (`<página>.<idioma>.md` en `docs/content`) ni el
  catálogo de otro locale.
- La traducción es su propio paso, en `main` tras los merges: `dev:land` ejecuta `i18n:translate` ahí,
  al final, cuando algo está desactualizado; nadie la ejecuta por su cuenta. El agente Claude, fijado
  en la tarea, traduce exactamente lo que lista `i18n:check`, y la tarea lo comitea; **el commit es la
  marca** (git decide qué está desactualizado: una traducción está desactualizada cuando su inglés
  cambió después del último commit de la traducción). Se niega a ejecutarse en otras ramas, con inglés
  sin comitear, con traducciones sin comitear y en una segunda ejecución mientras otra mantiene el
  lock, que comparte cada worktree, así que los agentes en paralelo no pueden disparar traducciones ni
  competir por ellas.
- El agente no recibe herramientas: se le entrega el inglés (y, para una página desactualizada, el diff
  del inglés y la traducción actual) y devuelve texto; la tarea escribe los archivos que pidió y nada
  más.
- Lo que devuelve el agente se escribe solo cuando es la página: cada campo del frontmatter que tiene su
  inglés, y el texto que viene después (`tasks/i18n/docs/page.ts`). Un agente fallido deja la página
  como estaba, dice por qué y hace fallar la ejecución; `dev:land` entonces dice que la traducción
  todavía se debe, y el siguiente landing lo vuelve a intentar. `tests/unit/i18n-docs.unit.spec.ts`
  sujeta a cada página traducida del repositorio a la misma regla, en cada comprobación y en GitHub, la
  única comprobación que recibe el propio commit de una traducción. El 2026-10-09 el `null` de un agente
  fallido se comiteó como una página y detuvo la construcción de la documentación en main.
- Una traducción que no es una página se borra, nunca se restaura a mano: una página que falta se
  traduce desde el inglés en el siguiente landing, y una restaurada a mano quedaría marcada como actual
  por su commit.
- `i18n:check` solo lee, sin conexión, así que es seguro en cualquier lugar, en cualquier número de
  worktrees, y como `depends`. `i18n:translate` nunca es un `depends`.
- Desactualizado o faltante es un aviso mientras se avanza (`project:check` lo imprime) y un error al
  publicar (`ui:release` ejecuta `i18n:check` con `I18N_STRICT=1` primero).
- Comitea en un archivo de traducción solo cambios de traducción reales: cualquier commit sobre él lo
  marca como actual. Un cambio estructural (un renombrado, una barrida) que toca traducciones de
  documentación va seguido de `mise run i18n:docs:translate -- <archivo>…`, que vuelve a comprobar esos
  archivos contra el inglés por completo. Los catálogos no tienen ese rehacer: cambia la estructura de
  un catálogo (el archivo de cada locale) en el mismo commit que `en.json`, para que ninguna clave de
  inglés cambiada quede oculta.

El layout y las tareas están en [tareas compartidas de mise](./tasks.md#translations).

## Planes: pocos, cortos, cerrados [#plans-few-short-closed]

Propietario, 2026-09-26: «qué agobiante y frustrante es tener tantos planes basura». El trabajo nuevo es
una línea en `.plans/now.md`, en el orden en que se cierra. Un archivo de plan se escribe solo para
trabajo lo bastante grande como para aparcarlo o para que se prolongue durante semanas; la
investigación, los análisis y las revisiones van en el plan a que sirven, no en un archivo propio. Un
plan se cierra el día que su trabajo se publica: una línea de cierre, y luego a `.plans/done/`. Las
grandes funcionalidades esperan en `.plans/parked/`. Cerrar un plan no necesita un despliegue ni una
ejecución de pruebas extra propia: agrupa el código en un único despliegue y una única ejecución
completa al final.
Las tareas compartidas `plans:*` hacen los movimientos: `plans:status` lista lo que está abierto,
`plans:close`, `plans:park` y `plans:open` (un plan aparcado que se retoma) añaden la línea, mueven el
archivo y redirigen cada enlace, y `plans:check` (en el nivel 0) mantiene `.plans/` ordenado
([tareas](./tasks.md#plans)).

## Cuando el propietario delega decisiones [#when-the-owner-delegates-decisions]

Cuando el propietario delega decisiones, por ejemplo para terminar trabajo sin supervisión:

- Decide, y registra cada decisión con sus razones en el plan al que pertenece.
- Mantén todas las puertas de control en verde; la delegación nunca relaja una comprobación.
- Deja un informe completo: qué se decidió, qué se hizo, qué se comprobó y qué no.

## El flujo: cuatro pasos, y un guardián que rechaza el resto [#the-flow-four-steps-and-a-guard-that-refuses-the-rest]

Propietario, 2026-10-09: «El 95% del tiempo ha sido comprobar y el 5% codificar. Esto no puede
continuar así», «Es una cuestión de qué ejecutas localmente y qué ejecutas en GitHub de forma
asíncrona», y «Las herramientas formalizan lo que pasa en el desarrollo… asegúrate de que el flujo del
desarrollador también esté formalizado para que estas putadas estúpidas no puedan volver a pasar. Y
para que tú y los desarrolladores usen ese mismo flujo para que quede arreglado para siempre». Así que
el flujo es código, no una regla que recordar: `tasks/dev/flow.ts` es el único lugar donde viven sus
decisiones. Sus cuatro pasos son `dev:change`, `dev:land`, `dev:promote` y `dev:release` (el `Step` de
`flow.ts`); `dev:start` y `dev:done` enmarcan un trozo de trabajo; `dev:status` mira; un guardián
rechaza lo que no sea uno de ellos. Siete comandos, nada más. remy-auth lo obtiene de la misma forma
que cada app, desde las tareas compartidas; `project:setup` instala el guardián.

| Paso | Comando | Quién lo ejecuta, y cuándo | Qué ejecuta | Tiempo |
| --- | --- | --- | --- | --- |
| Mirar | `mise run dev:status` | todos, primero: cada sesión de agente se abre con esto (un hook), un desarrollador cuando se sienta a trabajar | los últimos commits de main con el veredicto de GitHub, qué ejecuta cada despliegue, cada worktree por delante y por detrás de main, traducciones, pull requests, lo primero de `.plans/now.md` | segundos |
| Antes de un trozo de trabajo | `mise run dev:start -- <nombre>` | quien hace el trabajo, para cada trozo, incluida una edición de una línea | un worktree propio a partir de main, instalado, con sus propios puertos, el guardián | ~1 min |
| Después de cada cambio | `mise run dev:change` | quien esté codificando; el único paso que se espera | la comprobación (`project:check`): planes, tipos con los de las propias tareas, las comprobaciones de funciones simples (`tests/**/*.unit.spec.ts`), el estado de las traducciones; una build solo cuando cambió un archivo de ruta, la documentación solo cuando cambió la documentación | ~6 s |
| El cambio deja la máquina | `mise run dev:land -- "<qué cambió>"` | quien hizo el trabajo, por su cuenta, en cuanto termina y la comprobación está en verde | la comprobación, commit, fast-forward de main, push, despliegue en staging, y luego la traducción al final cuando está desactualizada. GitHub entonces ejecuta cada idioma, las auditorías de Google y el fixture de consumer en paralelo, mientras sigues codificando (`gh run list`) | ~1 min hasta staging; la traducción después |
| Producción | `mise run dev:promote` | el propietario, o un agente a quien el propietario se lo pidió en esa sesión | `cf:deploy` y el Worker de documentación, a partir de un main ya empujado, sin puerta de control: staging y GitHub ya ejecutaron las comprobaciones | ~1 min |
| Una publicación | `mise run dev:release` | el propietario, o un agente a quien el propietario se lo pidió en esa sesión | `packages:release`: cada comprobación, cada idioma, localmente, a propósito, y luego la etiqueta | ~5 min |
| Cuando está landed | `mise run dev:done` | quien hizo el landing, cuando el trozo de trabajo termina; un worktree sobrevive a tantos landings como el trabajo necesite | el worktree y la rama desaparecen | segundos |

- **Quién ejecuta un paso está en la tabla, y nunca es una pregunta.** Un agente aterriza su propio
  trabajo terminado sin preguntar: staging forma parte del landing, GitHub comprueba cada landing, y
  nada llega a producción por ese camino. La palabra del propietario es para producción y para una
  publicación, los dos pasos cuya columna así lo dice, y para el aprovisionamiento
  ([principios de desarrollo](./development.md#development-principles)). Un agente que lee la tabla y
  aun así pregunta si debe aterrizar ha dejado de usar el flujo (propietario, 2026-10-10, después de que
  uno lo hiciera: «¿Está absolutamente claro cuándo te corresponde ejecutar cada paso?»).

- Un área que parece mal: `mise run project:test:only -- <palabras>` (las comprobaciones de navegador
  cuyo título coincide, en y ar, ~30 s). Es la única ejecución de navegador que no es propiedad de un
  paso.
- **El guardián** (`dev:guard`, un hook de Claude Code en cada comando de shell que ejecuta un agente) se
  niega a ejecutar `project:verify`, `project:test`, `project:test:quick`, `project:test:remote`,
  `project:test:google`, `project:test:cwv`, `project:test:consumers`, `template:test`, un
  `playwright test` desnudo e `i18n:translate` fuera del flujo, y en su lugar nombra el paso
  correspondiente. Todos ellos siguen pudiendo ejecutarse a mano desde una terminal, con
  `REMY_FLOW=hand` por delante (`REMY_FLOW=hand mise run project:test`): la propia tarea pregunta quién
  la está ejecutando (`dev:allowed`) y se niega ante un `mise run` desnudo, en cualquier máquina. Eso es
  una decisión de una persona; el guardián se niega a ejecutarlo desde un agente aun así, que es el
  fallo para el que existe. Una tarea cuyo propio trabajo termina con la verificación (`project:setup`,
  `packages:upgrade`, `project:upgrade-ui`) indica que está preguntando, así que esas se ejecutan tal
  como están escritas.
- **Estas páginas nunca dan un comando que las herramientas rechacen.** Una tarea pesada se escribe con
  `REMY_FLOW=hand` por delante o se nombra sin `mise run`; `tests/unit/dev-flow.unit.spec.ts` lee cada
  página en inglés y cada tarea en busca de una ejecución desnuda, en cada comprobación (2026-10-10:
  ocho líneas en cinco páginas lo hacían, y `project:setup` terminó en el rechazo).
- Una regla que puede ser una función pertenece a `tests/**/*.unit.spec.ts` (sin build, sin Worker, sin
  navegador), así se ejecuta en cada comprobación gratis. El navegador es para lo que solo un navegador
  muestra.
- **Un agente nunca espera en un paso de larga duración.** `dev:land`, `dev:promote`, `dev:release`,
  una traducción, una suite remota: inícialo en segundo plano, sigue trabajando o responde al
  propietario, y actúa cuando el harness diga que terminó. Iniciarlo en segundo plano y luego hacer
  polling de él en primer plano es el mismo fallo (propietario, 2026-10-09: «Acabas de hacerlo otra vez
  con 2 cosas de larga duración»). Solo `dev:change` (segundos) se ejecuta y se espera.
- **Cada paso dice cuánto tardó.** mise imprime el tiempo de cada tarea; `dev:land` termina con sus
  partes (la comprobación; commit, main y push; staging; traducción) y dice cuánto tardó staging en
  estar listo desde el inicio; el traductor dice, para cada llamada al agente, cuánto tardó Claude
  Code, cuánto de eso fue la API, y cuántos tokens escribió. Un paso lento es un número en el log, no
  una sensación (propietario, 2026-10-10, sobre un landing con staging listo a los 40 segundos cuyo
  comando tardó seis minutos: «cómo puede ser 6 minutos»).
- **La respuesta de GitHub viene a ti.** Una ejecución en rojo comenta en el commit (GitHub se lo dice a
  su autor), nombrando la ejecución; `dev:change` empieza diciendo qué hizo la última ejecución en
  main; `dev:promote` se niega sobre un commit cuya ejecución no esté en verde o no haya terminado. Para
  reproducir un job en rojo, una persona ejecuta `REMY_FLOW=hand mise run <su tarea>`, la misma tarea
  que ejecutó GitHub, ya que el workflow no contiene lógica propia (`project:verify-tooling` comprueba
  que exista cada tarea que un workflow nombra). Un agente lee el propio log de la ejecución
  (`gh run view <id> --log-failed`) y ejecuta el área concreta (`mise run project:test:only --
  <palabras>`). Informa de qué se probó y qué no; nunca llames verificado a un trabajo no probado.
- **Un landing que falla después del push aun así termina lo que puede, y dice dónde se detuvo.**
  Main se empuja antes que staging; cuando el despliegue de staging o su smoke en vivo falla,
  `dev:land` igualmente ejecuta la traducción (está en main, se debe de todos modos), y luego termina
  con código distinto de cero con el estado en una línea: en qué commit se empujó main, si staging se
  desplegó o no, qué smoke falló, si la traducción se hizo o no. No se deja nada a medias para que la
  siguiente persona lo descubra (propietario, 2026-10-10, después de que un landing se detuviera en el
  smoke con la traducción omitida en silencio: «ahora tú y los demás agentes estáis jodidos»).
- Nunca encadenes un comando de control con `grep` o `tail` mediante un pipe: el pipe oculta su código
  de salida. Una vez esto publicó una versión cuyas comprobaciones habían fallado, y el 2026-10-10
  ocultó un `dev:land` fallido.

## El trabajo manual se convierte en tareas de mise sobre herramientas reales [#manual-work-becomes-mise-tasks-over-real-tools]

Propietario, 2026-09-26: «¡Necesitas llegar al punto en que tus comprobaciones usen mise y la
herramienta subyacente!» y «asegúrate de tener algo en la documentación sobre usar tu criterio respecto
a las cosas que haces manualmente y convertirlas en una tarea de mise que use una herramienta… Es vital
porque todos nuestros repos van a usar esto».

- Cada comprobación se ejecuta a través de una tarea de mise que envuelve la herramienta real: los
  pasos del flujo y las comprobaciones (`project:test:*`, Playwright), `project:test:live` después de
  un despliegue, `plans:check`, `i18n:check`, `browser:shots` para mirar. Nada de bucles de `curl`,
  scripts de un solo uso o greps improvisados para decidir si algo funciona: no se pueden repetir, las
  apps sobre el paquete no los reciben, y nadie los ve después.
- Usa el criterio en todo lo que se hace a mano, no solo en las comprobaciones: la segunda vez que
  escribes los mismos comandos o recurres a un script descartable, se convierte en una tarea compartida
  (en `tasks/`, para que cada app la reciba) que llama a la herramienta que hace el trabajo: Wrangler,
  Playwright, gh, npm, las propias funciones de mise.
- ¿No se encuentra ninguna herramienta? No escribas un script y sigas adelante. Añade una línea a
  `.plans/now.md` para hacer una encuesta
  ([elige herramientas por encuesta](#choose-tools-by-survey-not-by-first-find)); si la búsqueda o el
  cambio es grande, escribe un plan en `.plans/` (o en `.plans/parked/`) tú mismo. Los agentes crean
  estas líneas y planes al encontrarse con tales cosas; el propietario no tiene que pedirlo.
- Una tarea que es más que una línea de una herramienta es una tarea en archivo TypeScript
  (`tasks/<namespace>/<nombre>.ts`; Node la ejecuta tal cual, `project:check` le hace type-check
  dondequiera que estén las tareas, incluida la caché de include de un consumer), nunca lógica en bash
  ni JavaScript sin tipos: lo que el compilador no puede ver, un agente se lo pierde (propietario,
  issue #9). Donde varias tareas comparten lógica, se avanza hacia una única herramienta de línea de
  comandos ([aparcado: remy-cli](https://github.com/joeblew999/remy-auth/blob/main/.plans/tooling-in-typescript.md)).

## Ramas: de vida corta, borradas tras el merge [#branches-short-lived-deleted-after-merge]

- El trabajo ocurre en ramas dentro de worktrees de git (uno por agente); se mezclan en `main` y se
  borran, junto con su worktree, justo después del merge. Solo se empujan `main` y las etiquetas de
  publicación; una rama va a GitHub solo para una pull request, y GitHub la borra cuando la PR se
  mezcla («Automatically delete head branches», activado para cada repo, 2026-09-26).
- Una rama mezclada que queda suelta (local o en GitHub) es ruido, no historia: `main` y las etiquetas
  la contienen.

## Compartir una máquina entre agentes [#sharing-one-machine-between-agents]

La máquina se cayó el 2026-09-25 con unos diez agentes construyendo y probando a la vez (carga 188), y
las comprobaciones sensibles al tiempo fallaron mucho antes de eso. Así que:

- Un agente construye y prueba solo en su propio worktree de git, nunca en el checkout principal: las
  builds escriben en `dist/`, y dos builds en un mismo checkout se borran los archivos entre sí.
  `dev:start` crea el worktree.
- Cada worktree tiene su propio `PREVIEW_PORT` y `DOCS_PREVIEW_PORT` (`dev:start` los escribe en
  `mise.local.toml`, nunca 4190, que los navegadores bloquean).
- Como máximo tres agentes ejecutan pruebas al mismo tiempo; la investigación, la escritura y los
  spikes de prueba no cuentan. Cuando se necesitan más, pon `PLAYWRIGHT_WORKERS=2` para cada uno.
- El nivel de Google (`project:test:google`, `project:test:cwv`) toma un lock de toda la máquina, así
  que una segunda ejecución espera en lugar de distorsionar la primera.
- Nunca encadenes un despliegue después de una comprobación con `;`: los pasos del flujo se ejecutan
  uno tras otro y se detienen en el primer fallo.

## Informar al propietario [#reporting-to-the-owner]

- **Después de cada despliegue, el informe empieza con las URL en vivo de lo que se desplegó**, diga lo
  que diga después (propietario, 2026-09-26: «te sigo diciendo... dame la url cuando despliegues»): la
  app <https://remy-auth.gedw99.workers.dev>, su staging <https://remy-auth-staging.gedw99.workers.dev>, y
  para el Worker de documentación su guía <https://remy-auth-docs.gedw99.workers.dev/docs>,
  documentación para desarrolladores <https://remy-auth-docs.gedw99.workers.dev/dev> y referencia de la
  API <https://remy-auth-docs.gedw99.workers.dev/reference>. `cf:deploy` y `docs:deploy` las imprimen al
  final.
- Todo informe sobre algo que el propietario pueda mirar da sus URL: los sitios en vivo, la vista previa
  (`mise run cf:preview` la imprime) y un enlace directo a cada página o funcionalidad comentada.
- Di qué se comprobó y qué no.
- Lo que está en vivo se pregunta, no se recuerda: `mise run cf:versions` imprime qué está ejecutando
  cada despliegue y cuán lejos está eso de tu checkout. Dilo a partir de ahí, no de lo que desplegaste
  la última vez.

## Muchos agentes, un flujo [#many-agents-one-flow]

Propietario, 2026-10-09: «formaliza la forma en que gestionamos el trabajo de desarrollo entre muchos
agentes para usar el nuevo flujo de desarrollo». Cada trozo de trabajo, quienquiera que lo haga, es un
worktree a través de los mismos comandos; main es el único integrador, y GitHub comprueba cada
landing. Nada de esto se hace a mano.

| | Comando | Qué hace |
| --- | --- | --- |
| Mirar | `mise run dev:status` | qué está pasando, preguntado a los dueños de los hechos: los últimos commits de main con el veredicto de GitHub, qué ejecuta cada despliegue, cada worktree por delante y por detrás de main, traducciones, pull requests. Cada sesión de agente se abre con esto (un hook que registra `dev:guard`); un desarrollador lo ejecuta cuando se sienta a trabajar |
| Empezar | `mise run dev:start -- <nombre>` | un worktree en la rama `<nombre>` a partir de main (`.claude/worktrees/<nombre>`), instalado (`npm ci`, `project:prepare`), con puertos propios (`mise.local.toml`) y el guardián del flujo. Los propios worktrees de Claude Code viven en el mismo lugar y son solo una carpeta: dentro de uno, `mise run dev:start` sin nombre lo prepara de la misma forma |
| Codificar | `mise run dev:change` | la comprobación, en segundos, después de cada cambio |
| Aterrizar | `mise run dev:land -- "<qué cambió>"` | primero se mezcla main (un conflicto se detiene nombrando los archivos), la comprobación, commit, fast-forward de main, push, staging, y luego la traducción al final cuando está desactualizada (la suscripción de Claude en esta máquina, nunca GitHub). GitHub ejecuta las comprobaciones pesadas; una ejecución en rojo comenta en el commit |
| Terminar | `mise run dev:done` | el worktree y la rama que ya aterrizaron desaparecen; se niega mientras algo quede sin aterrizar |
| Producción | `mise run dev:promote` | a partir de main, solo un commit que GitHub aprobó, con la palabra del propietario |

- **Divide por independencia.** Un orquestador divide el trabajo en partes que tocan archivos
  diferentes, y inicia un agente por parte con `dev:start`. Una parte que necesita el resultado de otra
  espera a ese landing; no comparte worktree.
- **Haz un spike primero cuando el riesgo es desconocido**: un agente demuestra el punto arriesgado y
  aterriza o se detiene.
- **Cada parte se demuestra a sí misma**: aterriza con su propia comprobación en `tests/`, en el nivel
  de función simple cuando puede serlo, en el navegador cuando solo un navegador lo muestra.
- **Los landings se serializan solos.** Dos agentes aterrizando a la vez: el `dev:land` del segundo ve
  que main se movió, lo mezcla, vuelve a comprobar y aterriza. El paso de traducción es un único
  escritor en todos los worktrees.
- **Revisión práctica antes de producción.** Pasar las comprobaciones no es el final: usa la pieza en
  staging en un navegador real, con el ancho de un móvil, y arregla lo que se sienta mal. Luego
  `dev:promote`.
- **Un agente nunca espera en primer plano** a `dev:land`, `dev:promote` o una ejecución de GitHub; los
  inicia en segundo plano y actúa sobre el resultado. Solo se espera a `dev:change`.
- **Todo lo asíncrono vuelve a todos**
  ([el plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/dev-feedback.md)): un job de
  GitHub en rojo escribe en el commit, nombrándose a sí mismo; `dev:land` dice cuando main está en rojo;
  `dev:promote` escribe en el commit qué se publicó; `dev:status` muestra todo esto a quien lo pregunte,
  y cada sesión de agente lo pregunta primero.
