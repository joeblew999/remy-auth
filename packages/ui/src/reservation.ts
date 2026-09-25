import { z } from 'zod';
import type { Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';

// The demo reservation's rules, in one Zod schema that the browser (DemoPage's TanStack Form
// validator) and the server (the app's server function) both check, with errors in the page's language.

/**
 * Every decimal digit the runtime can write (Intl's numbering systems: Persian ۰–۹, Arabic-Indic
 * ٠–٩, Devanagari, Thai, …) mapped to its ASCII digit, built once from Intl itself.
 */
let nativeDigits: Map<string, string> | undefined;
function digitMap() {
  if (nativeDigits) return nativeDigits;
  nativeDigits = new Map();
  for (const system of Intl.supportedValuesOf('numberingSystem')) {
    const format = new Intl.NumberFormat('en', { numberingSystem: system, useGrouping: false });
    const digits = Array.from({ length: 10 }, (_, digit) => format.format(digit));
    // Decimal systems only: one character per digit (algorithmic systems such as Roman numerals are left out).
    if (digits.every(digit => [...digit].length === 1)) digits.forEach((digit, value) => nativeDigits!.set(digit, String(value)));
  }
  return nativeDigits;
}

/** `text` with every native digit replaced by its ASCII digit, so "۱۲" and "١٢" read as "12". */
export function asciiDigits(text: string): string {
  const map = digitMap();
  return [...text].map(character => map.get(character) ?? character).join('');
}

/**
 * A reservation's rules with messages in `locale`: a name that is not blank once trimmed, and a
 * whole number of seats from 1 to 20. Accepts the form's text for the seats, typed in any script's
 * digits, and outputs a number.
 */
export function reservationSchema(locale: Locale) {
  const o = { locale };
  const guests = m.guests_invalid({}, o);
  return z.object({
    name: z.string().trim().min(1, m.name_required({}, o)),
    guests: z.union([z.number(), z.string().transform(asciiDigits)]).pipe(
      z.coerce.number<string | number>({ error: guests }).int(guests).min(1, guests).max(20, guests)),
  });
}

/** What a server function receives: a name and a number of seats, still unchecked against the rules. Anything else is a bad request. */
export const reservationInput = z.object({ name: z.string(), guests: z.number() });

/** A reservation as the form edits it: the seats as typed (text) or as a number. */
export type ReservationDraft = z.input<ReturnType<typeof reservationSchema>>;
/** A reservation the rules accepted. */
export type Reservation = z.output<ReturnType<typeof reservationSchema>>;
/** The answer to a reservation: field errors to show like the form's own, or the confirmation to show instead of the default one. */
export type ReservationResult = { errors?: { name?: string; guests?: string }; message?: string };

/** The first message for each field that broke the rules, as a ReservationResult's `errors`. */
export function reservationErrors(error: z.ZodError<ReservationDraft>): NonNullable<ReservationResult['errors']> {
  const { fieldErrors } = z.flattenError(error);
  return {
    ...(fieldErrors.name?.[0] ? { name: fieldErrors.name[0] } : {}),
    ...(fieldErrors.guests?.[0] ? { guests: fieldErrors.guests[0] } : {}),
  };
}
