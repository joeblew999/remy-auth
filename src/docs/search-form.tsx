import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { localizeHref } from '@joeblew999/remy-ui/runtime';
import { Button } from '@joeblew999/remy-ui/components/button';
import { Field, FieldLabel } from '@joeblew999/remy-ui/components/field';
import { Input } from '@joeblew999/remy-ui/components/input';
import { searchMaxLength } from './search';

/**
 * The docs search box: a plain GET form to /docs/search, so it works without JavaScript. The
 * landmark is the <search> element, so the question box's form keeps role="search" to itself.
 */
export function SearchForm({ locale, query = '' }: { locale: Locale; query?: string }) {
  const o = { locale };
  return <search>
    <form method="get" action={localizeHref('/docs/search', { locale })} data-docs-search className="flex flex-col gap-2">
      <Field>
        <FieldLabel htmlFor="docs-search-q">{m.search_label({}, o)}</FieldLabel>
        <div className="flex gap-2">
          <Input id="docs-search-q" name="q" type="search" dir="auto" required maxLength={searchMaxLength} defaultValue={query} />
          <Button type="submit">{m.search_submit({}, o)}</Button>
        </div>
      </Field>
    </form>
  </search>;
}
