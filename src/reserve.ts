import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { m } from '@joeblew999/remy-ui/messages';
import { reservationErrors, reservationInput, reservationSchema, type ReservationResult } from '@joeblew999/remy-ui/reservation';
import { pageLocale } from './middleware';

/**
 * A server function is a public endpoint, so its input is untrusted: anything that is not a name
 * and a number is a bad request (400). Whether they keep the rules is checked in the handler,
 * which knows the page's language.
 */
function checkShape(input: unknown) {
  const shape = reservationInput.safeParse(input);
  if (shape.success) return shape.data;
  setResponseStatus(400);
  throw new Error('A reservation needs a name and a number of guests.');
}

/**
 * Reserves seats in the demo (nothing is stored). The server checks the same Zod schema as the
 * browser's form and answers in the page's language: broken rules come back as field errors,
 * which the form shows like its own.
 */
export const reserve = createServerFn({ method: 'POST' })
  .middleware([pageLocale])
  .validator(checkShape)
  .handler(({ data, context }): ReservationResult => {
    const checked = reservationSchema(context.locale).safeParse(data);
    if (!checked.success) return { errors: reservationErrors(checked.error) };
    return { message: m.reserved({ name: checked.data.name, count: checked.data.guests }, { locale: context.locale }) };
  });
