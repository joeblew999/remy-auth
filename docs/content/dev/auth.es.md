---
title: "Inicio de sesión y permisos"
description: "Cómo una app de Remy obtiene el inicio de sesión, los roles y los permisos basados en relaciones de remy-auth y su paquete: el guard, el motor de relaciones, el componente Allowed, los entornos, el correo y las comprobaciones que aporta cada uno."
---

remy-auth existe para que Better Auth funcione bien con TanStack y oRPC en cada app de Remy: una app
importa el paquete y obtiene las piezas de back-end y front-end, verificadas por tipos de principio a
fin. remy-auth es su propio Worker, y usa cada pieza él mismo, en su propia demo, de modo que cada
una se muestra funcionando antes de que cualquier app la adopte. Esta página dice cuáles son las
piezas, cómo las usa una app y dónde las usa remy-auth. Las razones y el trabajo pendiente están en
[el plan de autenticación](https://github.com/joeblew999/remy-auth/blob/main/.plans/auth-service.md).

## Las piezas, y dónde las usa remy-auth [#the-pieces-and-where-remy-auth-uses-each]

| Pieza | De | Uso propio de remy-auth |
| --- | --- | --- |
| Quién puede llamar a un endpoint: el guard | `@joeblew999/remy-ui/api/guard`, `api/policy` | `src/api/router.ts`, `packages/contract/src/index.ts` |
| Quién puede hacer qué a qué cosa: el motor de relaciones | `api/relations` | La demo de notas: `packages/contract/src/notes.ts` (vocabulario), `src/notes/store.ts` |
| Una página que muestra solo lo que el servidor permite | `allowed` | `src/notes/page.tsx` |
| Qué permite cada entorno | `environment` | `src/auth/environment.ts` |
| Correo, enviado o capturado | `mail` | `src/auth/mail.server.ts`, `src/auth/code-mail.ts` |
| El propio inicio de sesión (Better Auth) | solo el Worker de remy-auth | `src/auth/`, la página de cuenta |

Una app nunca tiene sus propios usuarios, sesiones, pantalla de inicio de sesión ni motor de
permisos. Tiene sus propios datos, su propio vocabulario de relaciones y el guard delante de cada
operación.

## Quién puede llamar a un endpoint: el guard [#who-may-call-an-endpoint-the-guard]

La API de una app es oRPC contract-first ([el paquete de UI](./ui-package.md)). Cada procedimiento
declara quién puede llamarlo, en el contrato, y un único middleware raíz lo hace cumplir. Un
procedimiento que no declara nada nunca se ejecuta, y las comprobaciones compartidas hacen fallar la
build por ello.

```ts
// El contrato: quién puede llamar a cada procedimiento.
import { actions, personal, policy } from '@joeblew999/remy-ui/api/policy';
const may = actions(vocabulary);                       // solo las acciones propias del vocabulario pasan la verificación de tipos
oc.meta(policy('public'))                              // cualquiera; la respuesta puede no nombrar a ninguna persona
oc.meta(policy('session')).meta(personal('the caller\'s own account'))   // cualquier persona que haya iniciado sesión, sus propios datos
oc.meta(may('EDIT_NOTE'))                              // quien tenga una relación a la que la acción está concedida

// El router: el guard en la raíz, de modo que envuelve la validación y rechaza primero a un desconocido.
import { guard, signedIn, type GuardContext } from '@joeblew999/remy-ui/api/guard';
const api = implement(contract).$context<Context & GuardContext<User>>().use(guard<User>());
```

El contexto de cada llamada le da al guard `getSession` (la sesión del llamador o null, consultada
solo cuando una política la necesita, tal como comparte la guía de Better Auth de oRPC) y, cuando las
políticas nombran acciones, `relations` (el motor de relaciones de la app). Una app que no hace
iniciar sesión a nadie pasa `noSession`. Para una acción, el guard responde 401 sin sesión, 404 para
algo que no existe antes de decirle a nadie 403, y luego consulta al motor.

## Quién puede hacer qué: relaciones [#who-may-do-what-relations]

Los permisos son relaciones, no roles: puedes editar esta nota porque la escribiste tú, no porque
seas editor en algún lugar. Una app escribe su vocabulario como datos, y el motor responde a partir
de las propias tablas de la app, en su propio D1. Nada se copia a ningún sitio, así que nada se
desincroniza.

```ts
import { defineVocabulary, relationEngine } from '@joeblew999/remy-ui/api/relations';
export const vocabulary = defineVocabulary({
  objectTypes: [{ code: 'NOTE', tableName: 'note' }, { code: 'PLATFORM' }],
  relations: [
    { code: 'NOTE_AUTHOR', objectTypeCode: 'NOTE', via: 'table', sourceTable: 'note', objectColumn: 'id', userColumn: 'author_id' },
    { code: 'PLATFORM_ADMIN', objectTypeCode: 'PLATFORM', via: 'role', roleCode: 'ADMIN' },
  ],
  actions: [{ code: 'EDIT_NOTE', objectTypeCode: 'NOTE' }],
  grants: { EDIT_NOTE: [{ relation: 'NOTE_AUTHOR' }] },
});
const relations = relationEngine(vocabulary, env.MY_DB);
await relations.canFor('NOTE', user, ids);   // para una lista completa: las acciones de cada fila, permitidas o no
```

Una relación se deriva de una fila de tabla (opcionalmente filtrada, alcanzada a través de otra
entidad, o sostenida entre fechas), se hereda de un padre, la sostiene un rol de plataforma, o la
sostiene todo el mundo. Las formas de fila son las de remy-sport, cuyo vocabulario pasa por este
motor sin cambios. Una lista envía cada fila con sus permisos (`can`), con un costo de una consulta
por relación, no por fila.

## En la página: `<Allowed>` [#on-the-page-allowed]

Una página no decide nada. Muestra un control solo dentro de `<Allowed>`, a partir del mapa `can` que
el servidor envió con la fila; nunca mira quién es el espectador ni qué rol tiene. En remy-sport las
reglas existían y las pantallas no las usaban; esto es lo que lo impide.

```tsx
import { Allowed } from '@joeblew999/remy-ui/allowed';
<Allowed can={note.can} action="EDIT_NOTE"><Button>Edit</Button></Allowed>
```

Solo una acción que la fila lleva pasa la verificación de tipos. Toda página con acciones debe una
comprobación: lo que ofrece (`offeredActions`) es exactamente lo que el servidor permite, y usarlo
nunca se rechaza.

## Inicio de sesión [#signing-in]

El inicio de sesión es Better Auth en el Worker de remy-auth, sobre su propio D1: un código de un
solo uso por correo, sin contraseñas, con roles de plataforma (`admin`, `user`) del plugin de
administración de Better Auth. El navegador llama al handler de Better Auth (`/api/auth/*`) a través
de su cliente, tal como dice su guía de TanStack; `tanstackStartCookies()` reenvía las cookies de las
llamadas del lado del servidor. Una solicitud sin cookie de sesión es nadie sin preguntarle a Better
Auth o a la base de datos. Cómo otro Worker se entera de quién ha iniciado sesión en remy-auth
todavía no está construido.

## Dos formas de iniciar sesión [#two-ways-to-sign-in]

La forma normal está en todas partes: una dirección, y después el código de seis cifras que se envía
por correo a esa dirección. La forma automática está junto a ella donde el entorno lo permite: las
personas sembradas, listadas en el formulario de inicio de sesión con lo que cada una tiene, a un
clic cada una, sin bandeja de entrada. Local y staging tienen ambas; producción solo tiene la forma
normal. Las dos son el propio inicio de sesión de Better Auth: se pide un código y se canjea, y solo
Better Auth crea una sesión.

## Entornos: una sola tabla [#environments-one-table]

Lo que un entorno puede hacer que producción no puede es una sola tabla, y cualquier cosa no
declarada o desconocida es producción (`environments()` de `@joeblew999/remy-ui/environment`; diseño
de remy-sport). La tabla de remy-auth, `src/auth/environment.ts`:

| Capacidad | `local` | `staging` | `production` |
| --- | --- | --- | --- |
| `capturesMail`: el correo se guarda en la bandeja de salida del Worker, se lee en `/dev/mail`, en lugar de enviarse | sí | no: se envía, que es lo que una ejecución local no puede mostrar | no: se envía |
| `seededSignIn`: las personas sembradas existen, y el formulario de inicio de sesión las ofrece (`/dev/people`) | sí | sí | no |
| `signInCode`: una persona sembrada inicia sesión con el código publicado `424242`; nadie más puede | derivado | derivado | ninguno: cada código es aleatorio |
| `offersAdminSignIn`: también se ofrece el administrador sembrado | sí | no: un despliegue nunca publica una vía de entrada como uno | no |

Así, un checkout recién hecho tiene personas con roles y sus propias relaciones, a un clic de
distancia, y no envía correo; staging tiene las mismas personas en un despliegue real, y envía por
correo su código a una dirección real. La semilla es `src/auth/seed.ts` (IDs estables, direcciones
`.test`) y, para la demo de notas, `src/notes/seed.ts`, que nombra esos IDs: eso es todo lo que la
semilla de una app sabe jamás sobre una persona. Nada de esto crea una sesión fuera de Better Auth.

Staging es su propio Worker, con sus propias bases de datos y secreto (`env.staging` en
`wrangler.jsonc`, desplegado con `mise run cf:staging`), de modo que nada de lo que se hace allí toca
los datos de producción. Contiene fixtures y lo que escriben los visitantes. Nunca copies los datos
de producción en él: quien lo encuentre puede iniciar sesión como una persona sembrada.

Un Worker dice en `/healthz` cuál es su entorno, de modo que nada lo adivina a partir de un hostname:
las comprobaciones se lo preguntan y esperan exactamente lo que la tabla da para ese entorno
(`permitted`, `tests/people.ts`).

## Correo [#mail]

`mailerFor({ capture, binding, from })` de `@joeblew999/remy-ui/mail` envía a través del binding
`send_email` del Worker (Cloudflare Email Service), desde una dirección en un dominio que la cuenta
tiene habilitado para Email Sending, o guarda el mensaje en la bandeja de salida donde el entorno
captura el correo. Un correo siempre tiene una parte en texto plano; un envío rechazado dice para
quién era y por qué. Un mensaje a una dirección a la que ningún correo puede llegar (`unreachable`:
`.test`, `.example`, `example.com` y similares, que es lo que es la dirección de una persona
sembrada) nunca se envía: solo podría rebotar. El correo del código de inicio de sesión se escribe en
el idioma del lector y en [el nombre del producto](./gui.md#the-products-name), con el código y sin
enlace.

## Qué comprueba cada pieza [#what-each-piece-is-checked-by]

| Comprobación | Dónde |
| --- | --- |
| Cada procedimiento declara una política, tiene el guard delante, no nombra a ninguna persona cuando es público, y nombra solo acciones que el vocabulario define | `apiChecks({ router, vocabulary, ... })` |
| Cada procedimiento que necesita una sesión rechaza a un desconocido | `apiChecks` |
| El vocabulario se sostiene, y nombra solo tablas y columnas que crean las migraciones | `vocabularyProblems`, `schemaProblems` |
| Cada persona puede hacer exactamente lo que su relación permite, y la página ofrece exactamente eso | la comprobación propia de la app, con `offeredActions` (remy-auth: `tests/notes.spec.ts`) |
| Los nombres de las acciones son tipos desde el contrato hasta la página | un archivo solo de tipos con errores esperados (remy-auth: `tests/relations/types.tsx`) |
| El guard en oRPC 1 y 2, el motor en un D1 real | `tests/guard.spec.ts`, `tests/relations.spec.ts` de remy-auth |

## Añadir a esto [#adding-to-it]

Una pieza nueva de inicio de sesión o permisos llega a cuatro lugares a la vez, o no está hecha: el
paquete (para que cada app la obtenga), la propia demo de remy-auth (para que se vea funcionando), una
comprobación que falla cuando se omite, y esta página. Eso es lo que mantiene la documentación, la
demo y el código como una sola cosa, para los agentes y desarrolladores de cada repositorio de Remy,
que leen estas páginas a través de la skill `remy`.
