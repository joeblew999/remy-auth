import { implement } from '@orpc/server';
import { contract } from '@joeblew999/remy-auth-contract';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { reservationErrors, reservationSchema } from '@joeblew999/remy-showcase/reservation';
import { guard, signedIn, type GuardContext } from '@joeblew999/remy-ui/api/guard';
import type { Session } from '../auth/auth.server';
import type { NotesStore } from '../notes/store';
import { service } from '../service';

/**
 * What every procedure knows about its call: the language to answer in, this Worker's release, and
 * how to ask who is calling (`getSession`: Better Auth's session, looked up only when the guard needs
 * it) and whether they may (`relations`: the notes demo's relation engine, over the same database as
 * `notes`). Built per request by the API route (src/routes/api.$.ts) and, for calls inside the server's own
 * loaders, by the router client (src/api/client.ts). No Workers imports here, so the checks can load
 * this router in Node.
 */
export type ApiContext = { locale: Locale; release: string; notes: NotesStore } & GuardContext<Session['user']>;

// The guard is the root middleware: every procedure below runs behind its contract's policy.
const api = implement(contract).$context<ApiContext>().use(guard<Session['user']>());

/** remy-auth's implementation of its contract (@joeblew999/remy-auth-contract); the type-check fails if a procedure is missing or answers the wrong shape. */
export const router = api.router({
  // The liveness answer of /healthz (withObservability), which is answered before Start runs.
  status: api.status.handler(({ context }) => ({ status: 'ok' as const, service, release: context.release })),
  // The caller's own account, from their own session; the output schema lets nothing else out.
  me: api.me.handler(({ context }) => {
    const { id, name, email, emailVerified } = signedIn(context);
    return { id, name, email, emailVerified };
  }),
  // The notes demo. Every handler here runs only after the guard asked the relation engine: the
  // contract's policy names the action, the vocabulary says which relations satisfy it. So a handler
  // does the work and decides nothing.
  notes: {
    list: api.notes.list.handler(({ context }) => context.notes.list(signedIn(context))),
    create: api.notes.create.handler(({ input, context }) => context.notes.create(signedIn(context), input)),
    update: api.notes.update.handler(({ input, context }) => context.notes.update(signedIn(context), input)),
    share: api.notes.share.handler(({ input, context }) => context.notes.share(signedIn(context), input)),
    remove: api.notes.remove.handler(async ({ input, context }) => {
      await context.notes.remove(input.id);
      return { id: input.id };
    }),
  },
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
