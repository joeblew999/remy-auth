import { direction, type Locale } from '@joeblew999/remy-ui/locale';
import type { Mail } from '@joeblew999/remy-ui/mail';
import { m } from '@joeblew999/remy-ui/messages';

// The sign-in code's email, in the reader's language. The code is the headline, large and spaced so a
// phone's mail app and a person both find it at once. There is no link, on purpose: a code somebody
// retypes cannot be forwarded as a one-click way in. Every word is a catalog message; the styles are
// inline because mail clients ignore stylesheets.

const escape = (text: string) => text.replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]!);
const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** The mail carrying `otp` for signing in to `product`, written in `locale`: subject, plain text and HTML. */
export function codeMail({ otp, product }: { otp: string; product: string }, locale: Locale): Omit<Mail, 'to'> {
  const o = { locale };
  const subject = m.email_code_subject({ code: otp, product }, o);
  const lines = [m.email_code_intro({ product }, o), m.email_code_expiry({}, o), m.email_code_ignore({}, o)];
  const html = `<!doctype html><html lang="${locale}" dir="${direction(locale)}"><head><meta charset="utf-8"><title>${escape(subject)}</title></head>`
    + `<body style="margin:0;padding:24px 0;background-color:#f4f4f5;font-family:${font}">`
    + `<div style="margin:0 auto;max-width:480px;padding:32px 28px;border-radius:12px;background-color:#ffffff">`
    + `<p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:24px">${escape(lines[0]!)}</p>`
    + `<h1 dir="ltr" style="margin:0 0 24px;color:#18181b;font-size:36px;font-weight:700;letter-spacing:0.2em;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${escape(otp)}</h1>`
    + lines.slice(1).map(line => `<p style="margin:0 0 16px;color:#71717a;font-size:14px;line-height:22px">${escape(line)}</p>`).join('')
    + `</div></body></html>`;
  return { subject, text: [lines[0], otp, ...lines.slice(1)].join('\n\n'), html };
}
