import { useNavigate } from '@tanstack/react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { localizeHref } from '@joeblew999/remy-ui/runtime';
import { Button } from '@joeblew999/remy-ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@joeblew999/remy-ui/components/field';
import { Input } from '@joeblew999/remy-ui/components/input';
import { askMaxLength } from '../ask';
import { askPath } from '../paths';

/**
 * The question box: a plain GET form to the site page /docs/ask, so it works without JavaScript
 * (.plans/docs-ai-sync.md, "Ask from the site"). The browser enforces the length; the server checks again.
 * Once the page has hydrated, asking navigates inside the app (TanStack Router), so the ask page shows
 * the docs search's hits at once and the answer when it comes; without JavaScript it is a page load.
 */
export function AskForm({ locale, question = '' }: { locale: Locale; question?: string }) {
  const o = { locale };
  const navigate = useNavigate();
  return <form method="get" action={localizeHref(askPath, { locale })} role="search" className="flex flex-col gap-2" onSubmit={event => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') ?? '');
    navigate({ to: '/docs/ask', search: { q } });
  }}>
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
