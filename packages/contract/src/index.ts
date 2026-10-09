import { oc } from '@orpc/contract';
import { openapi } from '@orpc/openapi';
import { z } from 'zod';
import { reservationConfirmation, reservationFieldErrors, reservationInput } from '@joeblew999/remy-showcase/reservation';
import { personal, policy } from '@joeblew999/remy-ui/api/policy';
import pkg from '../package.json' with { type: 'json' };

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
