import { getLocale } from '@joeblew999/remy-ui/locale';
import { mailerFor } from '@joeblew999/remy-ui/mail';
import { codeMail } from './code-mail';
import { permits } from './environment';
import { product } from '../product';
import type { CodeMail } from './options';

type MailEnv = { ENVIRONMENT?: string; EMAIL?: SendEmail; EMAIL_FROM?: string };

/** This environment's mailer: the outbox where mail is captured, Cloudflare Email Service everywhere else. */
export const mailer = (env: MailEnv) => mailerFor({ capture: permits(env, 'capturesMail'), binding: env.EMAIL, from: env.EMAIL_FROM });

/** Whether this environment can deliver a sign-in code at all: it captures mail, or has a binding and a sender to send it. */
export const canSendCodes = (env: MailEnv) => permits(env, 'capturesMail') || Boolean(env.EMAIL && env.EMAIL_FROM);

/**
 * How a sign-in code leaves the Worker: one email, in the language of the request that asked for it
 * (Paraglide's, from Accept-Language; the page's own language when the sign-in form asks). A failed
 * delivery throws, so the person sees an error. Never a fallback code.
 */
export function codeSender(env: MailEnv) {
  return ({ email, otp }: CodeMail) => mailer(env).send({ to: email, ...codeMail({ otp, product }, getLocale()) });
}
