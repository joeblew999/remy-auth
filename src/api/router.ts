import { implement } from '@orpc/server';
import { contract } from '@joeblew999/remy-auth-contract';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { reservationErrors, reservationSchema } from '@joeblew999/remy-ui/reservation';
import { service } from '../service';

/**
 * What every procedure knows about its call: the language to answer in, and this Worker's
 * release. Built per request by the API route (src/routes/api.$.ts) and, for calls inside the
 * server's own loaders, by the router client (src/api/client.ts). No Workers imports here, so the
 * coverage check can load this router in Node.
 */
export type ApiContext = { locale: Locale; release: string };

const api = implement(contract).$context<ApiContext>();

/** remy-auth's implementation of its contract (@joeblew999/remy-auth-contract); the type-check fails if a procedure is missing or answers the wrong shape. */
export const router = api.router({
  // The liveness answer of /healthz (withObservability), which is answered before Start runs.
  status: api.status.handler(({ context }) => ({ status: 'ok' as const, service, release: context.release })),
  reservations: {
    // Reserves seats in the demo (nothing is stored). oRPC has already refused anything that is not
    // a name and a number (400 BAD_REQUEST); here the shared rules are checked in the asked language,
    // and broken rules come back as the typed INVALID_RESERVATION error, which the form shows like its own.
    create: api.reservations.create.handler(({ input, context, errors }) => {
      const checked = reservationSchema(context.locale).safeParse(input);
      if (!checked.success) throw errors.INVALID_RESERVATION({ data: reservationErrors(checked.error) });
      return { message: m.reserved({ name: checked.data.name, count: checked.data.guests }, { locale: context.locale }) };
    }),
  },
});
