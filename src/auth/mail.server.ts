import { permits } from './environment';
import type { CodeMail } from './options';

/**
 * How a sign-in code leaves the Worker. Local (the environment policy's `captureMail`): written to the
 * local D1's `local_mail` table, which /dev/mail reads back (src/routes/dev.mail.ts); no mail is sent.
 * Everywhere else: mail delivery is not built yet (Cloudflare Email Service needs the production
 * domain, .plans/auth-service.md), so it throws and the person sees an error. Never a fallback code.
 */
/** Whether this environment can deliver a sign-in code at all: today only where it captures them. */
export const canSendCodes = (env: { ENVIRONMENT?: string }) => permits(env.ENVIRONMENT, 'captureMail');

export function codeSender(env: { DB: D1Database; ENVIRONMENT?: string }) {
  return async ({ email, otp, type }: CodeMail) => {
    if (!canSendCodes(env)) throw new Error('Mail delivery is not configured for this environment; no code was sent.');
    await env.DB.prepare('insert into "local_mail" ("recipient", "kind", "code") values (?, ?, ?)').bind(email, type, otp).run();
  };
}
