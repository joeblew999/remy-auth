import { z } from 'zod';
import type { Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';

// The demo reservation's rules, in one Zod schema that the browser (DemoPage's TanStack Form
// validator) and the server (the app's POST /api/reservations, through its contract) both check,
// with errors in the page's language. The wire shapes below are what a contract declares.

// Zod's documented switch for pages whose Content Security Policy forbids eval: without it, Zod
// probes for eval with `Function('')` on the first object parse, which the nonce CSP reports as a
// violation (and would block once enforced, with the same jitless result).
z.config({ jitless: true });

/**
 * A reservation's rules with messages in `locale`: a name that is not blank once trimmed, and a
 * whole number of seats from 1 to 20. Accepts the form's text for the seats and outputs a number.
 */
export function reservationSchema(locale: Locale) {
  const o = { locale };
  const guests = m.guests_invalid({}, o);
  return z.object({
    name: z.string().trim().min(1, m.name_required({}, o)),
    guests: z.coerce.number<string | number>({ error: guests }).int(guests).min(1, guests).max(20, guests),
  });
}

/** What the server receives: a name and a number of seats, still unchecked against the rules. Anything else is a bad request. */
export const reservationInput = z.object({ name: z.string(), guests: z.number() });

/** The first broken rule per field, in the page's language: a rejected reservation's field errors. */
export const reservationFieldErrors = z.object({ name: z.string().optional(), guests: z.string().optional() });

/** A reservation the server accepted: its confirmation, in the page's language. */
export const reservationConfirmation = z.object({ message: z.string() });

/** A reservation as the form edits it: the seats as typed (text) or as a number. */
export type ReservationDraft = z.input<ReturnType<typeof reservationSchema>>;
/** A reservation the rules accepted. */
export type Reservation = z.output<ReturnType<typeof reservationSchema>>;
/** The answer to a reservation: field errors to show like the form's own, or the confirmation to show instead of the default one. */
export type ReservationResult = { errors?: z.infer<typeof reservationFieldErrors>; message?: string };

/** The first message for each field that broke the rules, as a ReservationResult's `errors`. */
export function reservationErrors(error: z.ZodError<ReservationDraft>): NonNullable<ReservationResult['errors']> {
  const { fieldErrors } = z.flattenError(error);
  return {
    ...(fieldErrors.name?.[0] ? { name: fieldErrors.name[0] } : {}),
    ...(fieldErrors.guests?.[0] ? { guests: fieldErrors.guests[0] } : {}),
  };
}
