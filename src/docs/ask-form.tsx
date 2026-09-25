import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { localizeHref } from '@joeblew999/remy-ui/runtime';
import { Button } from '@joeblew999/remy-ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@joeblew999/remy-ui/components/field';
import { Input } from '@joeblew999/remy-ui/components/input';
import { askMaxLength } from '../ask';

/**
 * The question box: a plain GET form to the app page /app/ask, so it works without JavaScript
 * (.plans/docs-site.md, decision 5). The browser enforces the length; the server checks again.
 */
export function AskForm({ locale, question = '' }: { locale: Locale; question?: string }) {
  const o = { locale };
  return <form method="get" action={localizeHref('/app/ask', { locale })} role="search" className="flex flex-col gap-2">
    <Field>
      <FieldLabel htmlFor="ask-q">{m.ask_label({}, o)}</FieldLabel>
      <div className="flex gap-2">
        <Input id="ask-q" name="q" type="search" dir="auto" required maxLength={askMaxLength} defaultValue={question} aria-describedby="ask-q-hint" />
        <Button type="submit">{m.ask_submit({}, o)}</Button>
      </div>
      <FieldDescription id="ask-q-hint">{m.ask_hint({ max: askMaxLength }, o)}</FieldDescription>
    </Field>
  </form>;
}
