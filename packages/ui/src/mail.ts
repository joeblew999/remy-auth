// Outbound mail for a Remy app (remy-sport's src/mail/mailer.ts, for every app): Cloudflare Email
// Service through the Worker's `send_email` binding, or, where the app's environment table says mail
// is captured, an outbox the Worker keeps instead of sending. A mail always has a plain-text part.

/** One message. `html` is optional; `text` never is: some clients show only it, and it helps delivery. */
export type Mail = { to: string; subject: string; text: string; html?: string; headers?: Record<string, string> };

/** A captured message: what a deployment would have put on the wire. */
export type CapturedMail = Mail & { id: string; from: string; createdAt: string };

export type Mailer = { send(mail: Mail): Promise<void> };

/** The part of Cloudflare's `send_email` binding a mailer uses (the generated `SendEmail` type fits it). */
export type EmailBinding = { send(message: { to: string; from: string; subject: string; text: string; html?: string; headers?: Record<string, string> }): Promise<unknown> };

/**
 * Captured mail is held in the isolate, not in a database: it is local state that should end with
 * the dev server, and a table for it would ship, always empty, to production. Safe because only the
 * local environment captures, and a local Worker is one long-lived isolate.
 */
const OUTBOX = '__remy_mail_outbox__';
const outbox = (): CapturedMail[] => ((globalThis as { [OUTBOX]?: CapturedMail[] })[OUTBOX] ??= []);

/** The captured mail, newest first; only the mail to one address when `to` is given. */
export function readOutbox(to?: string): CapturedMail[] {
  const wanted = to?.toLowerCase();
  return outbox().filter(mail => !wanted || mail.to.toLowerCase() === wanted).reverse();
}

export function clearOutbox(): void {
  outbox().length = 0;
}

/**
 * The mailer for this environment. `capture: true` keeps each message in the outbox (`readOutbox`)
 * and sends nothing. Otherwise the message goes out through `binding`, from `from` (an address on a
 * domain enabled for Email Sending); a missing binding or sender is an error, never a silent drop,
 * and a refusal says who it was for and why, because whoever called `send` may log only a stack.
 */
export function mailerFor({ capture, binding, from }: { capture: boolean; binding?: EmailBinding; from?: string }): Mailer {
  return {
    async send(mail) {
      if (capture) {
        outbox().push({ ...mail, id: crypto.randomUUID(), from: from ?? '', createdAt: new Date().toISOString() });
        return;
      }
      if (!binding || !from) throw new Error(`mail: not configured (${binding ? 'no sender address' : 'no send_email binding'}); nothing was sent to ${mail.to}`);
      try {
        await binding.send({ to: mail.to, from, subject: mail.subject, text: mail.text, ...(mail.html ? { html: mail.html } : {}), ...(mail.headers ? { headers: mail.headers } : {}) });
      } catch (cause) {
        const code = (cause as { code?: string } | null)?.code;
        throw new Error(`mail: ${from} to ${mail.to} was refused${code ? ` (${code})` : ''}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
      }
    },
  };
}
