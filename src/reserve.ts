import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { m } from '@joeblew999/remy-ui/messages';
import type { Reservation, ReservationResult } from '@joeblew999/remy-ui/pages';
import { pageLocale } from './middleware';

/**
 * The server's own check of a reservation. The browser checks the same rules first, but a server
 * function is a public endpoint, so the input is untrusted here: anything that is not a name and
 * a number is a bad request (400); a name that is blank once trimmed, or guests that are not a
 * whole number from 1 to 20, are the visitor's mistakes and are answered as field errors.
 */
function checkReservation(input: Reservation) {
  if (typeof input !== 'object' || input === null || typeof input.name !== 'string' || typeof input.guests !== 'number') {
    setResponseStatus(400);
    throw new Error('A reservation needs a name and a number of guests.');
  }
  const name = input.name.trim();
  const { guests } = input;
  return { name, guests, nameMissing: !name, guestsInvalid: !Number.isInteger(guests) || guests < 1 || guests > 20 };
}

/** Reserves seats in the demo (nothing is stored): the server re-validates and answers in the page's language. */
export const reserve = createServerFn({ method: 'POST' })
  .middleware([pageLocale])
  .validator(checkReservation)
  .handler(({ data, context }): ReservationResult => {
    const o = { locale: context.locale };
    if (data.nameMissing || data.guestsInvalid) return { errors: {
      ...(data.nameMissing ? { name: m.name_required({}, o) } : {}),
      ...(data.guestsInvalid ? { guests: m.guests_invalid({}, o) } : {}),
    } };
    return { message: m.reserved({ name: data.name, count: data.guests }, o) };
  });
