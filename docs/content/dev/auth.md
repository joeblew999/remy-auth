---
title: "Sign-in and permissions"
description: "How a Remy app gets sign-in, roles and relationship-based permissions from remy-auth and its package: the guard, the relation engine, the Allowed component, environments, mail, and the checks each brings."
---

remy-auth exists so that Better Auth works well with TanStack and oRPC for every Remy app: an app
imports the package and gets the back-end and front-end pieces, type-checked all the way through.
remy-auth is its own Worker, and it uses every piece itself, in its own demo, so each one is shown
working before any app takes it. This page says what the pieces are, how an app uses them, and where
remy-auth uses them. The reasons and the open work are in
[the auth plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/auth-service.md).

## The pieces, and where remy-auth uses each

| Piece | From | remy-auth's own use |
| --- | --- | --- |
| Who may call an endpoint: the guard | `@joeblew999/remy-ui/api/guard`, `api/policy` | `src/api/router.ts`, `packages/contract/src/index.ts` |
| Who may do what to which thing: the relation engine | `api/relations` | The notes demo: `packages/contract/src/notes.ts` (vocabulary), `src/notes/store.ts` |
| A page that shows only what the server allows | `allowed` | `src/notes/page.tsx` |
| What each environment permits | `environment` | `src/auth/environment.ts` |
| Mail, sent or captured | `mail` | `src/auth/mail.server.ts`, `src/auth/code-mail.ts` |
| Sign-in itself (Better Auth) | remy-auth's Worker only | `src/auth/`, the account page |

An app never has its own users, sessions, login screen or permission engine. It has its own data, its
own vocabulary of relations, and the guard in front of every operation.

## Who may call an endpoint: the guard

An app's API is contract-first oRPC ([the UI package](./ui-package.md)). Every procedure declares who
may call it, on the contract, and one root middleware enforces it. A procedure that declares nothing
never runs, and the shared checks fail the build on it.

```ts
// The contract: who may call each procedure.
import { actions, personal, policy } from '@joeblew999/remy-ui/api/policy';
const may = actions(vocabulary);                       // only the vocabulary's own actions type-check
oc.meta(policy('public'))                              // anyone; the answer may name no person
oc.meta(policy('session')).meta(personal('the caller\'s own account'))   // any signed-in person, their own data
oc.meta(may('EDIT_NOTE'))                              // whoever holds a relation the action is granted to

// The router: the guard at the root, so it wraps validation and refuses a stranger first.
import { guard, signedIn, type GuardContext } from '@joeblew999/remy-ui/api/guard';
const api = implement(contract).$context<Context & GuardContext<User>>().use(guard<User>());
```

Each call's context gives the guard `getSession` (the caller's session or null, looked up only when
a policy needs it, as oRPC's Better Auth guide shares one) and, when policies name actions,
`relations` (the app's relation engine). An app that signs nobody in passes `noSession`. For an
action the guard answers 401 without a session, 404 for a thing that does not exist before anybody is
told 403, then asks the engine.

## Who may do what: relations

Permissions are relations, not roles: you may edit this note because you wrote it, not because you
are an editor somewhere. An app writes its vocabulary as data and the engine answers from the app's
own tables, in its own D1. Nothing is copied anywhere, so nothing drifts.

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
await relations.canFor('NOTE', user, ids);   // for a whole list: each row's actions, allowed or not
```

A relation is derived from a table row (optionally filtered, reached through another entity, or held
between dates), inherited from a parent, held by platform role, or held by everyone. The row shapes
are remy-sport's, whose vocabulary runs through this engine unchanged. A list sends each row with its
permissions (`can`), costing one query per relation, not per row.

## On the page: `<Allowed>`

A page decides nothing. It shows a control only inside `<Allowed>`, from the `can` map the server
sent with the row; it never looks at who the viewer is or what role they hold. In remy-sport the
rules existed and the screens did not use them; this is what prevents that.

```tsx
import { Allowed } from '@joeblew999/remy-ui/allowed';
<Allowed can={note.can} action="EDIT_NOTE"><Button>Edit</Button></Allowed>
```

Only an action the row carries type-checks. Every page with actions owes one check: what it offers
(`offeredActions`) is exactly what the server allows, and using it is never refused.

## Signing in

Sign-in is Better Auth in remy-auth's Worker, on its own D1: a one-time code by email, no passwords,
with platform roles (`admin`, `user`) from Better Auth's admin plugin. The browser calls Better Auth's
handler (`/api/auth/*`) through its client, as its TanStack guide says; `tanstackStartCookies()`
forwards cookies from server-side calls. A request with no session cookie is nobody without asking
Better Auth or the database. How another Worker learns who is signed in at remy-auth is not built yet.

## Environments: one table

What an environment may do that production may not is one table, and anything undeclared or unknown
is production (`environments()` from `@joeblew999/remy-ui/environment`; remy-sport's design).
remy-auth's table, `src/auth/environment.ts`:

| Capability | `local` | `production` |
| --- | --- | --- |
| `capturesMail`: mail is kept in the Worker's outbox, read at `/dev/mail`, instead of sent | yes | no: sent through Cloudflare Email Service |
| `seededSignIn`: the seeded people exist, and the sign-in form offers them (`/dev/people`) | yes | no |
| `signInCode`: a seeded person signs in with the published code `424242`; nobody else can | derived | none: every code is random |
| `offersAdminSignIn`: the seeded administrator is offered too | yes | no |

So locally a fresh checkout has people with roles and their own relations, one press away, and no
mail is sent. The seed is `src/auth/seed.ts` (stable IDs, `.test` addresses) and, for the notes demo,
`src/notes/seed.ts`, which names those IDs: that is all an app's seed ever knows about a person.
Nothing here creates a session outside Better Auth, and none of it exists on a deployment.

## Mail

`mailerFor({ capture, binding, from })` from `@joeblew999/remy-ui/mail` sends through the Worker's
`send_email` binding (Cloudflare Email Service), from an address on a domain the account has enabled
for Email Sending, or keeps the message in the outbox where the environment captures mail. A mail
always has a plain-text part; a refused send says who it was for and why. The sign-in code's email
is written in the reader's language, with the code and no link.

## What each piece is checked by

| Check | Where |
| --- | --- |
| Every procedure declares a policy, has the guard in front, names no person when public, and names only actions the vocabulary defines | `apiChecks({ router, vocabulary, ... })` |
| Every procedure that needs a session refuses a stranger | `apiChecks` |
| The vocabulary holds together, and names only tables and columns the migrations make | `vocabularyProblems`, `schemaProblems` |
| Each person may do exactly what their relation allows, and the page offers exactly that | the app's own check, with `offeredActions` (remy-auth: `tests/notes.spec.ts`) |
| Action names are types from the contract to the page | a types-only file with expected errors (remy-auth: `tests/relations/types.tsx`) |
| The guard on oRPC 1 and 2, the engine on a real D1 | remy-auth's `tests/guard.spec.ts`, `tests/relations.spec.ts` |

## Adding to it

A new piece of sign-in or permissions lands in four places at once, or it is not done: the package
(so every app gets it), remy-auth's own demo (so it is seen working), a check that fails when it is
skipped, and this page. That is what keeps the docs, the demo and the code one thing, for the agents
and developers of every Remy repo, who read these pages through the `remy` skill.
