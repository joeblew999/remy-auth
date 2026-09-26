<!-- translated-from: docs/how-we-work.md @ 11dbe64a1e2ba66c0592a75aa2f69e0f075cb611 -->
# Cómo trabajamos [#how-we-work]

[Volver al índice de agentes](../AGENTS.md) · [Principios de desarrollo](development.md) · [Herramientas para desarrolladores](tooling.md)

Este documento es responsable de cómo trabajan las personas y los agentes: los hábitos que ha pedido el propietario, tanto para desarrolladores
como para agentes de IA. Lo que el código debe ser vive en [principios de desarrollo](development.md).

## Dónde viven las reglas [#where-rules-live]

- Anota aquí cómo trabajamos, en el repositorio, no en la memoria privada de un agente. Cualquiera
  que abra el repositorio, persona o agente, debe encontrar las mismas reglas. La memoria del agente es solo para
  cosas que conciernen a un agente, nunca para cómo funciona el proyecto.
- Cada hecho tiene un único lugar, como exigen los [principios de desarrollo](development.md#development-principles);
  eso también se aplica a estas reglas.

## Usa primero las herramientas propias del proyecto [#use-the-projects-own-tools-first]

- Empieza con `mise run project:setup`; [herramientas para desarrolladores](tooling.md) explica qué instala.
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
  [paths.js](../packages/ui/src/paths.js) define ambas.
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
| AI (beta) | Todavía no | Candidata para `/docs/ask`; demostrarla primero en una rama |
| Hotkeys (alfa) | Todavía no | Candidata para un atajo de búsqueda cuando salga de alfa |
| Store (alfa), Charts | No se necesitan | Sin estado de cliente global de la app y todavía sin paneles de control |

Pasar una biblioteca de «Todavía no» a en uso sigue [elige las herramientas mediante un estudio](#choose-tools-by-survey-not-by-first-find).

## Idioma: Paraglide es responsable [#language-paraglide-owns-it]

Paraglide es responsable de todo el comportamiento de idioma: qué idioma recibe una petición, mediante sus estrategias
`url`, `cookie`, `preferredLanguage` y `baseLocale` (definidas en
[paraglide.mjs](../packages/ui/paraglide.mjs)), y los enlaces localizados, que TanStack Router
transporta. No escribimos capas neutrales de framework ni código de idioma propio; cuando a Paraglide
le falta algo, usa primero sus opciones y registra la carencia en el plan que lo posee.

## Planes: pocos, cortos y cerrados [#plans-few-short-closed]

El propietario, el 2026-09-26: «lo abrumador y frustrante que es tener tantos planes basura». El trabajo nuevo es
una línea en `.plans/now.md`, en el orden en que se cierra. Solo se escribe un archivo de plan para trabajo lo bastante grande
como para aparcarse o para durar semanas; las investigaciones, los análisis y las revisiones van en el plan al que sirven,
no en un archivo propio. Un plan se cierra el día en que su trabajo se publica: una línea de cierre y luego `.plans/done/`. Las
funcionalidades grandes esperan en `.plans/parked/`. Cerrar un plan no necesita un deploy ni una ejecución de pruebas propios: agrupa el
código en un solo deploy y una sola ejecución completa al final.

## Cuando el propietario delega decisiones [#when-the-owner-delegates-decisions]

Cuando el propietario delega decisiones, por ejemplo para terminar el trabajo sin supervisión:

- Decide, y registra cada decisión con sus motivos en el plan que la posee.
- Mantén todas las puertas de control en verde; la delegación nunca relaja una comprobación.
- Deja un informe completo: qué se decidió, qué se hizo, qué se comprobó y qué no.

## Puertas de control antes de que algo salga de la máquina [#gates-before-anything-leaves-the-machine]

- La puerta de control completa (`mise run project:verify`, todos los idiomas) es para los releases reales: `ui:release`
  la ejecuta, y un tag o un release de paquete nunca sale sin ella. El propietario, el 2026-09-25: «Solo
  hace falta para los releases reales, no podemos tardar una eternidad en desarrollo. Tenéis que empezar a usar
  mejor vuestro criterio sobre cuándo un deploy necesita una prueba de control».
- Niveles de prueba (el propietario, el 2026-09-25: «haced grandes cantidades de código sin pruebas y luego pasad por otro nivel
  si hay problemas»). Programa libremente con el nivel 0; sube solo cuando algo parezca ir mal o antes de que
  algo salga de la máquina:

  | Nivel | Comando | Qué | Tiempo |
  | --- | --- | --- | --- |
  | 0 | `mise run project:check` | comprobación de tipos y build | ~15 s |
  | 1 | `mise run project:test:smoke` | cada página responde en en y ar; la página de inicio y la documentación se hidratan; la búsqueda y ask responden | ~15 s |
  | 2 | `mise run project:test:only -- <words>` | solo las comprobaciones cuyo título coincide, en y ar | variable |
  | 3 | `mise run project:test:quick` | todas las comprobaciones, en y ar | ~45 s |
  | 4 | `mise run project:verify` | todo, todos los idiomas | releases |

- Los deploys no ejecutan pruebas a menos que `GATE` elija un nivel: `GATE=smoke` para la mayoría de los cambios de código, `GATE=quick`
  para cambios en el paquete compartido o transversales, `GATE=full` rara vez. El texto de documentación, los planes, las tareas y la configuración
  se despliegan directamente. Indica qué nivel se ejecutó al informar.
- Nunca encadenes un comando de puerta de control con `grep` o `tail` mediante una tubería: la tubería oculta su código de salida.
  Esto ya provocó una vez el release de una versión cuyas comprobaciones habían fallado.
- Informa de qué se probó y qué no; nunca llames verificado a un trabajo no probado.

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
- `GATE=<tier> mise run cf:deploy` ejecuta el nivel por sí mismo; nunca encadenes un deploy después de una puerta con `;`.

## Informar al propietario [#reporting-to-the-owner]

- Todo informe sobre algo que el propietario pueda revisar incluye sus URLs: los sitios en producción, la preview
  (`mise run cf:preview` la imprime) y un enlace directo a cada página o funcionalidad tratada.
- Indica qué se comprobó y qué no.

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
