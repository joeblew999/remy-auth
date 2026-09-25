# Arquitectura y principios de desarrollo [#architecture-and-development-principles]

Este documento es el dueño de lo que el código debe ser. Cómo trabajan las personas y los agentes día a día vive en
[cómo trabajamos](how-we-work.md). Lo que posee el servicio de autenticación, y su dirección de almacenamiento, viven en
[el plan del servicio de autenticación](../.plans/auth-service.md).

## Principios de desarrollo [#development-principles]

- Prefiere herramientas upstream mantenidas, integraciones oficiales y librerías existentes.
  Comprueba qué existe ya antes de escribir código a medida. Mantén los wrappers delgados; añade
  comportamiento personalizado solo para un requisito concreto no cubierto, y documenta la brecha.
- Mantén el comportamiento local a su dueño y visible en el punto de entrada.
- Usa mise para fijar herramientas y ejecutar los comandos del proyecto. No importes la
  librería de tareas retirada `joeblew999/.github` ni controles otros repos mediante scripts compartidos.
  Nombra cada tarea como `namespace:action`; mantén los alias también con espacio de nombres.
- El desarrollo usa almacenamiento local. El arranque no debe aprovisionar identidades de producción,
  importar datos de ejemplo ni cambiar silenciosamente los registros de apps.
- Mantén una única implementación de Worker y una única configuración fuente de Wrangler para la ejecución
  local y desplegada. Prueba el artefacto de producción en local y reutiliza la misma
  suite de aceptación contra URLs desplegadas. Las diferencias de entorno pertenecen a los
  bindings y secrets, no a código duplicado. Consulta [el flujo de trabajo en tiempo de ejecución](gui.md).
- Las apps se integran mediante un protocolo/contrato versionado, nunca con acceso directo a la
  base de datos de este servicio. Los datos de la app y el aprovisionamiento de autenticación son operaciones separadas.
- Los fallos permanecen visibles. Nunca concedas acceso porque la autenticación no esté disponible.
- Mantén las credenciales fuera del código, los planes, los logs y los commits.
- Dale a cada hecho un único hogar. Enlaza al documento, configuración o fuente generada
  que lo posee en lugar de repetirlo; cambia el dueño, y luego actualiza los enlaces.
- Las pruebas y las auditorías son gates de aceptación. Nunca omitas, exceptúes, relajes o elimines una comprobación,
  incluidas las auditorías individuales de Lighthouse, para hacer que una ejecución pase. Corrige la causa, o detente
  y pregunta al dueño.
- Cambia el código generado en su fuente: los componentes de shadcn y los tokens de tema mediante
  shadcn, las traducciones en `packages/ui/messages/`, y la salida de Wrangler/TanStack Router
  (incluido `src/routeTree.gen.ts`) regenerándola. No edites a mano ni sobrescribas la salida generada en otro lugar.
- Las decisiones que los planes dejan abiertas, o las correcciones que entran en conflicto con un plan, pertenecen al
  dueño. Pregunta; no elijas, a menos que el dueño las haya delegado
  ([cómo trabajamos](how-we-work.md#when-the-owner-delegates-decisions)). Desplegar, aprovisionar y abrir issues upstream
  también esperan la solicitud explícita del dueño.
- No mockees Better Auth, D1 ni el runtime de Workers. Las conveniencias de desarrollo (una ruta de seed,
  un selector de inicio de sesión para personas creadas mediante seed, un código de inicio de sesión fijo) solo se permiten detrás de una
  única tabla de políticas por entorno cuyo valor por defecto, y cuyo valor para cualquier entorno desconocido, es
  producción con todo desactivado; nunca crean sesiones fuera de Better Auth, nunca existen
  en producción, requieren autenticación fuera del desarrollo local, y están listadas en el
  plan que las posee. Ninguna otra ruta, flag o bypass solo para pruebas.

## Planes y roles [#plans-and-roles]

Los planes viven en `.plans/`; [.plans/now.md](../.plans/now.md) es la única lista de lo que está abierto y
en qué punto está. Lee el plan que cubre tu tarea antes de cambiar nada. Todo plan funciona con dos roles: el Reviewer
define la aceptación, y el Executor implementa y verifica un hito acotado, y luego informa de
las comprobaciones exactas ejecutadas, los archivos cambiados y las limitaciones. Un plan se mueve a `.plans/done/` solo después de
la implementación, sus comprobaciones requeridas y la aceptación del Reviewer.
