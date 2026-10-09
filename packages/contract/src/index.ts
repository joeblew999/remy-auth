import { oc } from '@orpc/contract';
import { openapi } from '@orpc/openapi';
import { z } from 'zod';
import { reservationConfirmation, reservationFieldErrors, reservationInput } from '@joeblew999/remy-showcase/reservation';
import { actions, personal, policy } from '@joeblew999/remy-ui/api/policy';
import pkg from '../package.json' with { type: 'json' };
import { note, noteDraft, noteEdit, noteId, noteList, noteShare, notesVocabulary } from './notes';

export * from './notes';

// remy-auth's API, contract first (.plans/openapi-contracts.md): every endpoint the Worker serves
// under /api is declared here with its method, path, input, output and errors as Zod 4 schemas, and
// with who may call it (`policy`, which the server's guard enforces). The server implements this
// object (src/api/router.ts), the OpenAPI document at /api/openapi.json is generated from it, and
// clients call it through a typed, validating link. Only schemas and routes live here, so a
// consumer needs no server code.

/** The generated document's `info`: the API's version is this package's version. */
export const info = {
  title: 'remy-auth API',
  version: pkg.version,
  description: 'Contract: @joeblew999/remy-auth-contract. Answers in the language of Accept-Language.',
};

/**
 * The HTTP status of each error code that is this API's own. oRPC keeps statuses out of the errors
 * themselves: the server's handler and the generated document take them from here, and oRPC's
 * common codes (UNAUTHORIZED 401, BAD_REQUEST 400, NOT_FOUND 404, ...) need no entry.
 */
export const errorStatuses = { INVALID_RESERVATION: 400 } as const;

/** The Worker's liveness, as /healthz answers it: answering at all is what "ok" means. */
export const status = z.object({
  status: z.literal('ok'),
  service: z.string().describe('The Worker that answered'),
  release: z.string().describe("The deployed version's ID, or \"local\""),
});

/** The signed-in person's own account, as Better Auth's session holds it. */
export const account = z.object({
  id: z.string().describe("The account's ID"),
  name: z.string().describe('The display name; empty until the person gives one'),
  email: z.string().describe('The address the person signs in with'),
  emailVerified: z.boolean().describe('Whether a sign-in code has proved the address'),
});

// The notes demo's policies: only an action its vocabulary defines type-checks here.
const may = actions(notesVocabulary);
const refusals = {
  UNAUTHORIZED: { message: 'Nobody is signed in.' },
  FORBIDDEN: { message: 'The signed-in person holds no relation to this note that allows it.' },
  NOT_FOUND: { message: 'There is no such note.' },
};

export const contract = {
  status: oc
    .meta(policy('public'))
    .meta(openapi({ method: 'GET', path: '/api/status', summary: 'Liveness of the Worker', tags: ['status'] }))
    .output(status),
  me: oc
    .meta(policy('session'))
    .meta(personal("the caller's own account, read from their own session and sent to nobody else"))
    .meta(openapi({ method: 'GET', path: '/api/me', summary: 'The signed-in account', tags: ['account'], description: 'Needs a session (the cookie Better Auth sets at sign-in). Answers 401 without one.' }))
    .errors({ UNAUTHORIZED: { message: 'Nobody is signed in.' } })
    .output(account),
  notes: {
    list: oc
      .meta(policy('session'))
      .meta(openapi({ method: 'GET', path: '/api/notes', tags: ['notes'], summary: 'The signed-in person\'s notes', description: 'The notes they wrote and the notes shared with them, each with what they may do to it.' }))
      .errors({ UNAUTHORIZED: refusals.UNAUTHORIZED })
      .output(noteList),
    create: oc
      .meta(may('CREATE_NOTE'))
      .meta(openapi({ method: 'POST', path: '/api/notes', tags: ['notes'], summary: 'Write a note' }))
      .errors({ UNAUTHORIZED: refusals.UNAUTHORIZED })
      .input(noteDraft)
      .output(note),
    update: oc
      .meta(may('EDIT_NOTE'))
      .meta(openapi({ method: 'POST', path: '/api/notes/{id}', tags: ['notes'], summary: 'Change a note', description: 'Its author and the people it is shared with as editors may.' }))
      .errors(refusals)
      .input(noteEdit)
      .output(note),
    share: oc
      .meta(may('SHARE_NOTE'))
      .meta(openapi({ method: 'POST', path: '/api/notes/{id}/share', tags: ['notes'], summary: 'Share a note with an address', description: 'Only its author may. The person sees the note once they sign in with that address; the answer is the same whether or not the address has an account.' }))
      .errors(refusals)
      .input(noteShare)
      .output(note),
    remove: oc
      .meta(may('DELETE_NOTE'))
      .meta(openapi({ method: 'POST', path: '/api/notes/{id}/delete', tags: ['notes'], summary: 'Delete a note', description: 'Only its author may.' }))
      .errors(refusals)
      .input(noteId)
      .output(noteId),
  },
  reservations: {
    create: oc
      .meta(policy('public'))
      .meta(openapi({
        method: 'POST', path: '/api/reservations', tags: ['demo'],
        summary: 'Reserve seats in the demo (nothing is stored)',
        description: 'Answers in the language of Accept-Language (the page\'s language when the app calls it). A name must not be blank once trimmed and the seats are a whole number from 1 to 20.',
      }))
      .errors({
        INVALID_RESERVATION: {
          message: 'The reservation breaks a rule; data holds the first broken rule per field, in the language asked for.',
          data: reservationFieldErrors,
        },
      })
      .input(reservationInput)
      .output(reservationConfirmation),
  },
};

export type Contract = typeof contract;
