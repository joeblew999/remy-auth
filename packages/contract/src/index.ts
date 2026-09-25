import { oc } from '@orpc/contract';
import { z } from 'zod';
import { reservationConfirmation, reservationFieldErrors, reservationInput } from '@joeblew999/remy-ui/reservation';
import type { ApiMeta } from '@joeblew999/remy-ui/api/coverage';
import pkg from '../package.json' with { type: 'json' };

// remy-auth's API, contract first (.plans/openapi-contracts.md): every endpoint the Worker serves
// under /api is declared here with its method, path, input, output and errors as Zod 4 schemas.
// The server implements this object (src/api/router.ts), the OpenAPI document at
// /api/openapi.json is generated from it, and clients call it through a typed, validating link.
// Only schemas and routes live here, so a consumer needs no server code.

const route = oc.$meta<ApiMeta>({});

/** The generated document's `info`: the API's version is this package's version. */
export const info = {
  title: 'remy-auth API',
  version: pkg.version,
  description: 'Contract: @joeblew999/remy-auth-contract. Answers in the language of Accept-Language.',
};

/** The Worker's liveness, as /healthz answers it: answering at all is what "ok" means. */
export const status = z.object({
  status: z.literal('ok'),
  service: z.string().describe('The Worker that answered'),
  release: z.string().describe("The deployed version's ID, or \"local\""),
});

export const contract = {
  status: route
    .meta({ policy: 'public' })
    .route({ method: 'GET', path: '/api/status', summary: 'Liveness of the Worker', tags: ['status'] })
    .output(status),
  reservations: {
    create: route
      .meta({ policy: 'public' })
      .errors({
        INVALID_RESERVATION: {
          status: 400,
          message: 'The reservation breaks a rule; data holds the first broken rule per field, in the language asked for.',
          data: reservationFieldErrors,
        },
      })
      .route({
        method: 'POST', path: '/api/reservations', tags: ['demo'],
        summary: 'Reserve seats in the demo (nothing is stored)',
        description: 'Answers in the language of Accept-Language (the page\'s language when the app calls it). A name must not be blank once trimmed and the seats are a whole number from 1 to 20.',
      })
      .input(reservationInput)
      .output(reservationConfirmation),
  },
};

export type Contract = typeof contract;
