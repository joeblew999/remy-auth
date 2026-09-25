import { useEffect, useState } from 'react';
import { extractLocaleFromCookie, type Locale } from './paraglide/runtime.js';
import { formatLocale } from './locale-info';
import { preferredFromNavigator } from './matching.js';

// Browser-only pieces for prerendered apps, which learn the visitor's languages after hydration
// so their static HTML never depends on them.

// Read before hydration calls getLocale(), which writes the URL's locale into the cookie.
const rememberedAtLoad = typeof document === 'undefined' ? undefined : extractLocaleFromCookie();

/** A language to offer on a localized page: the browser's language when it differs from the page and the last visited or chosen language is not already this one. */
export function useSuggestedLocale(page: Locale): Locale | undefined {
  const [suggested, setSuggested] = useState<Locale | undefined>(undefined);
  useEffect(() => {
    const browser = preferredFromNavigator();
    setSuggested(browser && browser !== page && rememberedAtLoad !== page ? browser : undefined);
  }, [page]);
  return suggested;
}

/** A moment in the device's own time zone, which only the browser knows; empty until hydration. */
export function DeviceTime({ locale, instant, ...rest }: { locale: Locale; instant: Date } & React.HTMLAttributes<HTMLSpanElement>) {
  const [text, setText] = useState('');
  useEffect(() => { setText(new Intl.DateTimeFormat(formatLocale(locale), { dateStyle: 'full', timeStyle: 'long' }).format(instant)); }, [locale, instant]);
  return <span {...rest}>{text}</span>;
}
