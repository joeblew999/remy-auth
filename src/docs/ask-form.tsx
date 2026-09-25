import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { localizeHref } from '@joeblew999/remy-ui/runtime';
import { useEffect, useState } from 'react';
import { Button } from '@joeblew999/remy-ui/components/button';
import { Spinner } from '@joeblew999/remy-ui/components/spinner';
import { Field, FieldDescription, FieldLabel } from '@joeblew999/remy-ui/components/field';
import { Input } from '@joeblew999/remy-ui/components/input';
import { askMaxLength } from '../ask';
import { askPath } from '../paths';

/**
 * The question box: a plain GET form to the site page /docs/ask, so it works without JavaScript
 * (.plans/docs-ai-sync.md, "Ask from the site"). The browser enforces the length; the server checks again.
 * An answer takes a few seconds (AI Search's retrieval, then the model), so once the page has hydrated
 * the button shows shadcn's Spinner while the answer loads; without JavaScript the browser's own
 * loading indicator does.
 */
export function AskForm({ locale, question = '' }: { locale: Locale; question?: string }) {
  const o = { locale };
  const [asking, setAsking] = useState(false);
  // Coming back through the browser's history restores the page as it was: ready to ask again.
  useEffect(() => { const reset = () => setAsking(false); addEventListener('pageshow', reset); return () => removeEventListener('pageshow', reset); }, []);
  return <form method="get" action={localizeHref(askPath, { locale })} role="search" className="flex flex-col gap-2" onSubmit={() => setAsking(true)}>
    <Field>
      <FieldLabel htmlFor="ask-q">{m.ask_label({}, o)}</FieldLabel>
      <div className="flex gap-2">
        <Input id="ask-q" name="q" type="search" dir="auto" required maxLength={askMaxLength} defaultValue={question} aria-describedby="ask-q-hint" />
        <Button type="submit" disabled={asking} data-asking={asking || undefined}>{asking ? <><Spinner />{m.ask_pending({}, o)}</> : m.ask_submit({}, o)}</Button>
      </div>
      <FieldDescription id="ask-q-hint">{m.ask_hint({ max: askMaxLength }, o)}</FieldDescription>
    </Field>
  </form>;
}
