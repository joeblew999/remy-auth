import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { invalidateEverything } from '@joeblew999/remy-ui/invalidate';
import { Alert, AlertDescription } from '@joeblew999/remy-ui/components/alert';
import { Button } from '@joeblew999/remy-ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@joeblew999/remy-ui/components/field';
import { Input } from '@joeblew999/remy-ui/components/input';
import { Badge } from '@joeblew999/remy-ui/components/badge';
import { Separator } from '@joeblew999/remy-ui/components/separator';
import { authClient } from './client';
import type { SeededSignIn } from './people.server';

// Signing in and out on the account page (.plans/auth-service.md, decision 1): an email address, then
// the one-time code Better Auth sends to it. TanStack Form with shadcn's Field components, like the
// demo's form. Afterwards every loader and query runs again, so no page keeps what the last viewer saw.

/** After a sign-in or sign-out: run every loader and query again (the account page's included). */
function useRefresh() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return () => invalidateEverything(router, queryClient);
}

/** The sign-in form: the address, then the six-digit code sent to it. */
export function SignIn({ locale }: { locale: Locale }) {
  const o = { locale };
  const refresh = useRefresh();
  // The address a code was sent to; until then the form asks for the address.
  const [sentTo, setSentTo] = useState<string>();
  const [failure, setFailure] = useState<string>();

  const address = useForm({
    defaultValues: { email: '' },
    validators: { onSubmit: z.object({ email: z.email({ error: m.account_email_invalid({}, o) }) }) },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email: value.email, type: 'sign-in' });
      setFailure(error ? m.account_send_failed({}, o) : undefined);
      if (!error) setSentTo(value.email);
    },
  });
  const code = useForm({
    defaultValues: { otp: '' },
    validators: { onSubmit: z.object({ otp: z.string().regex(/^\d{6}$/, { error: m.account_code_invalid({}, o) }) }) },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.emailOtp({ email: sentTo!, otp: value.otp });
      setFailure(error ? m.account_code_wrong({}, o) : undefined);
      if (!error) await refresh();
    },
  });

  const failed = failure && <Alert variant="destructive"><AlertDescription>{failure}</AlertDescription></Alert>;
  if (!sentTo) return <form noValidate className="flex flex-col gap-6" data-sign-in="address" onSubmit={event => { event.preventDefault(); void address.handleSubmit(); }}>
    <FieldGroup>
      <address.Field name="email" children={field => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
        return <Field data-invalid={isInvalid || undefined}>
          <FieldLabel htmlFor="sign-in-email">{m.account_email_label({}, o)}</FieldLabel>
          <Input id="sign-in-email" name="email" type="email" dir="ltr" autoComplete="email" value={field.state.value} onBlur={field.handleBlur}
            onChange={event => field.handleChange(event.target.value)} aria-invalid={isInvalid || undefined} aria-describedby={isInvalid ? 'sign-in-email-error' : 'sign-in-email-hint'} />
          <FieldDescription id="sign-in-email-hint">{m.account_sign_in_intro({}, o)}</FieldDescription>
          {isInvalid && <FieldError id="sign-in-email-error" errors={field.state.meta.errors} />}
        </Field>;
      }} />
    </FieldGroup>
    {failed}
    <address.Subscribe selector={state => state.isSubmitting} children={busy => <div><Button type="submit" disabled={busy}>{m.account_send_code({}, o)}</Button></div>} />
  </form>;

  return <form noValidate className="flex flex-col gap-6" data-sign-in="code" onSubmit={event => { event.preventDefault(); void code.handleSubmit(); }}>
    <FieldGroup>
      <code.Field name="otp" children={field => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
        return <Field data-invalid={isInvalid || undefined}>
          <FieldLabel htmlFor="sign-in-code">{m.account_code_label({}, o)}</FieldLabel>
          <Input id="sign-in-code" name="otp" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={field.state.value} onBlur={field.handleBlur}
            onChange={event => field.handleChange(event.target.value.trim())} aria-invalid={isInvalid || undefined} aria-describedby={isInvalid ? 'sign-in-code-error' : 'sign-in-code-hint'} />
          <FieldDescription id="sign-in-code-hint">{m.account_code_sent({ email: sentTo }, o)}</FieldDescription>
          {isInvalid && <FieldError id="sign-in-code-error" errors={field.state.meta.errors} />}
        </Field>;
      }} />
    </FieldGroup>
    {failed}
    <code.Subscribe selector={state => state.isSubmitting} children={busy => <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={busy}>{m.account_verify({}, o)}</Button>
      <Button type="button" variant="outline" onClick={() => { setSentTo(undefined); setFailure(undefined); code.reset(); }}>{m.account_other_email({}, o)}</Button>
    </div>} />
  </form>;
}

/**
 * The seeded people this environment offers (never a deployment): each with their role and what they
 * hold, and one press to sign in as them. It is a real sign-in: a code is asked for and redeemed, with
 * the published code the environment fixes for seeded people.
 */
export function SeededPeople({ locale, seeded }: { locale: Locale; seeded: SeededSignIn }) {
  const o = { locale };
  const refresh = useRefresh();
  const [busy, setBusy] = useState<string>();
  const [failed, setFailed] = useState(false);
  const signInAs = async (email: string) => {
    setBusy(email);
    const sent = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    const signedIn = sent.error ? sent : await authClient.signIn.emailOtp({ email, otp: seeded.code });
    setFailed(Boolean(signedIn.error));
    if (!signedIn.error) await refresh();
    setBusy(undefined);
  };
  return <section className="flex flex-col gap-4" data-seeded-people>
    <Separator />
    <div className="flex flex-col gap-1">
      <h2 className="font-medium">{m.account_people_title({}, o)}</h2>
      <p className="text-sm text-muted-foreground">{m.account_people_intro({ code: seeded.code }, o)}</p>
    </div>
    {failed && <Alert variant="destructive"><AlertDescription>{m.account_code_wrong({}, o)}</AlertDescription></Alert>}
    <ul className="flex flex-col gap-3">
      {seeded.people.map(person => <li key={person.email} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3" data-person={person.email}>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2"><span className="font-medium">{person.name}</span><Badge variant={person.role === 'admin' ? 'default' : 'secondary'}>{person.role}</Badge></p>
          <p dir="ltr" className="text-start text-sm text-muted-foreground">{person.email}</p>
          <p dir="ltr" className="text-start text-xs text-muted-foreground" data-person-holds>{person.holds.length ? person.holds.join(' · ') : m.account_people_holds_nothing({}, o)}</p>
        </div>
        <Button variant="outline" disabled={busy !== undefined} onClick={() => void signInAs(person.email)}>{m.account_people_sign_in({ name: person.name }, o)}</Button>
      </li>)}
    </ul>
  </section>;
}

/** The sign-out button. */
export function SignOut({ locale }: { locale: Locale }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  return <Button variant="outline" disabled={busy} onClick={async () => {
    setBusy(true);
    await authClient.signOut();
    await refresh();
    setBusy(false);
  }}>{m.account_sign_out({}, { locale })}</Button>;
}
